@echo off
REM AI Interview Assistant - Setup Script for Windows
REM This script automates the initial setup process

echo ================================================
echo AI Interview Assistant - Setup Script (Windows)
echo ================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js 18 or higher.
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Python is not installed. Please install Python 3.9 or higher.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i

echo [OK] Node.js %NODE_VERSION% detected
echo [OK] Python %PYTHON_VERSION% detected
echo.

REM Frontend setup
echo Installing frontend dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo X Frontend dependency installation failed
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
echo.

REM Backend setup
echo Setting up backend environment...
cd backend

REM Create virtual environment if it doesn't exist
if not exist "venv\" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo X Backend dependency installation failed
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
cd ..
echo.

REM Create environment files if they don't exist
echo Setting up environment files...

if not exist ".env" (
    copy .env.example .env
    echo [OK] Created .env file from template
    echo [!] Please edit .env and add your API keys
) else (
    echo [OK] .env file already exists
)

if not exist "backend\.env" (
    copy backend\.env.example backend\.env
    echo [OK] Created backend\.env file from template
    echo [!] Please edit backend\.env and add your API keys
) else (
    echo [OK] backend\.env file already exists
)
echo.

REM Summary
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Next Steps:
echo 1. Edit .env and backend\.env with your API keys
echo 2. Set up Supabase database (run schema from supabase\schema.sql)
echo 3. Start backend: cd backend ^&^& python main.py
echo 4. Start frontend: npm run dev
echo.
echo Documentation:
echo - Quick Start: See SETUP_GUIDE.md
echo - Full Documentation: See README.md
echo - Architecture: See ARCHITECTURE.md
echo.
echo Happy interviewing!
echo.
pause

