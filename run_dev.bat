@echo off
echo Starting Dataset Management Platform...

start "Backend" cmd /k "cd backend && call venv\Scripts\activate && pip install -r requirements.txt && python app.py"

start "Frontend" cmd /k "cd frontend && if not exist node_modules (npm install) && npm run dev"

echo Services started in separate windows.
