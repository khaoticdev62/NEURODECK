param(
  [int[]]$Ports = @(1420, 1421, 1430, 1431, 5173, 4173),
  [switch]$IncludeWorkspaceHelpers = $true
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $scriptRoot
$workspaceRootLower = $workspaceRoot.ToLowerInvariant()

$processCommandLines = @{}
try {
  foreach ($procInfo in Get-CimInstance Win32_Process -ErrorAction Stop) {
    $processCommandLines[[int]$procInfo.ProcessId] = [string]$procInfo.CommandLine
  }
} catch {
  Write-Warning "[auto-kill] unable to snapshot process command lines: $($_.Exception.Message)"
}

function Stop-TrackedProcess {
  param(
    [int]$ProcessId,
    [string]$Reason
  )

  try {
    $proc = Get-Process -Id $ProcessId -ErrorAction Stop
  } catch {
    return $null
  }

  Write-Host "[auto-kill] stopping pid=$ProcessId name=$($proc.ProcessName) reason=$Reason"

  try {
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
  } catch {
    Write-Warning "[auto-kill] failed to stop pid=${ProcessId}: $($_.Exception.Message)"
    return $null
  }

  return [pscustomobject]@{
    pid    = $ProcessId
    name   = $proc.ProcessName
    reason = $Reason
  }
}

function Is-WorkspaceDevHelper {
  param(
    [System.Diagnostics.Process]$Process,
    [string]$CommandLine
  )

  $commandLineText = if ($null -eq $CommandLine) { "" } else { [string]$CommandLine }
  $commandLineLower = $commandLineText.ToLowerInvariant()
  if (-not $commandLineLower.Contains($workspaceRootLower)) {
    return $false
  }

  $helperName = $Process.ProcessName.ToLowerInvariant()
  if ($helperName -notin @("node", "cargo", "rustc", "powershell", "cmd")) {
    return $false
  }

  return (
    $commandLineLower.Contains("tauri dev") -or
    $commandLineLower.Contains("vite") -or
    $commandLineLower.Contains("frontend\\src") -or
    $commandLineLower.Contains("src-tauri")
  )
}

$killed = New-Object System.Collections.Generic.List[object]
$seen = New-Object "System.Collections.Generic.HashSet[int]"

try {
  $listeners = Get-NetTCPConnection -State Listen -ErrorAction Stop |
    Where-Object { $_.LocalPort -in $Ports }
} catch {
  Write-Warning "[auto-kill] unable to inspect listening ports: $($_.Exception.Message)"
  $listeners = @()
}

foreach ($listener in $listeners) {
  $targetPid = [int]$listener.OwningProcess
  if ($seen.Contains($targetPid)) {
    continue
  }

  $seen.Add($targetPid) | Out-Null
  $reason = "listener on port $($listener.LocalPort)"
  $stopped = Stop-TrackedProcess -ProcessId $targetPid -Reason $reason
  if ($null -ne $stopped) {
    $killed.Add($stopped)
  }
}

if ($IncludeWorkspaceHelpers) {
  foreach ($proc in Get-Process -ErrorAction SilentlyContinue) {
    if ($seen.Contains($proc.Id)) {
      continue
    }

    $commandLine = $processCommandLines[$proc.Id]
    if (-not (Is-WorkspaceDevHelper -Process $proc -CommandLine $commandLine)) {
      continue
    }

    $seen.Add($proc.Id) | Out-Null
    $stopped = Stop-TrackedProcess -ProcessId $proc.Id -Reason "stale workspace dev helper"
    if ($null -ne $stopped) {
      $killed.Add($stopped)
    }
  }
}

if ($killed.Count -eq 0) {
  Write-Host "[auto-kill] no stale dev listeners found"
  exit 0
}

Write-Host "[auto-kill] cleared $($killed.Count) stale process(es)"
