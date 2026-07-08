@echo off
REM CampusPulse - one-command launcher (Windows cmd / PowerShell).
REM   run.bat         -> seed (if needed) + start server
REM   run.bat reset   -> wipe DB, reseed, start server
setlocal
cd /d "%~dp0"

REM Fix the "WindowsApps stub" problem — use the real Python install.
set "PYTHON=C:\Users\sanja\AppData\Local\Python\pythoncore-3.14-64\python.exe"
set "PATH=C:\Users\sanja\AppData\Local\Python\bin;%PATH%"

%PYTHON% -m pip install -q -r requirements.txt

if /I "%1"=="reset" del /q "backend\data\db.json" 2>nul

if not exist "backend\data\db.json" (
  echo Seeding database...
  pushd backend
  %PYTHON% seed.py
  popd
)

echo Starting CampusPulse on http://localhost:5001
%PYTHON% backend\app.py
endlocal
