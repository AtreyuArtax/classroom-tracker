"""
find_rfid.py — RFID Scanner Diagnostic Utility
===============================================
Run this script ONCE to discover your scanner's configuration values.
It will list available COM ports and, in keyboard mode, print the hardware
ID of any keyboard device that sends a rapid burst (i.e., a card scan).

Usage:
  python find_rfid.py

Output will tell you exactly what to paste into config.json.

Requirements: pyserial, pynput (pip install pyserial pynput)
"""

import sys
import time
import threading


# ─────────────────────────────────────────────
# Part 1: List Available Serial / COM Ports
# ─────────────────────────────────────────────

def list_serial_ports():
    """Print all available serial ports on this machine."""
    try:
        import serial.tools.list_ports
        ports = list(serial.tools.list_ports.comports())
        if not ports:
            print("  [Serial] No COM ports found.")
        else:
            print(f"  [Serial] Found {len(ports)} port(s):\n")
            for p in ports:
                print(f"    Port:        {p.device}")
                print(f"    Description: {p.description}")
                print(f"    Hardware ID: {p.hwid}\n")
    except ImportError:
        print("  [Serial] pyserial not installed. Run: pip install pyserial")


# ─────────────────────────────────────────────
# Part 2: Keyboard-Wedge Device Sniffer
# ─────────────────────────────────────────────

def sniff_keyboard_device():
    """
    Listen for rapid keyboard bursts using pynput.
    When a burst of ≥6 characters arrives within 80ms gaps, print it.

    NOTE: This does NOT identify the hardware device path natively via pynput.
    To get the full VID/PID path, use the Windows Raw Input API approach shown
    in the note below. This sniffer confirms the timing pattern of your scanner.
    """
    try:
        from pynput import keyboard as kb
    except ImportError:
        print("  [Keyboard] pynput not installed. Run: pip install pynput")
        return

    print("  [Keyboard] Listening for scanner bursts. Scan a card now...")
    print("  [Keyboard] Press Ctrl+C to stop.\n")

    buffer = []
    last_time = [0.0]
    MIN_CHARS = 6
    MAX_GAP_MS = 80

    def on_press(key):
        now = time.time() * 1000  # ms
        gap = now - last_time[0]

        try:
            ch = key.char
        except AttributeError:
            # Enter key — check if this looks like a scan
            if key == kb.Key.enter and len(buffer) >= MIN_CHARS:
                scan = ''.join(buffer)
                print(f"\n  ✅ SCAN DETECTED: {scan}")
                print(f"     Length: {len(scan)} characters")
                print(f"\n  → Paste this value into config.json → keyboard → target_device_id")
                print(f"    (You will get the precise VID/PID from Device Manager or find_rfid_advanced)")
                buffer.clear()
            else:
                buffer.clear()
            last_time[0] = now
            return

        if gap < MAX_GAP_MS or len(buffer) == 0:
            buffer.append(ch)
        else:
            buffer.clear()
            buffer.append(ch)

        last_time[0] = now

    with kb.Listener(on_press=on_press) as listener:
        try:
            listener.join()
        except KeyboardInterrupt:
            pass


# ─────────────────────────────────────────────
# Part 3: Windows Raw Input Device Lister
# ─────────────────────────────────────────────

def list_raw_input_devices():
    """
    On Windows, use ctypes to enumerate Raw Input devices and print keyboard paths.
    These paths contain the VID/PID strings needed for config.json keyboard mode.
    """
    if sys.platform != "win32":
        print("  [RawInput] Windows only. Skipping on this platform.")
        return

    import ctypes
    import ctypes.wintypes as wt

    RIDI_DEVICENAME = 0x20000007

    class RAWINPUTDEVICELIST(ctypes.Structure):
        _fields_ = [("hDevice", wt.HANDLE), ("dwType", wt.DWORD)]

    RIM_TYPEKEYBOARD = 1

    try:
        num_devices = wt.UINT(0)
        ctypes.windll.user32.GetRawInputDeviceList(
            None, ctypes.byref(num_devices), ctypes.sizeof(RAWINPUTDEVICELIST)
        )

        if num_devices.value == 0:
            print("  [RawInput] No raw input devices found.")
            return

        buf = (RAWINPUTDEVICELIST * num_devices.value)()
        ctypes.windll.user32.GetRawInputDeviceList(
            buf, ctypes.byref(num_devices), ctypes.sizeof(RAWINPUTDEVICELIST)
        )

        print(f"  [RawInput] Found {num_devices.value} raw input device(s). Keyboards:\n")
        for dev in buf:
            if dev.dwType != RIM_TYPEKEYBOARD:
                continue
            size = wt.UINT(0)
            ctypes.windll.user32.GetRawInputDeviceInfoW(
                dev.hDevice, RIDI_DEVICENAME, None, ctypes.byref(size)
            )
            name_buf = ctypes.create_unicode_buffer(size.value)
            ctypes.windll.user32.GetRawInputDeviceInfoW(
                dev.hDevice, RIDI_DEVICENAME, name_buf, ctypes.byref(size)
            )
            path = name_buf.value
            print(f"    Device path: {path}")
            # Extract VID/PID for easy identification
            if "VID_" in path.upper():
                parts = path.upper().split("\\")
                for p in parts:
                    if "VID_" in p:
                        print(f"    Hardware ID: {p}")
            print()

        print("  → Copy the full device path (or VID_xxxx&PID_xxxx portion) into")
        print("    config.json → keyboard → target_device_id")

    except Exception as e:
        print(f"  [RawInput] Error: {e}")


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  RFID Companion — find_rfid.py Diagnostic Tool")
    print("=" * 60)
    print()

    print("[ STEP 1 ] Listing Serial / COM Ports")
    print("-" * 40)
    list_serial_ports()
    print()

    print("[ STEP 2 ] Listing Keyboard Devices (Windows Raw Input)")
    print("-" * 40)
    list_raw_input_devices()
    print()

    print("[ STEP 3 ] Keyboard Burst Sniffer (confirm scanner timing)")
    print("-" * 40)
    sniff_keyboard_device()
