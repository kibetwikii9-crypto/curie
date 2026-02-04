@echo off
echo ========================================
echo Starting Curie Frontend Server...
echo ========================================
cd /d "%~dp0\frontend"
npm run dev
pause
