@echo off
echo ========================================
echo Starting Curie Backend Server...
echo ========================================
cd /d "%~dp0"
python -m pip install pyotp
echo.
echo Starting FastAPI server...
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
