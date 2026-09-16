@echo off
echo ==================================================
echo Lancement de l'ecosysteme Onbora (Core AI Native)
echo ==================================================

rem Activation du venv Python local
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    call "%~dp0backend\venv\Scripts\activate.bat"
) else if exist "%~dp0.venv\Scripts\activate.bat" (
    call "%~dp0.venv\Scripts\activate.bat"
)

echo [1/2] Demarrage du Backend Django (Port 8000)...
start /B cmd /c "cd /d %~dp0backend && python manage.py runserver 0.0.0.0:8000"

echo [2/2] Demarrage du Frontend Next.js (Port 3000)...
start /B cmd /c "cd /d %~dp0frontend && npx next dev -H 0.0.0.0 -p 3000"

echo --------------------------------------------------
echo Tous les services sont en cours d'execution dans cette fenetre :
echo   - Frontend Next.js : http://localhost:3000 (LAN: http://10.195.185.137:3000)
echo   - Backend Django   : http://localhost:8000 (LAN: http://10.195.185.137:8000)
echo --------------------------------------------------
echo Appuyez sur Ctrl+C ou fermez cette fenetre pour tout arreter.
pause > nul
