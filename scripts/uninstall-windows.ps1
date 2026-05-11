param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "E-Archive Pro\app"),
  [switch]$RemoveData
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

$InstallDir = Resolve-FullPath $InstallDir
$configFile = Join-Path $InstallDir "earchive-install.json"
$config = $null
if (Test-Path $configFile) {
  $config = Get-Content -Raw -LiteralPath $configFile | ConvertFrom-Json
}

$DataRoot = if ($config -and $config.dataRoot) {
  [string]$config.dataRoot
} else {
  Join-Path ([Environment]::GetFolderPath("MyDocuments")) "E-Archive Pro Data"
}
$Port = if ($config -and $config.port) { [int]$config.port } else { 3000 }
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "E-Archive Pro.lnk"
$startMenu = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\E-Archive Pro"

try {
  Unregister-ScheduledTask -TaskName "E-Archive Pro" -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

if (Test-Path (Join-Path $InstallDir "scripts\stop-earchive.ps1")) {
  & (Join-Path $InstallDir "scripts\stop-earchive.ps1") -Port $Port
}

Remove-Item -LiteralPath $desktopShortcut -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $startMenu -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $InstallDir -Recurse -Force -ErrorAction SilentlyContinue

if ($RemoveData) {
  Remove-Item -LiteralPath $DataRoot -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "E-Archive Pro removed with local data."
} else {
  Write-Host "E-Archive Pro removed. Local data was kept at: $DataRoot"
}
