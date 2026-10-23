param()

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"
$venvPath = Join-Path $backendPath ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$requirementsPath = Join-Path $backendPath "requirements.txt"

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "Python was not found. Install Python and make sure it is available as 'python' in PowerShell."
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm was not found. Install Node.js and make sure 'npm' is available in PowerShell."
}

if (-not (Test-Path $venvPython)) {
  Write-Host "Creating the backend virtual environment..."
  & python -m venv $venvPath
  if ($LASTEXITCODE -ne 0) { throw "Could not create the backend virtual environment." }
}

$requirementsHash = (Get-FileHash $requirementsPath -Algorithm SHA256).Hash
$requirementsMarker = Join-Path $venvPath ".requirements-hash"
$installBackend = -not (Test-Path $requirementsMarker)
if (-not $installBackend) {
  $installBackend = (Get-Content $requirementsMarker -Raw).Trim() -ne $requirementsHash
}
if ($installBackend) {
  Write-Host "Installing backend dependencies..."
  & $venvPython -m pip install -r $requirementsPath
  if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
  Set-Content -Path $requirementsMarker -Value $requirementsHash -NoNewline
}

$nodeModules = Join-Path $frontendPath "node_modules"
if (-not (Test-Path $nodeModules)) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendPath
  try {
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
  }
  finally {
    Pop-Location
  }
}

$databasePath = Join-Path $backendPath "bhurakshak.db"
$usesDefaultDatabase = -not $env:DATABASE_URL -or $env:DATABASE_URL -eq "sqlite:///./bhurakshak.db"
if ($usesDefaultDatabase -and -not (Test-Path $databasePath)) {
  Write-Host "Creating the first local database with synthetic demo data..."
  Push-Location $backendPath
  try {
    & $venvPython -m seed.seed
    if ($LASTEXITCODE -ne 0) { throw "Could not create the local demo database." }
  }
  finally {
    Pop-Location
  }
}
elseif (-not $usesDefaultDatabase) {
  Write-Host "Using the configured DATABASE_URL. Demo data was not seeded."
}

$backendCommand = "& '$venvPython' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process -FilePath "powershell.exe" -WorkingDirectory $backendPath -ArgumentList @("-NoExit", "-Command", $backendCommand)
Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontendPath -ArgumentList @("-NoExit", "-Command", "npm run dev -- --host 127.0.0.1")

Write-Host ""
Write-Host "BhuRakshak is starting in two PowerShell windows."
Write-Host "App:     http://localhost:5173"
Write-Host "API:     http://localhost:8000"
Write-Host "API docs: http://localhost:8000/docs"
Write-Host "Close those two windows to stop the app."
