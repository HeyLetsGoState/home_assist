# ── HA Dashboard — Build & Export ─────────────────────────────────────────────
# Usage: Right-click → "Run with PowerShell"  OR  .\build-and-export.ps1

$ErrorActionPreference = "Stop"
$image = "ha-dashboard"
$output = "ha-dashboard.tar.gz"

Write-Host "`n==> Building Docker image..." -ForegroundColor Cyan
docker build `
  --build-arg VITE_HA_URL=$env:VITE_HA_URL `
  --build-arg VITE_HA_TOKEN=$env:VITE_HA_TOKEN `
  --build-arg VITE_PIHOLE_PASSWORD=$env:VITE_PIHOLE_PASSWORD `
  --build-arg VITE_PORTAINER_TOKEN=$env:VITE_PORTAINER_TOKEN `
  --build-arg VITE_TAUTULLI_TOKEN=$env:VITE_TAUTULLI_TOKEN `
  -t $image .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n==> Exporting to $output..." -ForegroundColor Cyan
$tar = Join-Path $PSScriptRoot ($output -replace '\.gz$', '')
$output = Join-Path $PSScriptRoot $output
docker save -o $tar $image

if ($LASTEXITCODE -ne 0) {
    Write-Host "Export failed!" -ForegroundColor Red
    exit 1
}

# Compress with .NET GZipStream
$srcStream = [System.IO.File]::OpenRead($tar)
$dstStream = [System.IO.File]::Create($output)
$gz = [System.IO.Compression.GZipStream]::new($dstStream, [System.IO.Compression.CompressionMode]::Compress)
$srcStream.CopyTo($gz)
$gz.Dispose(); $dstStream.Dispose(); $srcStream.Dispose()
Remove-Item $tar

$size = [math]::Round((Get-Item $output).Length / 1MB, 1)
Write-Host "`nDone! $output ($size MB)" -ForegroundColor Green
Write-Host "Upload this file to your NAS and import via Docker Manager.`n" -ForegroundColor Gray

# Open the folder so you can grab the file
explorer.exe /select, (Resolve-Path $output)
