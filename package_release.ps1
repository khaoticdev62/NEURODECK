# package_release.ps1 - Package and optionally sign NEURODECK release artifacts
#
# CODE SIGNING (optional but required to avoid Windows SmartScreen):
#   Set $env:NEURODECK_CERT_THUMBPRINT to your certificate thumbprint before running.
#   Example: $env:NEURODECK_CERT_THUMBPRINT = "ABCDEF1234567890..."
#   Get thumbprint: Get-ChildItem Cert:\CurrentUser\My | Select Thumbprint,Subject
#
#   To obtain a cert for testing: New-SelfSignedCertificate -Type CodeSigning ...
#   For distribution: purchase an EV Code Signing certificate from DigiCert / Sectigo.

$ErrorActionPreference = "Stop"

Write-Output "=== Starting NEURODECK Release Packaging ==="

# ── Signing configuration ───────────────────────────────────────────────────
$certThumbprint = $env:NEURODECK_CERT_THUMBPRINT
$signtool = "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe"
if (-not (Test-Path $signtool)) {
    $signtool = "${env:ProgramFiles}\Windows Kits\10\bin\x64\signtool.exe"
}
$canSign = ($certThumbprint -and (Test-Path $signtool))

function Sign-File {
    param([string]$FilePath)
    if (-not $canSign) {
        Write-Warning "Skipping signing for $FilePath (no cert thumbprint or signtool not found)."
        return
    }
    Write-Output "Signing: $FilePath"
    & $signtool sign `
        /sha1 $certThumbprint `
        /tr http://timestamp.digicert.com `
        /td sha256 `
        /fd sha256 `
        "$FilePath"
    if ($LASTEXITCODE -ne 0) {
        throw "signtool failed for $FilePath (exit $LASTEXITCODE)"
    }
}

# ── 1. Clean previous artifacts ─────────────────────────────────────────────
foreach ($f in @("neurodeck_win_release.zip", "neurodeck_installer.exe")) {
    if (Test-Path $f) { Remove-Item $f -Force }
}

# ── 2. Build in release mode ────────────────────────────────────────────────
Write-Output "Building Tauri app in release mode..."
npx tauri build

# ── 3. Locate outputs ───────────────────────────────────────────────────────
$binaryPath = "target/release/app.exe"
$setupPath  = "target/release/bundle/nsis/neurodeck_1.0.0_x64-setup.exe"

if (-not (Test-Path $binaryPath)) { Write-Error "Binary not found: $binaryPath" }
if (-not (Test-Path $setupPath))  { Write-Error "Installer not found: $setupPath" }

# ── 4. Sign the installer (before copying) ──────────────────────────────────
if (-not $canSign) {
    Write-Warning "==================================================================="
    Write-Warning "UNSIGNED BUILD - Windows SmartScreen will block first-run for users."
    Write-Warning "Set NEURODECK_CERT_THUMBPRINT to enable signing."
    Write-Warning "==================================================================="
}
Sign-File $setupPath

# ── 5. Stage release files ──────────────────────────────────────────────────
$stagingDir = "neurodeck-win-release"
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
$null = New-Item -ItemType Directory -Path $stagingDir

Write-Output "Staging release files..."
Copy-Item $binaryPath "$stagingDir/neurodeck.exe"
Sign-File "$stagingDir/neurodeck.exe"

foreach ($dir in @("scripts", "plugins", "_bmad", ".agents")) {
    if (Test-Path $dir) { Copy-Item -Recurse $dir "$stagingDir/$dir" }
}

Copy-Item "llm-term.toml"    "$stagingDir/llm-term.toml.template"
Copy-Item "custom_style.json" "$stagingDir/custom_style.json"
Copy-Item "install.sh"        "$stagingDir/install.sh"
Copy-Item "launch_gamescope.sh" "$stagingDir/launch_gamescope.sh"
Copy-Item "README.md"         "$stagingDir/README.md"
if (Test-Path "ROADMAP.md") { Copy-Item "ROADMAP.md" "$stagingDir/ROADMAP.md" }
if (Test-Path "docs")        { Copy-Item -Recurse "docs" "$stagingDir/docs" }

# ── 6. Compress ─────────────────────────────────────────────────────────────
Write-Output "Creating release zip..."
Compress-Archive -Path $stagingDir -DestinationPath "neurodeck_win_release.zip" -Force
Remove-Item $stagingDir -Recurse -Force

# ── 7. Copy signed installer to root ────────────────────────────────────────
Copy-Item $setupPath "neurodeck_installer.exe"

Write-Output ""
Write-Output "=== Packaging Complete ==="
Write-Output "  Archive:   neurodeck_win_release.zip"
Write-Output "  Installer: neurodeck_installer.exe"
if ($canSign) {
    Write-Output "  Signed:    YES (cert $certThumbprint)"
} else {
    Write-Output "  Signed:    NO  - set NEURODECK_CERT_THUMBPRINT for signed builds"
}
