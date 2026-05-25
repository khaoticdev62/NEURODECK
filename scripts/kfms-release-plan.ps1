[CmdletBinding()]
param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$script:Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:MetaPath = Join-Path $script:Root "infra/meta/meta.json"
$script:HealthPath = Join-Path $script:Root "infra/telemetry/health.json"
$script:PlanPath = Join-Path $script:Root "docs/IMPLEMENTATION_PLAN.md"
$script:LogsDir = Join-Path $script:Root ".loose/inbox/kfms-release-logs"

$preserveFiles = @(
    "README.md",
    "CLAUDE.md",
    "ROADMAP.md",
    "Cargo.toml",
    "Cargo.lock",
    "package.json",
    "package-lock.json",
    "llm-term.toml",
    "custom_style.json",
    "install.sh",
    "launch_gamescope.sh",
    "build_flatpak.sh",
    "package_release.ps1",
    "epics.md",
    "gemini.md",
    "SteamOS_LLM_Terminal_PRD_SDS.md",
    "SteamOS_LLM_Terminal_PRD_SDS.pdf"
)

function Write-KfmsLine {
    param(
        [ValidateSet("info", "ok", "warn", "fail")]
        [string]$Level,
        [string]$Message
    )

    $prefix = switch ($Level) {
        "info" { "[KFMS]" }
        "ok" { "[ OK ]" }
        "warn" { "[WARN]" }
        "fail" { "[FAIL]" }
    }
    Write-Host "$prefix $Message"
}

function Get-JsonFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    return Get-Content $Path -Raw | ConvertFrom-Json
}

function Get-WorkspaceState {
    $status = git -C $script:Root status --porcelain 2>$null
    if (-not $status) {
        return "clean"
    }

    $generatedOnly = $true
    foreach ($line in $status) {
        if ($line.Length -lt 4) {
            continue
        }
        $path = $line.Substring(3).Trim()
        switch ($path) {
            "infra/meta/meta.json" { continue }
            "infra/telemetry/health.json" { continue }
            "infra/meta/CODENAME_REGISTRY.md" { continue }
            "docs/IMPLEMENTATION_PLAN.md" { continue }
            default {
                $generatedOnly = $false
                break
            }
        }
    }

    if ($generatedOnly) {
        return "generated-only"
    }
    return "manual-uncommitted"
}

function Get-LooseRootFileCount {
    $rootFiles = Get-ChildItem -LiteralPath $script:Root -File
    $count = 0
    foreach ($file in $rootFiles) {
        if ($file.Name -in @(".gitignore", ".gitattributes")) {
            continue
        }
        if ($file.Name -in $preserveFiles) {
            continue
        }
        $count++
    }
    return $count
}

function Test-DiffHygiene {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command "git").Source
    $psi.WorkingDirectory = $script:Root
    $psi.Arguments = "diff --check"
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return ($process.ExitCode -eq 0)
}

function Invoke-Gate {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [string]$Executable,
        [string[]]$Arguments,
        [string]$LogPath
    )

    if (-not (Get-Command $Executable -ErrorAction SilentlyContinue)) {
        return [pscustomobject]@{
            name = $Name
            status = "missing-tool"
            log = $LogPath
            message = "$Executable is not installed."
        }
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command $Executable).Source
    $psi.WorkingDirectory = $WorkingDirectory
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.Arguments = (($Arguments | ForEach-Object {
        if ($_ -match '\s') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }) -join ' ')

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()
    $exitCode = $process.ExitCode

    ($stdout + $stderr) | Out-File -FilePath $LogPath -Encoding utf8

    if ($exitCode -eq 0) {
        return [pscustomobject]@{
            name = $Name
            status = "pass"
            log = $LogPath
            message = ""
        }
    }

    return [pscustomobject]@{
        name = $Name
        status = "fail"
        log = $LogPath
        message = "$Name failed. See $($LogPath.Replace($script:Root + '\', '').Replace('\', '/'))"
    }
}

function Test-MetadataAlignment {
    $meta = Get-JsonFile $script:MetaPath
    $health = Get-JsonFile $script:HealthPath
    $plan = if (Test-Path $script:PlanPath) { Get-Content $script:PlanPath -Raw } else { "" }

    $errors = New-Object System.Collections.Generic.List[string]
    if (-not $meta) {
        $errors.Add("meta.json is missing.")
    }
    if (-not $health) {
        $errors.Add("health.json is missing.")
    }
    if (-not (Test-Path $script:PlanPath)) {
        $errors.Add("Implementation plan is missing.")
    } elseif ($plan -notmatch "KFMS:PLAN_SNAPSHOT:BEGIN") {
        $errors.Add("Implementation plan has no KFMS snapshot marker.")
    }

    if ($meta -and $health) {
        if ($health.version -ne $meta.version) {
            $errors.Add("health.json version does not match meta.json.")
        }
        if ($health.codename -ne $meta.codename.name) {
            $errors.Add("health.json codename does not match meta.json.")
        }
        if ($health.tag -ne $meta.tag) {
            $errors.Add("health.json tag does not match meta.json.")
        }
        if ($health.stamped_at_utc -ne $meta.build.built_at_utc) {
            $errors.Add("health.json stamped_at_utc does not match meta.json.")
        }
    }

    if ($meta -and $plan) {
        foreach ($expected in @($meta.version, $meta.codename.name, $meta.tag, $meta.build.built_at_utc)) {
            if ($plan -notmatch [regex]::Escape($expected)) {
                $errors.Add("Implementation plan snapshot is not synced to meta.json.")
                break
            }
        }
    }

    return [pscustomobject]@{
        ok = ($errors.Count -eq 0)
        errors = $errors
        meta = $meta
        health = $health
    }
}

New-Item -ItemType Directory -Force -Path $script:LogsDir | Out-Null

$metadata = Test-MetadataAlignment
$workspaceState = Get-WorkspaceState
$looseRootFiles = Get-LooseRootFileCount
$diffHygieneOk = Test-DiffHygiene

$cargoCheck = Invoke-Gate -Name "cargo check" -WorkingDirectory (Join-Path $script:Root "src-tauri") -Executable "cargo" -Arguments @("check") -LogPath (Join-Path $script:LogsDir "cargo-check.log")
$cargoTest = Invoke-Gate -Name "cargo test" -WorkingDirectory (Join-Path $script:Root "src-tauri") -Executable "cargo" -Arguments @("test") -LogPath (Join-Path $script:LogsDir "cargo-test.log")
$frontendBuild = Invoke-Gate -Name "frontend build" -WorkingDirectory $script:Root -Executable "npm.cmd" -Arguments @("run", "--prefix", "frontend", "build") -LogPath (Join-Path $script:LogsDir "frontend-build.log")

$blockers = New-Object System.Collections.Generic.List[string]
$score = 100

if (-not $metadata.ok) {
    $score -= 35
    foreach ($metadataError in $metadata.errors) {
        $blockers.Add($metadataError)
    }
}
if (-not $diffHygieneOk) {
    $score -= 20
    $blockers.Add("Whitespace or merge-marker issues exist in the working tree.")
}
if ($workspaceState -ne "clean") {
    $score -= 20
    $blockers.Add("Workspace is not clean: $workspaceState.")
}
if ($looseRootFiles -ne 0) {
    $score -= 10
    $blockers.Add("Loose root files are present outside the preserved set.")
}

foreach ($gate in @($cargoCheck, $cargoTest)) {
    switch ($gate.status) {
        "fail" {
            $score -= 25
            $blockers.Add($gate.message)
        }
        "missing-tool" {
            $score -= 25
            $blockers.Add($gate.message)
        }
    }
}

switch ($frontendBuild.status) {
    "fail" {
        $score -= 20
        $blockers.Add($frontendBuild.message)
    }
    "missing-tool" {
        $score -= 20
        $blockers.Add($frontendBuild.message)
    }
}

if ($score -lt 0) {
    $score = 0
}

$releaseState = "NO-GO"
if ($metadata.ok -and $diffHygieneOk -and $workspaceState -eq "clean" -and $looseRootFiles -eq 0 -and $cargoCheck.status -eq "pass" -and $cargoTest.status -eq "pass" -and $frontendBuild.status -eq "pass" -and $score -ge 85) {
    $releaseState = "GO"
} elseif ($score -ge 60) {
    $releaseState = "HOLD"
}

$summary = [pscustomobject]@{
    release_decision = $releaseState
    readiness_score = $score
    metadata = if ($metadata.ok) { "aligned" } else { "blocked" }
    diff_hygiene = if ($diffHygieneOk) { "pass" } else { "fail" }
    workspace_state = $workspaceState
    loose_root_files = $looseRootFiles
    cargo_check = $cargoCheck.status
    cargo_test = $cargoTest.status
    frontend_build = $frontendBuild.status
    blockers = $blockers
    stamped_at_utc = if ($metadata.meta) { $metadata.meta.build.built_at_utc } else { $null }
}

$summary | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $script:LogsDir "release-plan-summary.json") -Encoding utf8

if ($Json) {
    $summary | ConvertTo-Json -Depth 5
    exit $(if ($releaseState -eq "GO") { 0 } else { 1 })
}

Write-KfmsLine info "Running native Windows release gates..."
Write-Host ""
Write-Host "KHAOTIC LABS - KFMS RELEASE PLAN"
if ($releaseState -eq "GO") {
    Write-KfmsLine ok "release decision -> $releaseState"
} else {
    Write-KfmsLine warn "release decision -> $releaseState"
}
Write-KfmsLine ok "readiness score  -> $score/100"
Write-KfmsLine ok "metadata         -> $($summary.metadata)"
Write-KfmsLine ok "diff hygiene     -> $($summary.diff_hygiene)"
Write-KfmsLine ok "workspace state  -> $workspaceState"
Write-KfmsLine ok "loose root files -> $looseRootFiles"
Write-KfmsLine ok "cargo check      -> $($cargoCheck.status)"
Write-KfmsLine ok "cargo test       -> $($cargoTest.status)"
Write-KfmsLine ok "frontend build   -> $($frontendBuild.status)"

Write-Host ""
if ($blockers.Count -eq 0) {
    Write-KfmsLine ok "top blockers     -> none"
} else {
    Write-KfmsLine warn "top blockers:"
    foreach ($blocker in $blockers) {
        Write-KfmsLine warn "  - $blocker"
    }
}
Write-Host ""

exit $(if ($releaseState -eq "GO") { 0 } else { 1 })
