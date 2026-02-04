@echo off
echo ========================================
echo Starting Curie Backend Server...
echo ========================================
cd /d "%~dp0"
python -m pip install pyotp
echo.
echo Starting FastAPI server...
python main.py
pause
