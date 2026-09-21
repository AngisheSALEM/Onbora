#!/usr/bin/env bash

# Script de lancement des services locaux Onbora (Backend, Frontend, Core AI)

echo "=================================================="
echo "🚀 Lancement de l'écosystème Onbora"
echo "=================================================="

# Déterminer la commande python (venv local si présent, sinon python)
if [ -f "backend/venv/Scripts/python.exe" ]; then
    PYTHON_CMD="backend/venv/Scripts/python.exe"
elif [ -f "backend/venv/bin/python" ]; then
    PYTHON_CMD="backend/venv/bin/python"
else
    PYTHON_CMD="python"
fi

echo "1. Démarrage du Back-end Django (Port 8000 sur 0.0.0.0)..."
(cd backend && ../$PYTHON_CMD manage.py runserver 0.0.0.0:8000) &
PID_BACK=$!

echo "2. Démarrage du Front-end Next.js (Port 3000 sur 0.0.0.0)..."
(cd frontend && npx next dev -H 0.0.0.0 -p 3000) &
PID_FRONT=$!

echo "--------------------------------------------------"
echo "✅ Tous les services ont été démarrés :"
echo "   - Front-end : http://localhost:3000"
echo "   - Back-end  : http://localhost:8000"
echo "--------------------------------------------------"
echo "Appuyez sur Ctrl+C pour tout arrêter."

trap "kill $PID_BACK $PID_FRONT 2>/dev/null" EXIT INT TERM
wait
