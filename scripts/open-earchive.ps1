param(
  [int]$Port = 3000,
  [string]$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$DataRoot = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "E-Archive Pro Data")
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

function Test-EArchiveRunning([int]$TargetPort) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$TargetPort" -UseBasicParsing -Method Get -TimeoutSec 2
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
  } catch {
    return $false
  }
}

$AppDir = Resolve-FullPath $AppDir
$DataRoot = Resolve-FullPath $DataRoot
$startScript = Join-Path $AppDir "scripts\start-earchive.ps1"
$url = "http://localhost:$Port"

if (-not (Test-EArchiveRunning $Port)) {
  $args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$startScript`"",
    "-Port", $Port,
    "-AppDir", "`"$AppDir`"",
    "-DataRoot", "`"$DataRoot`""
  )
  Start-Process -FilePath "powershell.exe" -ArgumentList $args -WindowStyle Hidden -WorkingDirectory $AppDir

  $ready = $false
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-EArchiveRunning $Port) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    Write-Warning "The server did not respond yet. Opening the browser anyway."
  }
}

Start-Process $url
