param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$connections = @()
try {
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
} catch {
  $connections = @()
}

if (-not $connections) {
  Write-Host "E-Archive Pro is not listening on port $Port."
  exit 0
}

foreach ($connection in $connections) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($connection.OwningProcess)" -ErrorAction SilentlyContinue
  if ($process -and $process.CommandLine -match "server\.js") {
    Stop-Process -Id $connection.OwningProcess -Force
    Write-Host "Stopped E-Archive Pro process $($connection.OwningProcess)."
  } else {
    Write-Warning "Port $Port is used by process $($connection.OwningProcess), but it does not look like E-Archive Pro."
  }
}
