# =============================================================================
# NEURODECK Unified Build Orchestrator  ·  scripts/powershell/build.ps1
# =============================================================================
#
#  Builds NEURODECK release artifacts for one or both targets:
#    Windows  → NSIS installer  + signed ZIP bundle
#    SteamDeck → AppImage        (built inside WSL, bridged automatically)
#
#  USAGE
#  -----
#    # Full dual-target release (default)
#    powershell -File scripts/powershell/build.ps1
#
#    # Single target
#    powershell -File scripts/powershell/build.ps1 -Target win
#    powershell -File scripts/powershell/build.ps1 -Target appimage
#
#    # Skip KFMS gate (CI fast-path)
#    powershell -File scripts/powershell/build.ps1 -SkipGate
#
#    # Sign the Windows build (set env var before running)
#    $env:NEURODECK_CERT_THUMBPRINT = "ABCDEF..."
#    powershell -File scripts/powershell/build.ps1 -Target win
#
#  ENVIRONMENT VARIABLES
#  ----------------------
#    NEURODECK_CERT_THUMBPRINT   Code-signing cert thumbprint (optional)
#    NEURODECK_WSL_DISTRO        Override WSL distro name (default: auto-detect)
#    NEURODECK_BUILD_JOBS        Cargo parallel jobs (default: CPU count)
#    NEURODECK_SKIP_DEPS         Set to "1" to skip apt/npm dep installs in WSL
#
#  OUTPUT
#  ------
#    <root>/dist/
#      neurodeck_<ver>_windows_x64.exe        NSIS installer
#      neurodeck_<ver>_windows_x64.zip        portable ZIP bundle
#      neurodeck_<ver>_steamdeck_amd64.AppImage
#      build-manifest.json                    structured build record
#      SHA256SUMS.txt                         hashes of all artifacts
#
# =============================================================================

[CmdletBinding()]
param(
    # win | appimage | all
    [ValidateSet("win", "appimage", "all")]
    [string]$Target = "all",

    # Skip the KFMS release-gate pre-check
    [switch]$SkipGate,

    # Force a clean Cargo build (cargo clean before build)
    [switch]$CleanBuild,

    # Emit structured JSON to stdout on completion (useful in CI)
    [switch]$Json,

    # ShowOutput — print raw cargo/npm output instead of suppressing it
    [switch]$ShowOutput
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Constants ──────────────────────────────────────────────────────────────────
$Script:BUILD_START   = [System.Diagnostics.Stopwatch]::StartNew()
$Script:ROOT          = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$Script:DIST_DIR      = Join-Path $Script:ROOT "dist"
$Script:META_PATH     = Join-Path $Script:ROOT "infra/meta/meta.json"
$Script:ELECTRON_MAIN = Join-Path $Script:ROOT "electron/main.js"
$Script:LOG_DIR       = Join-Path $Script:ROOT ".loose/inbox/build-logs"
$Script:APPIMAGE_SH   = Join-Path $Script:ROOT "scripts/shell/build_appimage.sh"
$Script:KFMS_SCRIPT   = Join-Path $Script:ROOT "scripts/kfms/kfms-release-plan.ps1"
$Script:KFMS_INIT     = Join-Path $Script:ROOT "scripts/kfms/khaotic-init.sh"
$Script:CARGO_DIR     = Join-Path $Script:ROOT "src-tauri"
$Script:FRONTEND_DIR  = Join-Path $Script:ROOT "frontend"

# ANSI colours (works in Windows Terminal and modern PS)
$C = @{
    Reset  = "`e[0m"
    Bold   = "`e[1m"
    Cyan   = "`e[36m"
    Green  = "`e[32m"
    Yellow = "`e[33m"
    Red    = "`e[31m"
    Dim    = "`e[2m"
    Blue   = "`e[34m"
    Magenta = "`e[35m"
}

# ── Helpers ────────────────────────────────────────────────────────────────────

function Write-Banner {
    Write-Host ""
    Write-Host "$($C.Cyan)$($C.Bold)╔══════════════════════════════════════════════════════╗$($C.Reset)"
    Write-Host "$($C.Cyan)$($C.Bold)║  NEURODECK  ·  Unified Release Builder               ║$($C.Reset)"
    Write-Host "$($C.Cyan)$($C.Bold)║  Khaotic Labs  ·  KFMS v1.0                          ║$($C.Reset)"
    Write-Host "$($C.Cyan)$($C.Bold)╚══════════════════════════════════════════════════════╝$($C.Reset)"
    Write-Host ""
}

function Write-Step {
    param([string]$Phase, [string]$Message)
    Write-Host "$($C.Cyan)[$($C.Bold)$Phase$($C.Reset)$($C.Cyan)]$($C.Reset) $Message"
}

function Write-Ok {
    param([string]$Message)
    Write-Host "$($C.Green)[ OK ]$($C.Reset) $Message"
}

function Write-Warn {
    param([string]$Message)
    Write-Host "$($C.Yellow)[WARN]$($C.Reset) $Message"
}

function Write-Fail {
    param([string]$Message)
    Write-Host "$($C.Red)[FAIL]$($C.Reset) $Message"
}

function Write-Info {
    param([string]$Message)
    Write-Host "$($C.Dim)      $Message$($C.Reset)"
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $enc)
}

function Get-Elapsed {
    $ms = $Script:BUILD_START.ElapsedMilliseconds
    $s  = [int]($ms / 1000)
    $m  = [int]($s / 60)
    $s  = $s % 60
    if ($m -gt 0) { "${m}m ${s}s" } else { "${s}s" }
}

# Read meta.json; return structured object
function Get-Meta {
    if (-not (Test-Path $Script:META_PATH)) {
        throw "meta.json not found at $Script:META_PATH — run khaotic-init.sh stamp first."
    }
    return Get-Content $Script:META_PATH -Raw | ConvertFrom-Json
}

# Run a process, capture output, return exit code + combined stdout/stderr.
# Uses PowerShell's & operator via cmd /c — works for .cmd, .ps1, and .exe wrappers
# without requiring ProcessStartInfo (which fails in restricted execution contexts).
function Invoke-Process {
    param(
        [string]$Exe,
        [string[]]$ExeArgs = @(),
        [string]$WorkDir = $Script:ROOT,
        [string]$LogFile = $null,
        [hashtable]$Env = @{}
    )

    # Temporarily apply caller-supplied env overrides
    $savedEnv = @{}
    foreach ($kv in $Env.GetEnumerator()) {
        $savedEnv[$kv.Key] = [System.Environment]::GetEnvironmentVariable($kv.Key)
        [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value)
    }

    $combined  = ''
    $exitCode  = 0
    try {
        Push-Location $WorkDir
        # Temporarily allow Continue so native-command stderr (git warnings, etc.)
        # doesn't throw under the global Stop preference.
        $lines    = & { $ErrorActionPreference = 'Continue'; & cmd /c $Exe $ExeArgs 2>&1 }
        $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        $combined = ($lines | Out-String).Trim()
    } finally {
        Pop-Location
        foreach ($kv in $savedEnv.GetEnumerator()) {
            [System.Environment]::SetEnvironmentVariable($kv.Key, $kv.Value)
        }
    }

    if ($LogFile) {
        New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null
        Write-Utf8NoBom -Path $LogFile -Content $combined
    }

    if ($ShowOutput) {
        if ($combined) { Write-Host $combined }
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output   = $combined
    }
}

# Run with retry (network-sensitive steps)
function Invoke-WithRetry {
    param(
        [scriptblock]$Action,
        [string]$Label,
        [int]$Retries = 3,
        [int]$DelaySeconds = 5
    )
    $attempt = 0
    while ($true) {
        $attempt++
        try {
            return & $Action
        } catch {
            if ($attempt -ge $Retries) { throw }
            Write-Warn "$Label failed (attempt $attempt/$Retries). Retrying in ${DelaySeconds}s..."
            Start-Sleep -Seconds $DelaySeconds
            $DelaySeconds = $DelaySeconds * 2  # exponential back-off
        }
    }
}

# SHA-256 a file, return hex string
function Get-FileSha256 {
    param([string]$Path)
    $hash = Get-FileHash -Path $Path -Algorithm SHA256
    return $hash.Hash.ToLower()
}

# ── Dependency detection ───────────────────────────────────────────────────────

function Assert-Command {
    param([string]$Name, [string]$InstallHint = "")
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        $hint = if ($InstallHint) { "  Install hint: $InstallHint" } else { "" }
        throw "Required tool not found: '$Name'$hint"
    }
}

function Get-WslDistro {
    $override = $env:NEURODECK_WSL_DISTRO
    if ($override) { return $override }

    # wsl.exe --list outputs UTF-16 LE; strip null bytes before matching
    $lines = wsl.exe --list --quiet 2>$null |
        ForEach-Object { ($_ -replace '\x00', '').Trim() } |
        Where-Object { $_ -ne "" }
    $ubuntu = $lines | Where-Object { $_ -match '^Ubuntu' } | Select-Object -First 1
    if ($ubuntu) { return $ubuntu.Trim() }
    $first = $lines | Select-Object -First 1
    if ($first) { return $first.Trim() }
    throw "No WSL distro found. Install Ubuntu from the Microsoft Store."
}

# Convert a Windows absolute path → WSL-style /mnt/... path
function ConvertTo-WslPath {
    param([string]$WinPath)
    $resolved = [System.IO.Path]::GetFullPath($WinPath)
    $drive    = $resolved[0].ToString().ToLower()
    $rest     = $resolved.Substring(2).Replace('\', '/')
    return "/mnt/$drive$rest"
}

# ── Code signing ───────────────────────────────────────────────────────────────

function Get-SignTool {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\bin\x64\signtool.exe",
        "${env:ProgramFiles}\Windows Kits\10\bin\x64\signtool.exe"
    )
    # Also search dynamically via registry
    $kitRoot = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots" `
        -ErrorAction SilentlyContinue)."KitsRoot10"
    if ($kitRoot) {
        $candidates += Join-Path $kitRoot "bin\x64\signtool.exe"
        # Multi-version kits — check version subdirs
        Get-ChildItem (Join-Path $kitRoot "bin") -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { $candidates += Join-Path $_.FullName "x64\signtool.exe" }
    }
    return $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}

function Invoke-SignFile {
    param([string]$FilePath, [string]$Thumbprint, [string]$SignTool)
    if (-not $Thumbprint -or -not $SignTool) { return }
    Write-Step "SIGN" (Split-Path $FilePath -Leaf)
    $r = Invoke-Process -Exe $SignTool -ExeArgs @(
        "sign",
        "/sha1", $Thumbprint,
        "/tr",  "http://timestamp.digicert.com",
        "/td",  "sha256",
        "/fd",  "sha256",
        $FilePath
    ) -LogFile (Join-Path $Script:LOG_DIR "signtool-$(Split-Path $FilePath -Leaf).log")
    if ($r.ExitCode -ne 0) { throw "signtool failed for $FilePath`n$($r.Output)" }
    Write-Ok "Signed: $(Split-Path $FilePath -Leaf)"
}

# ── Phase: Pre-flight ──────────────────────────────────────────────────────────

function Invoke-Preflight {
    param([string]$TargetMode)

    Write-Step "PRE" "Running pre-flight checks..."

    # Self-heal common PATH issues dynamically before asserting commands
    if (-not (Get-Command "cargo" -ErrorAction SilentlyContinue)) {
        $userCargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
        if (Test-Path $userCargoBin) {
            $env:PATH = "$env:PATH;$userCargoBin"
            Write-Warn "Added cargo bin to PATH dynamically: $userCargoBin"
        }
    }
    if (-not (Get-Command "npm" -ErrorAction SilentlyContinue)) {
        $npmPaths = @(
            "${env:ProgramFiles}\nodejs",
            "${env:ProgramFiles(x86)}\nodejs",
            "${env:APPDATA}\npm"
        )
        foreach ($p in $npmPaths) {
            if (Test-Path $p) {
                $env:PATH = "$env:PATH;$p"
                Write-Warn "Added node/npm to PATH dynamically: $p"
                break
            }
        }
    }

    # Required on all paths
    Assert-Command "cargo"  "Install Rust: https://rustup.rs"
    Assert-Command "git"    "Install Git: https://git-scm.com"

    if ($TargetMode -in "win", "all") {
        Assert-Command "npm"     "Install Node.js 20+: https://nodejs.org"

        # Verify electron-builder is available
        $r = Invoke-Process -Exe "npx" -ExeArgs @("electron-builder", "--version") -WorkDir $Script:ROOT
        if ($r.ExitCode -ne 0) { throw "electron-builder not available via npx. Run: npm install" }
        Write-Ok "electron-builder: $($r.Output.Trim())"
    }

    if ($TargetMode -in "appimage", "all") {
        Assert-Command "wsl" "Enable WSL2 and install Ubuntu from the Microsoft Store."
        $distro = Get-WslDistro
        Write-Ok "WSL distro: $distro"
    }

    # Cargo job count
    $jobs = $env:NEURODECK_BUILD_JOBS
    if (-not $jobs) {
        $cpus = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
        $Script:CARGO_JOBS = [math]::Max(1, $cpus)
    } else {
        $Script:CARGO_JOBS = [int]$jobs
    }
    Write-Ok "Cargo parallel jobs: $($Script:CARGO_JOBS)"

    Write-Ok "Pre-flight passed"
}

# ── Phase: KFMS Gate ───────────────────────────────────────────────────────────

function Invoke-KfmsGate {
    Write-Step "GATE" "Running KFMS release gate..."
    $r = Invoke-Process -Exe "powershell.exe" -ExeArgs @(
        "-NoProfile", "-ExecutionPolicy", "Bypass",
        "-File", $Script:KFMS_SCRIPT, "-Json"
    ) -LogFile (Join-Path $Script:LOG_DIR "kfms-gate.json")

    $decision = "HOLD"
    try {
        $plan = $r.Output | ConvertFrom-Json
        $decision = $plan.release_decision
    } catch { }

    if ($r.ExitCode -ne 0 -or $decision -ne "GO") {
        throw "KFMS gate: $decision. Fix blockers before building a release.`n$($r.Output)"
    }
    Write-Ok "KFMS gate: GO"
}

# ── Phase: Frontend ────────────────────────────────────────────────────────────

function Invoke-FrontendBuild {
    Write-Step "FE" "Checking frontend dependencies..."
    $lockFile = Join-Path $Script:ROOT "package-lock.json"
    $hashFile = Join-Path $Script:ROOT ".package-lock.hash"
    $nodeModules = Join-Path $Script:ROOT "node_modules"

    $skipNpmCi = $false
    if (Test-Path $nodeModules) {
        if (Test-Path $lockFile) {
            $currentHash = (Get-FileHash -Path $lockFile -Algorithm MD5).Hash
            if (Test-Path $hashFile) {
                $lastHash = Get-Content $hashFile -Raw
                if ($currentHash -eq $lastHash) {
                    $skipNpmCi = $true
                }
            }
        }
    }

    if ($skipNpmCi) {
        Write-Ok "JS dependencies up to date (cached)"
    } else {
        Write-Step "FE" "Installing frontend dependencies (npm ci)..."
        $r = Invoke-WithRetry -Label "npm ci" -Action {
            Invoke-Process -Exe "npm.cmd" -ExeArgs @("ci", "--prefer-offline") `
                -WorkDir $Script:ROOT `
                -LogFile (Join-Path $Script:LOG_DIR "npm-ci.log")
        }
        if ($r.ExitCode -ne 0) { throw "npm ci failed`n$($r.Output)" }

        if (Test-Path $lockFile) {
            $currentHash = (Get-FileHash -Path $lockFile -Algorithm MD5).Hash
            Write-Utf8NoBom -Path $hashFile -Content $currentHash
        }
        Write-Ok "npm ci complete"
    }

    Write-Ok "Vite compilation skipped (handled automatically by electron-builder)"
}

# ── Phase: Clean (optional) ────────────────────────────────────────────────────

function Invoke-CargoClean {
    Write-Step "CLEAN" "Running cargo clean..."
    $r = Invoke-Process -Exe "cargo" -ExeArgs @("clean") `
        -WorkDir $Script:CARGO_DIR `
        -LogFile (Join-Path $Script:LOG_DIR "cargo-clean.log")
    if ($r.ExitCode -ne 0) { throw "cargo clean failed`n$($r.Output)" }
    Write-Ok "Cargo workspace cleaned"
}

# ── Phase: Windows Build ───────────────────────────────────────────────────────

function Invoke-WindowsBuild {
    param([pscustomobject]$Meta, [string]$Thumbprint, [string]$SignTool)

    $ver = $Meta.version
    Write-Step "WIN" "Building Windows NSIS installer (v$ver)..."

    # Env overrides for the build
    $buildEnv = @{
        RUSTFLAGS            = "-C target-cpu=native"
        CARGO_BUILD_JOBS     = $Script:CARGO_JOBS.ToString()
    }

    # Prefer Gemini key if present, so build doesn't default to Ollama
    if ($env:GEMINI_API_KEY) {
        $buildEnv["GEMINI_API_KEY"] = $env:GEMINI_API_KEY
    }

    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-Process -Exe "npm" -ExeArgs @("run", "build") `
        -WorkDir $Script:ROOT `
        -LogFile (Join-Path $Script:LOG_DIR "electron-build-win.log") `
        -Env $buildEnv
    $watch.Stop()

    if ($r.ExitCode -ne 0) { throw "Electron Windows build failed`n$($r.Output)" }
    Write-Ok "Electron build done ($([int]($watch.ElapsedMilliseconds/1000))s)"

    # ── Locate outputs ──
    $distElectron = Join-Path $Script:ROOT "dist-electron"
    if (-not (Test-Path $distElectron)) { throw "dist-electron/ not found after build." }

    $installer = Get-ChildItem $distElectron -Filter "NEURODECK_*_windows_x64.exe" -ErrorAction Stop |
                    Select-Object -First 1
    if (-not $installer) { throw "NSIS installer exe not found in $distElectron" }

    $exeSearch = @(
        "target/release/app.exe",
        "target/release/neurodeck.exe"
    )
    $exePath = $exeSearch |
        ForEach-Object { Join-Path $Script:ROOT $_ } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
    if (-not $exePath) { throw "Release binary (.exe) not found after build." }

    # ── Sign ──
    Invoke-SignFile -FilePath $installer.FullName -Thumbprint $Thumbprint -SignTool $SignTool

    # ── Stage to dist/ ──
    $outInstaller = Join-Path $Script:DIST_DIR "neurodeck_${ver}_windows_x64.exe"
    Copy-Item $installer.FullName $outInstaller -Force
    Write-Ok "Installer staged → $(Split-Path $outInstaller -Leaf)"

    # ── Build ZIP bundle ──
    $stagingDir = Join-Path $Script:DIST_DIR "_win_staging"
    if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
    $null = New-Item -ItemType Directory $stagingDir

    # Copy binary
    Copy-Item $exePath (Join-Path $stagingDir "neurodeck.exe") -Force
    Invoke-SignFile -FilePath (Join-Path $stagingDir "neurodeck.exe") -Thumbprint $Thumbprint -SignTool $SignTool

    # Copy optional dirs
    foreach ($d in @("scripts", "plugins", "_bmad", ".agents", "docs", "assets")) {
        $src = Join-Path $Script:ROOT $d
        if (Test-Path $src) { Copy-Item -Recurse $src (Join-Path $stagingDir $d) }
    }

    # Copy config + launchers
    $singleFiles = @(
        @{ src = "llm-term.toml";                dst = "llm-term.toml.template" },
        @{ src = "install.sh";                   dst = "install.sh" },
        @{ src = "launch_gamescope.sh";          dst = "launch_gamescope.sh" },
        @{ src = "README.md";                    dst = "README.md" },
        @{ src = "ROADMAP.md";                   dst = "ROADMAP.md" },
        @{ src = "assets/steam_input/neurodeck_gamepad.vdf"; dst = "neurodeck_gamepad.vdf" },
        @{ src = "assets/steam_input/steam_input.vdf";       dst = "steam_input.vdf" },
        @{ src = "assets/custom_style.json";     dst = "custom_style.json" }
    )
    foreach ($f in $singleFiles) {
        $s = Join-Path $Script:ROOT $f.src
        if (Test-Path $s) { Copy-Item $s (Join-Path $stagingDir $f.dst) -Force }
    }

    $outZip = Join-Path $Script:DIST_DIR "neurodeck_${ver}_windows_x64.zip"
    Compress-Archive -Path "$stagingDir/*" -DestinationPath $outZip -Force
    Remove-Item $stagingDir -Recurse -Force
    Write-Ok "ZIP bundle staged → $(Split-Path $outZip -Leaf)"

    # Keep root-level alias for backward compat (KFMS preserve list)
    Copy-Item $outInstaller (Join-Path $Script:ROOT "neurodeck_installer.exe")    -Force
    Copy-Item $outZip       (Join-Path $Script:ROOT "neurodeck_win_release.zip") -Force

    if (-not $Thumbprint) {
        Write-Warn "Build is UNSIGNED — SmartScreen will warn users on first launch."
        Write-Warn "Set NEURODECK_CERT_THUMBPRINT to enable code signing."
    }

    return [pscustomobject]@{
        target    = "windows"
        installer = $outInstaller
        zip       = $outZip
        signed    = [bool]$Thumbprint
        duration_ms = [int]$watch.ElapsedMilliseconds
    }
}

# ── Phase: AppImage Build (WSL) ────────────────────────────────────────────────

function Invoke-AppImageBuild {
    param([pscustomobject]$Meta)

    $ver    = $Meta.version
    $distro = Get-WslDistro
    Write-Step "APPIMAGE" "Building AppImage v$ver via WSL ($distro)..."

    # Convert paths for WSL
    $wslRoot   = ConvertTo-WslPath $Script:ROOT
    $wslScript = ConvertTo-WslPath $Script:APPIMAGE_SH
    $wslDist   = ConvertTo-WslPath $Script:DIST_DIR

    # Compose the bash command to run inside WSL
    # The build_appimage.sh already handles all dep installation and builds
    # We inject NEURODECK_SKIP_DEPS and DIST_OVERRIDE so the shell can copy
    # the final artifact directly into our dist/ dir
    $skipDeps  = if ($env:NEURODECK_SKIP_DEPS -eq "1") { "1" } else { "0" }
    $cargoJobs = $Script:CARGO_JOBS

    $bashCmd = @(
        "set -euo pipefail",
        "export NEURODECK_SKIP_DEPS='$skipDeps'",
        "export CARGO_BUILD_JOBS='$cargoJobs'",
        "export DIST_OUT='$wslDist'",
        "bash '$wslScript'"
    ) -join "`n"

    # Write temp bash script — no BOM, LF-only line endings (both required by bash)
    $guidSuffix = [System.Guid]::NewGuid().ToString('N').Substring(0, 8)
    $tmpBash    = Join-Path $env:TEMP "nd_appimage_$guidSuffix.sh"
    $bashLf     = $bashCmd -replace "`r`n", "`n" -replace "`r", "`n"
    $utf8NoBom  = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($tmpBash, $bashLf, $utf8NoBom)
    $wslTmpBash = ConvertTo-WslPath $tmpBash

    $watch = [System.Diagnostics.Stopwatch]::StartNew()
    Write-Info "WSL is building — this may take 10-25 min on first run (Rust compile)..."

    $logFile = Join-Path $Script:LOG_DIR "appimage-build.log"
    $r = Invoke-Process -Exe "wsl.exe" -ExeArgs @("-d", $distro, "--", "bash", $wslTmpBash) `
        -WorkDir $Script:ROOT `
        -LogFile $logFile
    $watch.Stop()

    Remove-Item $tmpBash -Force -ErrorAction SilentlyContinue

    if ($r.ExitCode -ne 0) {
        Write-Fail "AppImage build failed. Log: $logFile"
        if ($ShowOutput) { Write-Host $r.Output }
        throw "AppImage build failed (WSL exit $($r.ExitCode)). See $logFile"
    }
    Write-Ok "WSL build complete ($([int]($watch.ElapsedMilliseconds/1000))s)"

    # Locate the AppImage — electron-builder puts it in dist-electron/
    $bundleDirs = @(
        "dist-electron"
    )
    $appimage = $null
    foreach ($d in $bundleDirs) {
        $full = Join-Path $Script:ROOT $d
        if (Test-Path $full) {
            $appimage = Get-ChildItem $full -Filter "*.AppImage" |
                            Sort-Object LastWriteTime -Descending |
                            Select-Object -First 1
            if ($appimage) { break }
        }
    }
    if (-not $appimage) { throw "AppImage not found after WSL build. Check $logFile" }

    $outFile = Join-Path $Script:DIST_DIR "neurodeck_${ver}_steamdeck_amd64.AppImage"
    Copy-Item $appimage.FullName $outFile -Force
    Write-Ok "AppImage staged → $(Split-Path $outFile -Leaf) ($([int]($appimage.Length / 1MB)) MB)"

    # Backward-compat alias at root
    Copy-Item $outFile (Join-Path $Script:ROOT "neurodeck_${ver}_amd64.AppImage") -Force

    return [pscustomobject]@{
        target      = "appimage"
        path        = $outFile
        size_mb     = [math]::Round($appimage.Length / 1MB, 1)
        duration_ms = [int]$watch.ElapsedMilliseconds
    }
}

# ── Phase: Post-build — manifest + checksums ───────────────────────────────────

function Write-BuildManifest {
    param([pscustomobject]$Meta, [object[]]$Results)

    $artifacts = [System.Collections.Generic.List[object]]::new()
    $sumsLines = [System.Collections.Generic.List[string]]::new()

    foreach ($r in $Results) {
        $files = @()
        switch ($r.target) {
            "windows" {
                $files = @($r.installer, $r.zip) | Where-Object { $_ -and (Test-Path $_) }
            }
            "appimage" {
                $files = @($r.path) | Where-Object { $_ -and (Test-Path $_) }
            }
        }
        foreach ($f in $files) {
            $sha = Get-FileSha256 $f
            $name = Split-Path $f -Leaf
            $size = (Get-Item $f).Length
            $artifacts.Add([pscustomobject]@{
                name    = $name
                path    = $f
                sha256  = $sha
                size    = $size
                target  = $r.target
            })
            $sumsLines.Add("$sha  $name")
            Write-Ok "SHA256 $($sha.Substring(0,16))…  $name"
        }
    }

    # SHA256SUMS.txt
    $sumsPath = Join-Path $Script:DIST_DIR "SHA256SUMS.txt"
    Write-Utf8NoBom -Path $sumsPath -Content ($sumsLines -join "`n")

    # build-manifest.json
    $manifest = [pscustomobject]@{
        schema         = "neurodeck-build-manifest/1.0"
        project        = $Meta.project.name
        version        = $Meta.version
        codename       = $Meta.codename.name
        tag            = $Meta.tag
        git_sha        = $Meta.build.git_sha
        built_at_utc   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        host           = $env:COMPUTERNAME
        artifacts      = @($artifacts)
        build_results  = @($Results)
        total_duration_ms = [int]$Script:BUILD_START.ElapsedMilliseconds
    }
    $manifestPath = Join-Path $Script:DIST_DIR "build-manifest.json"
    Write-Utf8NoBom -Path $manifestPath -Content ($manifest | ConvertTo-Json -Depth 8)

    Write-Ok "Manifest → dist/build-manifest.json"
    Write-Ok "Checksums → dist/SHA256SUMS.txt"
    return $manifest
}

# ── Phase: KFMS stamp post-build ──────────────────────────────────────────────

function Invoke-PostBuildStamp {
    Write-Step "KFMS" "Stamping build block in meta.json..."
    $r = Invoke-Process -Exe "bash" -ExeArgs @($Script:KFMS_INIT, "stamp") `
        -WorkDir $Script:ROOT `
        -LogFile (Join-Path $Script:LOG_DIR "kfms-stamp.log")
    if ($r.ExitCode -eq 0) {
        Write-Ok "KFMS build block stamped"
    } else {
        Write-Warn "KFMS stamp returned non-zero (may not be in WSL context) — continuing."
    }
}

# ── Summary table ──────────────────────────────────────────────────────────────

function Write-Summary {
    param([pscustomobject]$Manifest, [object[]]$Results)

    $elapsed = Get-Elapsed
    Write-Host ""
    Write-Host "$($C.Green)$($C.Bold)╔══════════════════════════════════════════════════════╗$($C.Reset)"
    Write-Host "$($C.Green)$($C.Bold)║  BUILD COMPLETE  ·  NEURODECK v$($Manifest.version)-$($Manifest.codename)$(' ' * (20 - $Manifest.version.Length - $Manifest.codename.Length))║$($C.Reset)"
    Write-Host "$($C.Green)$($C.Bold)╚══════════════════════════════════════════════════════╝$($C.Reset)"
    Write-Host ""
    Write-Host "$($C.Bold)  Artifacts in dist/$($C.Reset)"
    Write-Host ""

    foreach ($a in $Manifest.artifacts) {
        $sizeMb = [math]::Round($a.size / 1MB, 1)
        Write-Host "  $($C.Green)✓$($C.Reset)  $($C.Bold)$($a.name)$($C.Reset)"
        Write-Host "      SHA256 : $($a.sha256)"
        Write-Host "      Size   : ${sizeMb} MB"
        Write-Host ""
    }

    foreach ($r in $Results) {
        if ($r.target -eq "windows" -and -not $r.signed) {
            Write-Host "  $($C.Yellow)⚠$($C.Reset)  Windows build is $($C.Yellow)UNSIGNED$($C.Reset). Set NEURODECK_CERT_THUMBPRINT to sign."
            Write-Host ""
        }
    }

    Write-Host "  Total time : $elapsed"
    Write-Host "  Log dir    : $Script:LOG_DIR"
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

try {
    Write-Banner

    # Ensure output directories exist
    New-Item -ItemType Directory -Force -Path $Script:DIST_DIR  | Out-Null
    New-Item -ItemType Directory -Force -Path $Script:LOG_DIR   | Out-Null

    $meta = Get-Meta
    Write-Ok "Project   : $($meta.project.name) v$($meta.version) ($($meta.codename.name))"
    Write-Ok "Git SHA   : $($meta.build.git_sha.Substring(0,12))…"
    Write-Ok "Target    : $Target"
    Write-Host ""

    # 1 · Pre-flight
    Invoke-Preflight -TargetMode $Target

    # 2 · KFMS release gate (optional bypass)
    if ($SkipGate) {
        Write-Warn "KFMS gate skipped (--SkipGate). Build will proceed regardless of release score."
    } else {
        Invoke-KfmsGate
    }

    # 3 · Optional clean
    if ($CleanBuild) {
        Invoke-CargoClean
    }

    # 4 · Frontend (shared by both targets — build once)
    if ($Target -in "win", "all") {
        Invoke-FrontendBuild
    }

    # 5 · Signing setup (Windows only)
    $thumbprint = $env:NEURODECK_CERT_THUMBPRINT
    $signtool   = if ($thumbprint) { Get-SignTool } else { $null }
    if ($thumbprint -and -not $signtool) {
        Write-Warn "NEURODECK_CERT_THUMBPRINT is set but signtool.exe not found. Install Windows SDK."
        $thumbprint = $null
    }

    # 6 · Platform builds
    $results = @()

    if ($Target -in "win", "all") {
        Write-Host ""
        $winResult = Invoke-WindowsBuild -Meta $meta -Thumbprint $thumbprint -SignTool $signtool
        $results  += $winResult
        Write-Ok "Windows build complete in $([int]($winResult.duration_ms/1000))s"
    }

    if ($Target -in "appimage", "all") {
        Write-Host ""
        $aiResult = Invoke-AppImageBuild -Meta $meta
        $results += $aiResult
        Write-Ok "AppImage build complete in $([int]($aiResult.duration_ms/1000))s"
    }

    # 7 · Manifest + checksums
    Write-Host ""
    Write-Step "POST" "Writing build manifest and checksums..."
    $manifest = Write-BuildManifest -Meta $meta -Results $results

    # 8 · KFMS post-build stamp
    Invoke-PostBuildStamp

    # 9 · Summary
    Write-Summary -Manifest $manifest -Results $results

    if ($Json) {
        $manifest | ConvertTo-Json -Depth 8
    }

    exit 0

} catch {
    Write-Host ""
    Write-Fail "BUILD FAILED after $(Get-Elapsed)"
    Write-Fail $_.Exception.Message
    if ($_.ScriptStackTrace) {
        Write-Host "$($C.Dim)$($_.ScriptStackTrace)$($C.Reset)"
    }
    Write-Host ""
    Write-Info "Logs in: $Script:LOG_DIR"
    exit 1
}
