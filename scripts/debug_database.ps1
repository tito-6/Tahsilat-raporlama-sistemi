# Database Diagnostic Tool for Tahsilat Raporu
# Usage: Run this script from the project root directory

Write-Host "🔧 Database Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=" * 50

# Check if we're in the right directory
if (-not (Test-Path "tahsilat_data.db")) {
    Write-Host "❌ Database file not found. Make sure you're running this from the project root directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# Check if Python is available
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python or add it to your PATH." -ForegroundColor Red
    exit 1
}

# Run the Python diagnostic script
Write-Host "🚀 Starting database diagnostics..." -ForegroundColor Green
python scripts/debug_database.py