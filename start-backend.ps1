# Start Backend Server Script
# This script starts the FastAPI backend server

Write-Host "Starting AI Interviewer Backend..." -ForegroundColor Cyan
Write-Host ""

# Navigate to backend directory
Set-Location backend

# Check if virtual environment exists
if (Test-Path "venv") {
    Write-Host "✓ Activating virtual environment..." -ForegroundColor Green
    .\venv\Scripts\Activate.ps1
} else {
    Write-Host "⚠ No virtual environment found. Using global Python..." -ForegroundColor Yellow
}

# Check if dependencies are installed
Write-Host "✓ Checking dependencies..." -ForegroundColor Green
$packages = @("fastapi", "uvicorn", "PyPDF2", "google-generativeai", "supabase")
$missing = @()

foreach ($pkg in $packages) {
    $installed = pip show $pkg 2>$null
    if (-not $installed) {
        $missing += $pkg
    }
}

if ($missing.Count -gt 0) {
    Write-Host "⚠ Missing packages: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    pip install -r requirements.txt
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your API keys." -ForegroundColor Yellow
    exit 1
}

# Start the server
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server on http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

