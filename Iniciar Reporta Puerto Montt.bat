@echo off
cd /d "%~dp0"
start "Reporta Puerto Montt" cmd /k "npm run start"
timeout /t 2 /nobreak >nul
start "" http://localhost:3001
