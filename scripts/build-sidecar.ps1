$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SrcTauri = Join-Path $ProjectRoot "src-tauri"
$TargetDir = Join-Path $SrcTauri "target\release"
$BinaryName = if ($env:OS -eq "Windows_NT") { "app.exe" } else { "app" }

Write-Host "Building Rust sidecar..." -ForegroundColor Cyan
cd $SrcTauri
cargo build --release

$BinaryPath = Join-Path $TargetDir $BinaryName
if (!(Test-Path $BinaryPath)) {
    throw "Build failed: $BinaryPath not found"
}

Write-Host "Sidecar built successfully: $BinaryPath" -ForegroundColor Green
