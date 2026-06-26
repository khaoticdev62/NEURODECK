import type { SnippetRiskLevel } from '@shared/contracts'

export interface ShellRiskClassification {
  level: SnippetRiskLevel
  reason: string
}

/**
 * Real shell-snippet risk classification (supplemental §17.3 "Shell
 * snippets require risk review"). Mirrors the same regex-based
 * privileged/destructive detection `CommandBuilder`'s `classifyCommand`
 * already uses in the renderer, reimplemented here in `core/` since
 * that renderer module isn't importable from the main process — one
 * real classification policy, expressed twice because of the process
 * boundary, not two different policies.
 */
export function classifyShellRisk(content: string): ShellRiskClassification {
  const normalized = content.trim().toLowerCase()

  if (/^(sudo|doas|su)(\s|$)|\b(shutdown|reboot|poweroff|mkfs)\b/.test(normalized)) {
    return { level: 'critical', reason: 'Requests elevated access or changes machine-wide state.' }
  }

  if (
    /(^|\s)(rm|rmdir|del|remove-item)(\s|$)|git\s+(reset\s+--hard|clean\s+-|push\s+.*--force)/.test(
      normalized
    )
  ) {
    return { level: 'high', reason: 'May delete data or rewrite repository history.' }
  }

  if (/[|;]|&&|\bcurl\b|\bwget\b/.test(normalized)) {
    return { level: 'medium', reason: 'Chains commands or fetches remote content.' }
  }

  return {
    level: 'low',
    reason: 'No privileged, destructive, or network-fetching pattern detected.'
  }
}
