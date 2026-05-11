param(
  [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "dist"),
  [string]$PackageName = "E-Archive-Pro-Local"
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OutputDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDir)
$PackageDir = Join-Path $OutputDir $PackageName
$ZipPath = Join-Path $OutputDir "$PackageName.zip"

if (Test-Path $PackageDir) {
  Remove-Item -LiteralPath $PackageDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $PackageDir | Out-Null

$exclude = @(".git", "data", "uploads", "dist", "node_modules", ".env")
Get-ChildItem -LiteralPath $Root -Force | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $PackageDir -Recurse -Force
}

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $PackageDir "*") -DestinationPath $ZipPath -Force

$hash = Get-FileHash -Path $ZipPath -Algorithm SHA256
[pscustomobject]@{
  package = $ZipPath
  size_mb = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
  sha256 = $hash.Hash
} | ConvertTo-Json -Compress
