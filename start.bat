@echo off
setlocal
cd /d "%~dp0"
echo Starting project...
echo Checking Node.js environment...
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found in PATH.
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo node_modules not found. Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)
set "APP_PORT=49152"
set "PORT=%APP_PORT%"
echo Checking port %APP_PORT%...
set "PORT_IN_USE="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":%APP_PORT% .*LISTENING"') do (
  set "PORT_IN_USE=1"
  echo Port %APP_PORT% is in use by PID %%P. Closing it...
  taskkill /PID %%P /F >nul 2>nul
)

if defined PORT_IN_USE (
  timeout /t 1 /nobreak >nul
  netstat -ano | findstr /r /c:":%APP_PORT% .*LISTENING" >nul 2>nul
  if not errorlevel 1 (
    echo Port %APP_PORT% is still in use. Please close it manually and run this launcher again.
    pause
    exit /b 1
  )
  echo Port %APP_PORT% has been released.
) else (
  echo Port %APP_PORT% is available.
)
set "OPEN_BROWSER=true"
echo Running: call npm.cmd run dev
call npm.cmd run dev
endlocal
