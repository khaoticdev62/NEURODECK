[CmdletBinding()]
param(
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$script:Root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$script:LogDir = Join-Path $script:Root ".loose/inbox/security-hardening"

function Add-Finding {
    param(
        $Findings,
        [ValidateSet("fail", "warn", "info")]
        [string]$Severity,
        [string]$Code,
        [string]$Message,
        [string]$Path = "",
        [int]$Line = 0,
        [string]$Evidence = ""
    )

    [void]$Findings.Add([pscustomobject]@{
        severity = $Severity
        code = $Code
        message = $Message
        path = $Path
        line = $Line
        evidence = $Evidence
    })
}

function Invoke-RgJson {
    param(
        [string]$Pattern,
        [string[]]$Targets,
        [string[]]$Globs = @(),
        [switch]$CaseInsensitive
    )

    $args = @("--json", "-n")
    if ($CaseInsensitive) {
        $args += @("-i")
    }
    $args += $Pattern
    foreach ($glob in $Globs) {
        $args += @("-g", $glob)
    }
    $args += $Targets
    $output = & rg @args 2>$null
    if (-not $output) {
        return @()
    }

    $matches = New-Object System.Collections.ArrayList
    foreach ($line in $output) {
        $event = $line | ConvertFrom-Json
        if ($event.type -ne "match") {
            continue
        }

        [void]$matches.Add([pscustomobject]@{
            path = $event.data.path.text.Replace("\", "/")
            line = [int]$event.data.line_number
            text = $event.data.lines.text.TrimEnd()
        })
    }
    return $matches
}

function Write-Utf8NoBomFile {
    param(
        [string]$Path,
        [string]$Content
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

New-Item -ItemType Directory -Force -Path $script:LogDir | Out-Null

$findings = New-Object System.Collections.ArrayList

# ── Electron Security Checks ────────────────────────────────────────────────
$electronMain = Join-Path $script:Root "electron/main.js"
$frontendIndex = Join-Path $script:Root "frontend/index.html"

if (Test-Path $electronMain) {
    $mainJs = Get-Content $electronMain -Raw
    if ($mainJs -notmatch "contextIsolation:\s*true") {
        Add-Finding -Findings $findings -Severity fail -Code "electron-context-isolation" -Message "Electron main.js must set contextIsolation: true in webPreferences." -Path "electron/main.js"
    }
    if ($mainJs -notmatch "nodeIntegration:\s*false") {
        Add-Finding -Findings $findings -Severity fail -Code "electron-node-integration" -Message "Electron main.js must set nodeIntegration: false in webPreferences." -Path "electron/main.js"
    }
    if ($mainJs -notmatch "webSecurity:\s*true") {
        Add-Finding -Findings $findings -Severity warn -Code "electron-web-security" -Message "Electron main.js should set webSecurity: true in webPreferences." -Path "electron/main.js"
    }
} else {
    Add-Finding -Findings $findings -Severity fail -Code "electron-main-missing" -Message "electron/main.js not found." -Path "electron/main.js"
}

if (Test-Path $frontendIndex) {
    $indexHtml = Get-Content $frontendIndex -Raw
    if ($indexHtml -notmatch '<meta[^>]+http-equiv=["'']Content-Security-Policy["'']') {
        Add-Finding -Findings $findings -Severity fail -Code "csp-missing" -Message "frontend/index.html must include a Content-Security-Policy meta tag." -Path "frontend/index.html"
    } elseif ($indexHtml -notmatch "object-src\s+'none'") {
        Add-Finding -Findings $findings -Severity fail -Code "csp-object-src" -Message "CSP must explicitly disable object/embed execution with object-src 'none'." -Path "frontend/index.html"
    }
} else {
    Add-Finding -Findings $findings -Severity fail -Code "index-html-missing" -Message "frontend/index.html not found." -Path "frontend/index.html"
}

$remoteScriptMatches = Invoke-RgJson -Pattern '(<script[^>]+src=["'']https?://|script\.src\s*=\s*["'']https?://|https://cdn\.jsdelivr\.net/npm/monaco-editor)' -Targets @("frontend/src", "frontend/public") -Globs @("!frontend/dist") -CaseInsensitive
foreach ($match in $remoteScriptMatches) {
    Add-Finding -Findings $findings -Severity fail -Code "remote-script-dependency" -Message "Remote script dependency detected in shipped frontend code." -Path $match.path -Line $match.line -Evidence $match.text
}

$remoteStyleMatches = Invoke-RgJson -Pattern '(@import\s+url\(["'']https?://|<link[^>]+href=["'']https?://)' -Targets @("frontend/src", "frontend/public", "frontend/index.html") -Globs @("!frontend/dist") -CaseInsensitive
foreach ($match in $remoteStyleMatches) {
    Add-Finding -Findings $findings -Severity warn -Code "remote-style-dependency" -Message "Remote stylesheet or font dependency detected. Prefer bundled assets for offline and integrity-safe builds." -Path $match.path -Line $match.line -Evidence $match.text
}

$evalMatches = Invoke-RgJson -Pattern '\beval\s*\(|new\s+Function\s*\(' -Targets @("frontend/src", "frontend/public", "scripts") -Globs @("!frontend/dist", "!scripts/kfms/security_audit.py")
foreach ($match in $evalMatches) {
    Add-Finding -Findings $findings -Severity fail -Code "dynamic-js-eval" -Message "Dynamic JavaScript evaluation detected." -Path $match.path -Line $match.line -Evidence $match.text
}

$dangerHtmlMatches = Invoke-RgJson -Pattern 'dangerouslySetInnerHTML' -Targets @("frontend/src", "frontend/public") -Globs @("!frontend/dist")
foreach ($match in $dangerHtmlMatches) {
    if ($match.text -match 'sanitizeRenderedHtml|sanitizeHtml') {
        Add-Finding -Findings $findings -Severity warn -Code "dangerous-html-reviewed" -Message "dangerouslySetInnerHTML is present but wrapped in a sanitizer. Keep this path under manual review." -Path $match.path -Line $match.line -Evidence $match.text
    } elseif ($match.text -notmatch '^\s*\{/\*') {
        Add-Finding -Findings $findings -Severity fail -Code "dangerous-html" -Message "dangerouslySetInnerHTML detected in frontend code." -Path $match.path -Line $match.line -Evidence $match.text
    }
}

$privateKeyMatches = Invoke-RgJson -Pattern 'BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY|ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}' -Targets @(".") -Globs @("!.git", "!.loose", "!frontend/dist", "!target", "!node_modules", "!**/tests/**", "!**/*test*.py")
foreach ($match in $privateKeyMatches) {
    Add-Finding -Findings $findings -Severity fail -Code "secret-material" -Message "Probable secret or private key material detected in tracked source." -Path $match.path -Line $match.line -Evidence $match.text
}

$httpMatches = Invoke-RgJson -Pattern 'http://' -Targets @("frontend/src", "frontend/public", "src-tauri") -Globs @("!frontend/dist")
$httpMatches = @($httpMatches | Where-Object {
    $_.text -notmatch 'http://localhost' -and
    $_.text -notmatch 'http://127\.0\.0\.1' -and
    $_.text -notmatch 'http://www\.w3\.org/2000/svg' -and
    $_.text -notmatch 'schemas\.microsoft\.com/wix/2006/wi'
})
foreach ($match in ($httpMatches | Where-Object { $_.text -notmatch 'http://www\.w3\.org/2000/svg' -and $_.path -notmatch 'frontend/src/assets/fonts/OFL\.txt' -and $_.text -notmatch 'starts_with\("http://' })) {
    if ($match.path -match 'src-tauri/src/remote_control\.rs') {
        Add-Finding -Findings $findings -Severity warn -Code "plaintext-transport-review" -Message "Remote control currently advertises plain HTTP on the LAN. Confirm the PIN gate and trust boundary remain acceptable." -Path $match.path -Line $match.line -Evidence $match.text
        continue
    }
    Add-Finding -Findings $findings -Severity fail -Code "plain-http" -Message "Non-localhost plain HTTP reference detected." -Path $match.path -Line $match.line -Evidence $match.text
}

$innerHtmlMatches = Invoke-RgJson -Pattern '\.innerHTML\s*=' -Targets @("frontend/src") -Globs @("!frontend/dist")
$innerHtmlReview = @($innerHtmlMatches | Where-Object {
    $_.text -notmatch 'sanitizeHtml' -and
    $_.text -notmatch 'createIcon' -and
    $_.text -notmatch '=\s*""' -and
    $_.text -notmatch "=\s*''"
})
if ($innerHtmlReview.Count -gt 0) {
    Add-Finding -Findings $findings -Severity warn -Code "innerhtml-review" -Message ("{0} innerHTML write sites require manual review for sanitization discipline." -f $innerHtmlReview.Count) -Path $innerHtmlReview[0].path -Line $innerHtmlReview[0].line -Evidence $innerHtmlReview[0].text
}

$commandMatches = Invoke-RgJson -Pattern 'std::process::Command::new\(|\bCommand::new\("cmd(\.exe)?"\)|\bCommand::new\("sh"\)' -Targets @("src-tauri/src", "scripts") -Globs @("!frontend/dist")
if ($commandMatches.Count -gt 0) {
    Add-Finding -Findings $findings -Severity warn -Code "process-spawn-review" -Message ("{0} process-spawn sites exist and should stay under explicit validation review." -f $commandMatches.Count) -Path $commandMatches[0].path -Line $commandMatches[0].line -Evidence $commandMatches[0].text
}

$failCount = @($findings | Where-Object severity -eq "fail").Count
$warnCount = @($findings | Where-Object severity -eq "warn").Count
$summary = [pscustomobject]@{
    status = $(if ($failCount -eq 0) { "pass" } else { "fail" })
    fail_count = $failCount
    warn_count = $warnCount
    findings = @($findings)
    checked_at_utc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$summaryJson = $summary | ConvertTo-Json -Depth 6
Write-Utf8NoBomFile -Path (Join-Path $script:LogDir "security-hardening-summary.json") -Content $summaryJson

if ($Json) {
    $summaryJson
    exit $(if ($failCount -eq 0) { 0 } else { 1 })
}

Write-Host ""
Write-Host "NEURODECK SECURITY HARDENING"
Write-Host ""
Write-Host ("status    : {0}" -f $summary.status)
Write-Host ("failures  : {0}" -f $failCount)
Write-Host ("warnings  : {0}" -f $warnCount)
Write-Host ""
foreach ($finding in $findings) {
    $location = if ($finding.path) {
        if ($finding.line -gt 0) { "$($finding.path):$($finding.line)" } else { $finding.path }
    } else {
        "n/a"
    }
    Write-Host ("[{0}] {1} :: {2} ({3})" -f $finding.severity.ToUpperInvariant(), $finding.code, $finding.message, $location)
}

exit $(if ($failCount -eq 0) { 0 } else { 1 })
