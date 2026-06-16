# PromptFlow wrapper for NEURODECK — Production Code Prompt System
# Usage: .\scripts\promptflow-run.ps1 <sequence> [provider]
# Sequences: audit, security, refactor, frontend, build, release, full

param(
    [string]$Sequence = "audit-only",
    [string]$Provider = "manual"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

$SeqMap = @{
    "audit"    = "audit-only"
    "security" = "security"
    "refactor" = "refactor"
    "frontend" = "frontend"
    "build"    = "build-repair"
    "release"  = "release-certification"
    "full"     = "full"
}

$FullSeq = if ($SeqMap.ContainsKey($Sequence)) { $SeqMap[$Sequence] } else { $Sequence }

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEURODECK PromptFlow — Sequence: $FullSeq" -ForegroundColor Cyan
Write-Host "  Provider: $Provider" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan

python -m promptflow run --sequence $FullSeq --provider $Provider
