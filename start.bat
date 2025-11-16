@echo off
REM start.bat - Launch backend and frontend in separate cmd windows (Windows, cmd.exe)

REM Ensure script runs from repo root (where this batch file lives)
cd /d "%~dp0"

REM ---------- Backend (Python/FastAPI) ----------
REM If a virtual environment exists at venv, activate it for the backend window.
if exist "%~dp0venv\Scripts\activate.bat" (
  start "Backend" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && echo Starting backend on http://127.0.0.1:8000... && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
) else (
  start "Backend" cmd /k "cd /d %~dp0 && echo Starting backend on http://127.0.0.1:8000... && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
)

REM ---------- Frontend (Vite) ----------
REM Run the frontend using the npm "dev" script (package.json uses "dev": "vite").
start "Frontend" cmd /k "cd /d %~dp0frontend && echo Starting frontend (Vite) on http://localhost:5173... && npm run dev"

REM Optionally open the browser to the frontend URL. Uncomment the next line if you want this.
REM start "" "http://localhost:5173"

echo Launched backend and frontend in separate windows.
exit /b 0
