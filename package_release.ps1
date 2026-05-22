# package_release.ps1 - PowerShell script to package NEURODECK release artifacts

$ErrorActionPreference = "Stop"

Write-Output "=== Starting NEURODECK Release Packaging ==="

# 1. Clean previous build artifacts
if (Test-Path "neurodeck_win_release.zip") {
    Write-Output "Removing old release zip..."
    Remove-Item "neurodeck_win_release.zip" -Force
}
if (Test-Path "neurodeck_installer.exe") {
    Write-Output "Removing old installer..."
    Remove-Item "neurodeck_installer.exe" -Force
}

# 2. Build the Tauri application in release mode
Write-Output "Building Tauri app in release mode..."
npx tauri build

# 3. Locate compiled outputs
$binaryPath = "src-tauri/target/release/app.exe"
$setupPath = "src-tauri/target/release/bundle/nsis/neurodeck_0.1.0_x64-setup.exe"

if (-not (Test-Path $binaryPath)) {
    Write-Error "Failed to find compiled application binary at $binaryPath"
}
if (-not (Test-Path $setupPath)) {
    Write-Error "Failed to find setup installer at $setupPath"
}

# 4. Create staging directory
$stagingDir = "neurodeck-win-release"
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
$null = New-Item -ItemType Directory -Path $stagingDir

# 5. Copy and rename executable
Write-Output "Staging release files..."
Copy-Item $binaryPath "$stagingDir/neurodeck.exe"

# Copy scripts and plugins and BMad directories
if (Test-Path "scripts") {
    Copy-Item -Recurse "scripts" "$stagingDir/scripts"
}
if (Test-Path "plugins") {
    Copy-Item -Recurse "plugins" "$stagingDir/plugins"
}
if (Test-Path "_bmad") {
    Copy-Item -Recurse "_bmad" "$stagingDir/_bmad"
}
if (Test-Path ".agents") {
    Copy-Item -Recurse ".agents" "$stagingDir/.agents"
}

# Copy configurations (copy config as template)
Copy-Item "llm-term.toml" "$stagingDir/llm-term.toml.template"
Copy-Item "custom_style.json" "$stagingDir/custom_style.json"

# Copy scripts
Copy-Item "install.sh" "$stagingDir/install.sh"
Copy-Item "launch_gamescope.sh" "$stagingDir/launch_gamescope.sh"

# Copy documentation
Copy-Item "README.md" "$stagingDir/README.md"
Copy-Item "ROADMAP.md" "$stagingDir/ROADMAP.md"
if (Test-Path "docs") {
    Copy-Item -Recurse "docs" "$stagingDir/docs"
}

# 6. Compress staging folder to zip
Write-Output "Creating release zip archive..."
Compress-Archive -Path $stagingDir -DestinationPath "neurodeck_win_release.zip" -Force

# 7. Clean up staging folder
Write-Output "Cleaning up staging directory..."
Remove-Item $stagingDir -Recurse -Force

# 8. Copy setup installer to root workspace for convenience
Write-Output "Copying installer to root..."
Copy-Item $setupPath "neurodeck_installer.exe"

Write-Output "=== Packaging Complete ==="
Write-Output "Created release archive: neurodeck_win_release.zip"
Write-Output "Created setup installer: neurodeck_installer.exe"
