param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "E-Archive Pro\app"),
  [string]$DataRoot = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "E-Archive Pro Data"),
  [int]$Port = 3000,
  [switch]$StartAtLogin
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath([string]$PathValue) {
  $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($PathValue)
}

function New-Shortcut {
  param(
    [string]$Path,
    [string]$TargetPath,
    [string]$Arguments,
    [string]$WorkingDirectory,
    [string]$Description
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $TargetPath
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.Description = $Description
  $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
  $shortcut.Save()
}

$SourceDir = Resolve-FullPath (Join-Path $PSScriptRoot "..")
$InstallDir = Resolve-FullPath $InstallDir
$DataRoot = Resolve-FullPath $DataRoot
$DataDir = Join-Path $DataRoot "data"
$UploadsDir = Join-Path $DataRoot "uploads"
$BackupsDir = Join-Path $DataRoot "backups"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js 18 or newer is required before installing E-Archive Pro."
}

New-Item -ItemType Directory -Force -Path $InstallDir, $DataDir, $UploadsDir, $BackupsDir | Out-Null

$exclude = @(".git", "data", "uploads", "dist", "node_modules", ".env")
Get-ChildItem -LiteralPath $SourceDir -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
Copy-Item -LiteralPath $_.FullName -Destination $InstallDir -Recurse -Force
}

$installConfig = [pscustomobject]@{
  appName = "E-Archive Pro"
  installDir = $InstallDir
  dataRoot = $DataRoot
  port = $Port
  installedAt = (Get-Date).ToString("o")
}
$installConfig | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $InstallDir "earchive-install.json") -Encoding UTF8

$desktop = [Environment]::GetFolderPath("Desktop")
$startMenu = Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\E-Archive Pro"
New-Item -ItemType Directory -Force -Path $startMenu | Out-Null

$openScript = Join-Path $InstallDir "scripts\open-earchive.ps1"
$stopScript = Join-Path $InstallDir "scripts\stop-earchive.ps1"
$uninstallScript = Join-Path $InstallDir "scripts\uninstall-windows.ps1"
$openArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$openScript`" -Port $Port -AppDir `"$InstallDir`" -DataRoot `"$DataRoot`""
$stopArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$stopScript`" -Port $Port"
$uninstallArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$uninstallScript`" -InstallDir `"$InstallDir`""

New-Shortcut `
  -Path (Join-Path $desktop "E-Archive Pro.lnk") `
  -TargetPath "powershell.exe" `
  -Arguments $openArgs `
  -WorkingDirectory $InstallDir `
  -Description "Open E-Archive Pro"

New-Shortcut `
  -Path (Join-Path $startMenu "E-Archive Pro.lnk") `
  -TargetPath "powershell.exe" `
  -Arguments $openArgs `
  -WorkingDirectory $InstallDir `
  -Description "Open E-Archive Pro"

New-Shortcut `
  -Path (Join-Path $startMenu "Stop E-Archive Pro.lnk") `
  -TargetPath "powershell.exe" `
  -Arguments $stopArgs `
  -WorkingDirectory $InstallDir `
  -Description "Stop E-Archive Pro"

New-Shortcut `
  -Path (Join-Path $startMenu "Uninstall E-Archive Pro.lnk") `
  -TargetPath "powershell.exe" `
  -Arguments $uninstallArgs `
  -WorkingDirectory $InstallDir `
  -Description "Uninstall E-Archive Pro"

if ($StartAtLogin) {
  $taskName = "E-Archive Pro"
  $taskAction = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$InstallDir\scripts\start-earchive.ps1`" -Port $Port -AppDir `"$InstallDir`" -DataRoot `"$DataRoot`""
  $taskTrigger = New-ScheduledTaskTrigger -AtLogOn
  $taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Force | Out-Null
}

Write-Host ""
Write-Host "E-Archive Pro installed successfully."
Write-Host "Program: $InstallDir"
Write-Host "Data: $DataDir"
Write-Host "Uploads: $UploadsDir"
Write-Host "Backups: $BackupsDir"
Write-Host "URL: http://localhost:$Port"
Write-Host ""
Write-Host "Use the desktop shortcut: E-Archive Pro"
