@echo off
title ADT Studio Launcher
echo ============================================
echo   ADT Studio - Update and Start
echo ============================================
echo.

REM ---- Prerequisites check ----

where git >nul 2>nul
if errorlevel 1 (
    echo ERROR: Git is not installed or not in your PATH.
    echo.
    echo Please download and install Git from:
    echo   https://git-scm.com/download/win
    echo.
    echo After installing, restart this script.
    echo.
    pause
    exit /b 1
)

where docker >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in your PATH.
    echo.
    echo Please download and install Docker Desktop from:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo After installing, restart your computer and run this script again.
    echo.
    pause
    exit /b 1
)

docker info >nul 2>nul
if errorlevel 1 (
    echo ERROR: Docker is installed but the Docker engine is not running.
    echo.
    echo Please open Docker Desktop and wait until it shows "Engine running"
    echo in the bottom-left corner, then run this script again.
    echo.
    pause
    exit /b 1
)

REM ---- Clone or pull ----

set REPO_DIR=%USERPROFILE%\Documents\adt-studio
set REPO_URL=https://github.com/unicef/adt-studio.git

if exist "%REPO_DIR%\.git" (
    echo Repository found at %REPO_DIR%
    cd /d "%REPO_DIR%"
    echo Pulling latest changes...
    git pull
    if errorlevel 1 (
        echo.
        echo ERROR: git pull failed. Check your network connection.
        pause
        exit /b 1
    )
) else (
    echo Repository not found. Cloning into %REPO_DIR%...
    git clone "%REPO_URL%" "%REPO_DIR%"
    if errorlevel 1 (
        echo.
        echo ERROR: git clone failed. Check your network connection.
        pause
        exit /b 1
    )
    cd /d "%REPO_DIR%"
)

echo.
echo Building and starting Docker containers...
echo.

docker compose up --build -d
if errorlevel 1 (
    echo.
    echo ERROR: Docker build or start failed.
    echo Run "docker compose logs" to see what went wrong.
    pause
    exit /b 1
)

echo.
echo Waiting for ADT Studio to be ready...
set /a ATTEMPTS=0
set /a MAX_ATTEMPTS=60

:healthcheck
curl -sf http://localhost:8080/api/health >nul 2>nul
if not errorlevel 1 (
    echo.
    echo ADT Studio is ready!
    start http://localhost:8080
    goto logs
)
set /a ATTEMPTS+=1
if %ATTEMPTS% geq %MAX_ATTEMPTS% (
    echo.
    echo WARNING: ADT Studio did not become ready after 5 minutes.
    echo Opening the browser anyway — it may take a moment to load.
    start http://localhost:8080
    goto logs
)
timeout /t 5 /nobreak >nul
goto healthcheck

:logs
echo.
echo Showing container logs (press Ctrl+C to stop)...
echo.
docker compose logs -f

pause
