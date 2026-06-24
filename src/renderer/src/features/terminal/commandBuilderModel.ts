import type { RiskLevel } from '../../ai-safety/contracts/plan'

export const COMMAND_BLOCK_TYPES = [
  'program',
  'subcommand',
  'flag',
  'value',
  'path',
  'pipe',
  'redirect',
  'conditional',
  'environment'
] as const

export type CommandBlockType = (typeof COMMAND_BLOCK_TYPES)[number]

export interface CommandBlock {
  id: string
  type: CommandBlockType
  value: string
}

export type CommandRisk = {
  level: RiskLevel
  label: string
  reason: string
  privileged: boolean
}

export interface CommandProposal {
  blocks: Array<Omit<CommandBlock, 'id'>>
  explanation: string
}

const OPERATORS: Partial<Record<CommandBlockType, readonly string[]>> = {
  pipe: ['|'],
  redirect: ['>', '>>'],
  conditional: ['&&', '||']
}

export function serializeCommand(blocks: CommandBlock[], shell: string): string {
  return blocks
    .map((block) => serializeBlock(block, shell))
    .filter(Boolean)
    .join(' ')
}

export function classifyCommand(command: string): CommandRisk {
  const normalized = command.trim().toLowerCase()
  if (/^(sudo|doas|su)(\s|$)|\b(shutdown|reboot|poweroff|mkfs)\b/.test(normalized)) {
    return {
      level: 'critical',
      label: 'Privileged',
      reason: 'Requests elevated access or changes machine-wide state.',
      privileged: true
    }
  }
  if (
    /(^|\s)(rm|rmdir|del|remove-item)(\s|$)|git\s+(reset\s+--hard|clean\s+-|push\s+.*--force)/.test(
      normalized
    )
  ) {
    return {
      level: 'high',
      label: 'Destructive',
      reason: 'May delete data or rewrite repository history.',
      privileged: false
    }
  }
  if (
    /\b(curl|wget|ssh|scp|npm\s+(install|publish)|cargo\s+install|pip\s+install)\b/.test(normalized)
  ) {
    return {
      level: 'medium',
      label: 'External effect',
      reason: 'Uses the network, installs software, or contacts another system.',
      privileged: false
    }
  }
  return {
    level: 'low',
    label: 'Local',
    reason: 'No known destructive, privileged, or network pattern was detected.',
    privileged: false
  }
}

export function toolIdForRisk(risk: CommandRisk): string {
  if (risk.privileged) return 'terminal-command-privileged'
  return `terminal-command-${risk.level}`
}

/** Headless variant of `toolIdForRisk` — runs without an attached PTY session and captures output instead of writing it to one. */
export function headlessToolIdForRisk(risk: CommandRisk): string {
  if (risk.privileged) return 'terminal-headless-privileged'
  return `terminal-headless-${risk.level}`
}

export function parseCommandProposal(raw: string): CommandProposal {
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    throw new Error('The model did not return a JSON command proposal.')
  }
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Partial<CommandProposal>
  if (!Array.isArray(parsed.blocks) || parsed.blocks.length === 0 || parsed.blocks.length > 20) {
    throw new Error('The command proposal must include 1-20 structured blocks.')
  }
  const blocks = parsed.blocks.map((block) => {
    if (!COMMAND_BLOCK_TYPES.includes(block.type)) {
      throw new Error('The command proposal included an unsupported block type.')
    }
    if (typeof block.value !== 'string' || !block.value.trim()) {
      throw new Error('Every proposed command block must include a value.')
    }
    return { type: block.type, value: block.value }
  })
  return {
    blocks,
    explanation:
      typeof parsed.explanation === 'string' && parsed.explanation.trim()
        ? parsed.explanation.trim()
        : 'Model proposed a structured command.'
  }
}

function serializeBlock(block: CommandBlock, shell: string): string {
  const value = block.value.trim()
  if (!value) return ''
  const allowedOperators = OPERATORS[block.type]
  if (allowedOperators) return allowedOperators.includes(value) ? value : ''
  if (block.type === 'environment') return serializeEnvironment(value, shell)
  if (block.type === 'program' || block.type === 'subcommand' || block.type === 'flag') {
    return /^[a-zA-Z0-9_@%+=:,./-]+$/.test(value) ? value : quote(value, shell)
  }
  return quote(value, shell)
}

function serializeEnvironment(value: string, shell: string): string {
  const separator = value.indexOf('=')
  if (separator <= 0) return ''
  const name = value.slice(0, separator)
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return ''
  const environmentValue = value.slice(separator + 1)
  const normalizedShell = shell.toLowerCase()
  if (normalizedShell.includes('powershell') || normalizedShell.includes('pwsh')) {
    return `$env:${name}=${quote(environmentValue, shell)};`
  }
  if (normalizedShell.includes('cmd')) {
    const escaped = environmentValue.replaceAll('"', '""').replaceAll('%', '%%')
    return `set "${name}=${escaped}" &&`
  }
  return `${name}=${quote(environmentValue, shell)}`
}

function quote(value: string, shell: string): string {
  const normalizedShell = shell.toLowerCase()
  if (normalizedShell.includes('powershell') || normalizedShell.includes('pwsh')) {
    return `'${value.replaceAll("'", "''")}'`
  }
  if (normalizedShell.includes('cmd')) {
    return `"${value.replaceAll('"', '""').replaceAll('%', '%%')}"`
  }
  return `'${value.replaceAll("'", "'\\''")}'`
}
