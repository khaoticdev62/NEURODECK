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
    ".gitignore",
    ".gitattributes",
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
    "pyproject.toml",
    "uv.lock",
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

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Get-JsonFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        return $null
    }
    return Get-Content $Path -Raw | ConvertFrom-Json
}

function Get-ReleasePolicy {
    $meta = Get-JsonFile $script:MetaPath
    $policy = $null
    if ($meta -and $meta.studio -and $meta.studio.governance) {
        $policy = $meta.studio.governance.release_policy
    }

    if (-not $policy) {
        return [pscustomobject]@{
            go_threshold = 85
            hold_threshold = 60
            penalties = [pscustomobject]@{
                metadata = 35
                diff_hygiene = 20
                workspace_state = 20
                loose_root_files = 10
                hardening_check = 30
                cargo_check = 25
                cargo_test = 25
                frontend_build = 20
            }
        }
    }

    return $policy
}

function Get-RelativePath {
    param([string]$Path)
    return $Path.Replace($script:Root + [IO.Path]::DirectorySeparatorChar, "").Replace("\", "/")
}

function ConvertTo-CanonicalJson {
    param([object]$Value)
    return ($Value | ConvertTo-Json -Depth 8 -Compress)
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

    $startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $watch = [System.Diagnostics.Stopwatch]::StartNew()

    if (-not (Get-Command $Executable -ErrorAction SilentlyContinue)) {
        $watch.Stop()
        Write-Utf8NoBomFile -Path $LogPath -Content "$Executable is not installed.`n"
        return [pscustomobject]@{
            name = $Name
            status = "missing-tool"
            log_path = (Get-RelativePath $LogPath)
            message = "$Executable is not installed."
            duration_ms = [int]$watch.ElapsedMilliseconds
            started_at_utc = $startedAt
            finished_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
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
    $watch.Stop()

    Write-Utf8NoBomFile -Path $LogPath -Content ($stdout + $stderr)

    if ($exitCode -eq 0) {
        return [pscustomobject]@{
            name = $Name
            status = "pass"
            log_path = (Get-RelativePath $LogPath)
            message = ""
            duration_ms = [int]$watch.ElapsedMilliseconds
            started_at_utc = $startedAt
            finished_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
    }

    return [pscustomobject]@{
        name = $Name
        status = "fail"
        log_path = (Get-RelativePath $LogPath)
        message = "$Name failed. See $(Get-RelativePath $LogPath)"
        duration_ms = [int]$watch.ElapsedMilliseconds
        started_at_utc = $startedAt
        finished_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
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
        if ($meta.studio.governance.release_policy) {
            if (-not $health.release_plan) {
                $errors.Add("health.json release_plan is missing.")
            } elseif ((ConvertTo-CanonicalJson $health.release_plan.policy) -ne (ConvertTo-CanonicalJson $meta.studio.governance.release_policy)) {
                $errors.Add("health.json release_plan policy does not match meta.json.")
            }
        }
    }

    $policy = $meta.studio.governance.release_policy
    if (-not $policy) {
        $errors.Add("meta.json release policy is missing.")
    } else {
        if ($policy.hold_threshold -gt $policy.go_threshold) {
            $errors.Add("release_policy.hold_threshold must be <= go_threshold.")
        }
        foreach ($name in @("metadata", "diff_hygiene", "workspace_state", "loose_root_files", "hardening_check", "cargo_check", "cargo_test", "frontend_build")) {
            if ($null -eq $policy.penalties.$name) {
                $errors.Add("release_policy.penalties.$name is missing.")
            }
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
$policy = Get-ReleasePolicy

$overallWatch = [System.Diagnostics.Stopwatch]::StartNew()
$hardeningCheck = Invoke-Gate -Name "security hardening" -WorkingDirectory $script:Root -Executable "powershell.exe" -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Join-Path $script:Root "scripts/security-hardening.ps1"), "-Json") -LogPath (Join-Path $script:LogsDir "security-hardening.log")
$cargoCheck = Invoke-Gate -Name "cargo check" -WorkingDirectory (Join-Path $script:Root "src-tauri") -Executable "cargo" -Arguments @("check") -LogPath (Join-Path $script:LogsDir "cargo-check.log")
$cargoTest = Invoke-Gate -Name "cargo test" -WorkingDirectory (Join-Path $script:Root "src-tauri") -Executable "cargo" -Arguments @("test") -LogPath (Join-Path $script:LogsDir "cargo-test.log")
$frontendBuild = Invoke-Gate -Name "frontend build" -WorkingDirectory $script:Root -Executable "npm.cmd" -Arguments @("run", "--prefix", "frontend", "build") -LogPath (Join-Path $script:LogsDir "frontend-build.log")
$overallWatch.Stop()

$blockers = New-Object System.Collections.Generic.List[string]
$score = 100

if (-not $metadata.ok) {
    $score -= [int]$policy.penalties.metadata
    foreach ($metadataError in $metadata.errors) {
        $blockers.Add($metadataError)
    }
}
if (-not $diffHygieneOk) {
    $score -= [int]$policy.penalties.diff_hygiene
    $blockers.Add("Whitespace or merge-marker issues exist in the working tree.")
}
if ($workspaceState -ne "clean") {
    $score -= [int]$policy.penalties.workspace_state
    $blockers.Add("Workspace is not clean: $workspaceState.")
}
if ($looseRootFiles -ne 0) {
    $score -= [int]$policy.penalties.loose_root_files
    $blockers.Add("Loose root files are present outside the preserved set.")
}
switch ($hardeningCheck.status) {
    "fail" {
        $score -= [int]$policy.penalties.hardening_check
        $blockers.Add($hardeningCheck.message)
    }
    "missing-tool" {
        $score -= [int]$policy.penalties.hardening_check
        $blockers.Add($hardeningCheck.message)
    }
}

foreach ($gate in @($cargoCheck, $cargoTest)) {
    switch ($gate.status) {
        "fail" {
            $gateKey = ($gate.name -replace '[^a-zA-Z0-9]+', '_')
            $score -= [int]$policy.penalties.$gateKey
            $blockers.Add($gate.message)
        }
        "missing-tool" {
            $gateKey = ($gate.name -replace '[^a-zA-Z0-9]+', '_')
            $score -= [int]$policy.penalties.$gateKey
            $blockers.Add($gate.message)
        }
    }
}

switch ($frontendBuild.status) {
    "fail" {
        $score -= [int]$policy.penalties.frontend_build
        $blockers.Add($frontendBuild.message)
    }
    "missing-tool" {
        $score -= [int]$policy.penalties.frontend_build
        $blockers.Add($frontendBuild.message)
    }
}

if ($score -lt 0) {
    $score = 0
}

$releaseState = "NO-GO"
if ($metadata.ok -and $diffHygieneOk -and $workspaceState -eq "clean" -and $looseRootFiles -eq 0 -and $hardeningCheck.status -eq "pass" -and $cargoCheck.status -eq "pass" -and $cargoTest.status -eq "pass" -and $frontendBuild.status -eq "pass" -and $score -ge [int]$policy.go_threshold) {
    $releaseState = "GO"
} elseif ($score -ge [int]$policy.hold_threshold) {
    $releaseState = "HOLD"
}

$summary = [pscustomobject]@{
    release_decision = $releaseState
    readiness_score = $score
    policy = $policy
    metadata = if ($metadata.ok) { "aligned" } else { "blocked" }
    diff_hygiene = if ($diffHygieneOk) { "pass" } else { "fail" }
    workspace_state = $workspaceState
    loose_root_files = $looseRootFiles
    hardening_check = $hardeningCheck.status
    cargo_check = $cargoCheck.status
    cargo_test = $cargoTest.status
    frontend_build = $frontendBuild.status
    gates = @($hardeningCheck, $cargoCheck, $cargoTest, $frontendBuild)
    blockers = $blockers
    duration_ms = [int]$overallWatch.ElapsedMilliseconds
    stamped_at_utc = if ($metadata.meta) { $metadata.meta.build.built_at_utc } else { $null }
}

$healthDocument = Get-JsonFile $script:HealthPath
if (-not $healthDocument) {
    $healthDocument = [pscustomobject]@{}
}

$gateSummary = "hardening_check=$($hardeningCheck.status),cargo_check=$($cargoCheck.status),cargo_test=$($cargoTest.status),frontend_build=$($frontendBuild.status)"
$healthDocument | Add-Member -NotePropertyName release_plan -NotePropertyValue ([pscustomobject]@{
    release_decision = $releaseState
    readiness_score = $score
    policy = $policy
    gate_summary = $gateSummary
    metadata = $summary.metadata
    diff_hygiene = $summary.diff_hygiene
    workspace_state = $workspaceState
    loose_root_files = $looseRootFiles
    hardening_check = $hardeningCheck.status
    cargo_check = $cargoCheck.status
    cargo_test = $cargoTest.status
    frontend_build = $frontendBuild.status
    gates = @($hardeningCheck, $cargoCheck, $cargoTest, $frontendBuild)
    blockers = @($blockers)
    duration_ms = [int]$overallWatch.ElapsedMilliseconds
    checked_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}) -Force

$healthJson = $healthDocument | ConvertTo-Json -Depth 8
$summaryJson = $summary | ConvertTo-Json -Depth 5
Write-Utf8NoBomFile -Path $script:HealthPath -Content $healthJson
Write-Utf8NoBomFile -Path (Join-Path $script:LogsDir "release-plan-summary.json") -Content $summaryJson

if ($Json) {
    $summaryJson
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
Write-KfmsLine ok "policy           -> go=$($policy.go_threshold) | hold=$($policy.hold_threshold)"
Write-KfmsLine ok "hardening check  -> $($hardeningCheck.status)"
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
