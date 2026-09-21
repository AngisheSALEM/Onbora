@echo off
echo ==================================================
echo Lancement de l'ecosysteme Onbora
echo ==================================================

echo 1. Demarrage du Back-end Django (Port 8000 sur 0.0.0.0)...
start "Onbora - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"

echo 2. Demarrage du Front-end Next.js (Port 3000 sur 0.0.0.0)...
start "Onbora - Frontend" cmd /k "cd /d %~dp0frontend && npx next dev -H 0.0.0.0 -p 3000"

echo --------------------------------------------------
echo Services Onbora en cours d'execution :
echo   - Front-end : http://localhost:3000 ou http://10.195.185.137:3000
echo   - Back-end  : http://localhost:8000 ou http://10.195.185.137:8000
echo   - Mobile IP : http://10.195.185.137:8000
echo --------------------------------------------------
