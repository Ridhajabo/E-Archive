param(
  [int]$Port = 3000,
  [string]$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$DataRoot = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "E-Archive Pro Data")
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

$AppDir = Resolve-FullPath $AppDir
$DataRoot = Resolve-FullPath $DataRoot
$DataDir = Join-Path $DataRoot "data"
$UploadsDir = Join-Path $DataRoot "uploads"
$BackupsDir = Join-Path $DataRoot "backups"

New-Item -ItemType Directory -Force -Path $DataDir, $UploadsDir, $BackupsDir | Out-Null

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js 18 or newer is required. Install Node.js, then run this script again."
}

$env:PORT = [string]$Port
$env:EARCHIVE_DATA_DIR = $DataDir
$env:EARCHIVE_UPLOADS_DIR = $UploadsDir
$env:EARCHIVE_BACKUP_DIR = $BackupsDir

Write-Host "E-Archive Pro"
Write-Host "URL: http://localhost:$Port"
Write-Host "Data: $DataDir"
Write-Host "Uploads: $UploadsDir"
Write-Host "Backups: $BackupsDir"

Push-Location $AppDir
try {
  & $node.Source (Join-Path $AppDir "server.js")
} finally {
  Pop-Location
}
