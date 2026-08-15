@echo off
echo ==================================================
echo Lancement de l'ecosysteme Onbora
echo ==================================================

echo 1. Demarrage du Core AI Server (Port 3001)...
start "Onbora - Core AI" cmd /k "cd /d %~dp0mock-ai-server && node server.js"

echo 2. Demarrage du Back-end Django (Port 8000)...
start "Onbora - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe manage.py runserver"

echo 3. Demarrage du Front-end Next.js (Port 3000)...
start "Onbora - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo --------------------------------------------------
echo Tous les services sont en cours d'execution :
echo   - Front-end : http://localhost:3000
echo   - Back-end  : http://localhost:8000
echo   - Core AI   : http://localhost:3001
echo --------------------------------------------------
