"""
rfid_app.py — RFID Companion App for Classroom Tracker
=======================================================
A lightweight Windows system tray app that:
  1. Reads RFID scans from a USB scanner (Serial/COM mode OR Keyboard-Wedge mode)
  2. Exposes the most recent scan over a private HTTP loopback server
     at http://127.0.0.1:5000
  3. The classroom-tracker web app polls this endpoint every 500ms

Configuration is read from config.json in the same directory as this script.
Run find_rfid.py first to discover your scanner's port or hardware ID.

Usage:
  python rfid_app.py          # Run in tray
  python rfid_app.py --debug  # Run with console output visible
"""

import json
import os
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


# ─────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────

DEBUG = "--debug" in sys.argv

# The pending scan queue. Holds at most one scan at a time.
# The web app polls /scan and atomically consumes it.
_pending_scan = None
_scan_lock = threading.Lock()

# Track whether the reader thread is running
_reader_running = threading.Event()
_reader_running.set()


def log(msg):
    if DEBUG:
        print(f"[rfid_app] {msg}")


# ─────────────────────────────────────────────
# Config Loading
# ─────────────────────────────────────────────

def load_config():
    """Load config.json from the same directory as this script."""
    config_path = Path(__file__).parent / "config.json"
    if not config_path.exists():
        raise FileNotFoundError(
            f"config.json not found at {config_path}. "
            "Copy it from the rfid-companion directory."
        )
    with open(config_path, "r") as f:
        raw = f.read()

    # Strip comment keys before parsing (keys starting with _)
    data = json.loads(raw)
    return data


# ─────────────────────────────────────────────
# Scan Storage
# ─────────────────────────────────────────────

def store_scan(tag: str):
    """Store a new scan, overwriting any un-consumed previous scan."""
    global _pending_scan
    tag = tag.strip()
    if not tag:
        return
    with _scan_lock:
        _pending_scan = tag
    log(f"Scan stored: {tag!r}")
    if TRAY_ICON_AVAILABLE:
        notify(f"Scan: {tag}")


def consume_scan():
    """Return the pending scan and clear it. Returns None if none pending."""
    global _pending_scan
    with _scan_lock:
        scan = _pending_scan
        _pending_scan = None
    return scan


# ─────────────────────────────────────────────
# HTTP Loopback Server
# ─────────────────────────────────────────────

class RFIDHandler(BaseHTTPRequestHandler):
    """
    Endpoints:
      GET /scan    → { "status": "idle" } or { "status": "scanned", "tag": "ABCDEF123456" }
      GET /health  → { "status": "ok", "mode": "<mode>" }
      OPTIONS *    → CORS preflight response
    """

    def log_message(self, format, *args):
        # Suppress default access log noise unless in debug mode
        if DEBUG:
            super().log_message(format, *args)

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == "/scan":
            scan = consume_scan()
            if scan:
                body = json.dumps({"status": "scanned", "tag": scan}).encode()
            else:
                body = b'{"status":"idle"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(body)

        elif self.path == "/health":
            body = json.dumps({
                "status": "ok",
                "mode": _active_mode,
                "version": "1.0.0"
            }).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(body)

        else:
            self.send_response(404)
            self.end_headers()


def start_http_server(host, port):
    """Start the loopback HTTP server in its own daemon thread."""
    server = HTTPServer((host, port), RFIDHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    log(f"HTTP server listening on http://{host}:{port}")
    return server


# ─────────────────────────────────────────────
# Serial Mode Reader
# ─────────────────────────────────────────────

def serial_reader(port, baud_rate, terminator):
    """
    Continuously read lines from a serial COM port.
    Each line terminated by `terminator` is treated as one RFID scan.
    """
    try:
        import serial
    except ImportError:
        log("ERROR: pyserial not installed. Run: pip install pyserial")
        return

    log(f"Serial reader starting: port={port}, baud={baud_rate}")
    term_byte = terminator.encode() if isinstance(terminator, str) else terminator

    while _reader_running.is_set():
        try:
            with serial.Serial(port, baud_rate, timeout=1) as ser:
                log(f"Serial port {port} opened.")
                buf = b""
                while _reader_running.is_set():
                    byte = ser.read(1)
                    if not byte:
                        continue  # Timeout — keep looping
                    if byte in (b"\r", b"\n", term_byte):
                        if buf:
                            store_scan(buf.decode("ascii", errors="replace"))
                            buf = b""
                    else:
                        buf += byte
        except Exception as e:
            log(f"Serial error: {e}. Retrying in 3s...")
            time.sleep(3)


# ─────────────────────────────────────────────
# Keyboard-Wedge Interception Mode
# ─────────────────────────────────────────────

def keyboard_reader(target_device_id, min_chars, max_gap_ms):
    """
    Use pynput to listen globally for keyboard bursts.
    When a burst of ≥ min_chars characters arrives within max_gap_ms gaps
    and terminates with Enter, the buffer is stored as a scan.

    Note: pynput does not expose per-device filtering natively.
    The timing heuristic (burst speed) is the primary filter here.
    For per-device blocking, the Interception driver approach is needed
    but requires driver installation — not implemented in this lightweight build.
    """
    try:
        from pynput import keyboard as kb
    except ImportError:
        log("ERROR: pynput not installed. Run: pip install pynput")
        return

    log(f"Keyboard-wedge reader starting. target_device_id={target_device_id!r}")
    log(f"  min_chars={min_chars}, max_gap_ms={max_gap_ms}")
    log("  NOTE: In keyboard mode, scans are detected by timing heuristics.")
    log("  Characters will still reach other windows. Use Serial mode to prevent that.")

    buffer = []
    last_time = [0.0]

    def on_press(key):
        now = time.time() * 1000  # milliseconds
        gap = now - last_time[0]

        if key == kb.Key.enter:
            if len(buffer) >= min_chars:
                store_scan("".join(buffer))
            buffer.clear()
            last_time[0] = now
            return

        try:
            ch = key.char
            if ch is None:
                return
        except AttributeError:
            # Non-printable key (shift, ctrl, etc.) — ignore
            buffer.clear()
            return

        if gap < max_gap_ms or len(buffer) == 0:
            buffer.append(ch)
        else:
            # Gap too large — treat as manual typing, start fresh
            buffer.clear()
            buffer.append(ch)

        last_time[0] = now

    # Run the listener (blocking). It runs on its own thread via pynput internals.
    with kb.Listener(on_press=on_press) as listener:
        while _reader_running.is_set():
            time.sleep(0.5)
        listener.stop()


# ─────────────────────────────────────────────
# System Tray
# ─────────────────────────────────────────────

TRAY_ICON_AVAILABLE = False
_tray_icon = None


def _create_tray_icon_image():
    """Create a minimal 64×64 tray icon using Pillow."""
    from PIL import Image, ImageDraw
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Blue circle background
    draw.ellipse([4, 4, 60, 60], fill=(70, 99, 172, 255))
    # Simple "R" mark
    draw.rectangle([20, 18, 26, 46], fill=(255, 255, 255, 255))
    draw.rectangle([20, 18, 38, 24], fill=(255, 255, 255, 255))
    draw.rectangle([20, 30, 38, 36], fill=(255, 255, 255, 255))
    draw.polygon([(38, 36), (44, 46), (38, 46)], fill=(255, 255, 255, 255))
    return img


def notify(message):
    """Show a tray balloon notification if supported."""
    global _tray_icon
    if _tray_icon and hasattr(_tray_icon, "notify"):
        try:
            _tray_icon.notify(message, "RFID Companion")
        except Exception:
            pass


def start_tray(config):
    """Start the pystray system tray icon. Blocks until the user exits."""
    global TRAY_ICON_AVAILABLE, _tray_icon

    try:
        import pystray
        from PIL import Image
        TRAY_ICON_AVAILABLE = True
    except ImportError:
        log("pystray/Pillow not available. Running headless (no tray icon).")
        # Keep running in headless mode — the HTTP server still works
        try:
            while True:
                time.sleep(60)
        except KeyboardInterrupt:
            pass
        return

    def on_exit(icon, item):
        _reader_running.clear()
        icon.stop()

    def on_open_status(icon, item):
        import webbrowser
        host = config["server"]["host"]
        port = config["server"]["port"]
        webbrowser.open(f"http://{host}:{port}/health")

    menu = pystray.Menu(
        pystray.MenuItem("RFID Companion — Running", None, enabled=False),
        pystray.MenuItem(f"Mode: {config['mode'].upper()}", None, enabled=False),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Open Status Page", on_open_status),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem("Exit", on_exit),
    )

    icon_image = _create_tray_icon_image()
    _tray_icon = pystray.Icon(
        "rfid_companion",
        icon_image,
        "RFID Companion",
        menu=menu
    )

    log("System tray icon started.")
    _tray_icon.run()  # Blocking — runs the tray event loop


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

_active_mode = "unknown"


def main():
    global _active_mode

    try:
        config = load_config()
    except FileNotFoundError as e:
        print(f"FATAL: {e}")
        sys.exit(1)

    mode = config.get("mode", "serial")
    _active_mode = mode
    server_cfg = config.get("server", {})
    host = server_cfg.get("host", "127.0.0.1")
    port = server_cfg.get("port", 5000)

    log(f"Starting RFID Companion App — mode={mode}, server=http://{host}:{port}")

    # Start HTTP server
    start_http_server(host, port)

    # Start appropriate reader in a background daemon thread
    if mode == "serial":
        serial_cfg = config.get("serial", {})
        reader_thread = threading.Thread(
            target=serial_reader,
            args=(
                serial_cfg.get("port", "COM3"),
                serial_cfg.get("baud_rate", 9600),
                serial_cfg.get("terminator", "\r"),
            ),
            daemon=True,
        )
        reader_thread.start()

    elif mode == "keyboard":
        kb_cfg = config.get("keyboard", {})
        reader_thread = threading.Thread(
            target=keyboard_reader,
            args=(
                kb_cfg.get("target_device_id", "PLACEHOLDER_ID"),
                kb_cfg.get("min_chars", 6),
                kb_cfg.get("max_gap_ms", 80),
            ),
            daemon=True,
        )
        reader_thread.start()

    else:
        log(f"WARNING: Unknown mode '{mode}'. No reader started. HTTP server still running.")

    # Start tray (blocks until user exits)
    start_tray(config)

    log("Shutting down.")
    _reader_running.clear()


if __name__ == "__main__":
    main()
