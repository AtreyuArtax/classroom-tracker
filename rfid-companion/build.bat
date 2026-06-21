@echo off
REM ============================================================
REM build.bat — Local PyInstaller Build Script
REM
REM Run this on a Windows machine to produce rfid_app.exe.
REM Requires Python 3.9+ and pip installed.
REM
REM Usage:
REM   build.bat
REM
REM Output: dist\rfid_app.exe  (single self-contained executable)
REM ============================================================

echo [rfid-companion] Installing dependencies...
pip install -r requirements.txt

echo.
echo [rfid-companion] Installing PyInstaller...
pip install pyinstaller

echo.
echo [rfid-companion] Building rfid_app.exe...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name rfid_app ^
  --add-data "config.json;." ^
  rfid_app.py

echo.
if exist dist\rfid_app.exe (
  echo [rfid-companion] SUCCESS: dist\rfid_app.exe built.
  echo.
  echo Copy dist\rfid_app.exe and config.json to the school machine.
  echo Edit config.json to set the correct port or device ID, then run rfid_app.exe.
) else (
  echo [rfid-companion] ERROR: Build failed. Check output above.
)

pause
