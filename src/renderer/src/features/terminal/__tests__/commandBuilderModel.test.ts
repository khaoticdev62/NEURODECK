import { describe, expect, it } from 'vitest'
import { classifyCommand, serializeCommand, toolIdForRisk } from '../commandBuilderModel'

describe('commandBuilderModel', () => {
  it('serializes values and paths without allowing them to become shell operators', () => {
    const command = serializeCommand(
      [
        { id: '1', type: 'program', value: 'git' },
        { id: '2', type: 'subcommand', value: 'add' },
        { id: '3', type: 'path', value: 'docs/my file.md' },
        { id: '4', type: 'value', value: '&& rm -rf /' }
      ],
      'bash'
    )
    expect(command).toBe("git add 'docs/my file.md' '&& rm -rf /'")
  })

  it('allows only enumerated operator block values', () => {
    expect(
      serializeCommand(
        [
          { id: '1', type: 'program', value: 'echo' },
          { id: '2', type: 'pipe', value: '; rm -rf /' },
          { id: '3', type: 'pipe', value: '|' },
          { id: '4', type: 'program', value: 'grep' }
        ],
        'bash'
      )
    ).toBe('echo | grep')
  })

  it('classifies privileged, destructive, external, and local commands deterministically', () => {
    expect(classifyCommand('sudo apt update')).toMatchObject({
      level: 'critical',
      privileged: true
    })
    expect(classifyCommand('git reset --hard HEAD')).toMatchObject({ level: 'high' })
    expect(classifyCommand('npm install zod')).toMatchObject({ level: 'medium' })
    const local = classifyCommand('git status')
    expect(local).toMatchObject({ level: 'low', privileged: false })
    expect(toolIdForRisk(local)).toBe('terminal-command-low')
  })

  it('uses shell-specific environment syntax', () => {
    const block = [{ id: '1', type: 'environment' as const, value: 'NODE_ENV=test mode' }]
    expect(serializeCommand(block, 'bash')).toBe("NODE_ENV='test mode'")
    expect(serializeCommand(block, 'powershell.exe')).toBe("$env:NODE_ENV='test mode';")
    expect(serializeCommand(block, 'cmd.exe')).toBe('set "NODE_ENV=test mode" &&')
  })
})
