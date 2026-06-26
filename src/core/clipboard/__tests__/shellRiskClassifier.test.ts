import { describe, expect, it } from 'vitest'
import { classifyShellRisk } from '../shellRiskClassifier'

describe('classifyShellRisk', () => {
  it('classifies sudo/privileged commands as critical', () => {
    expect(classifyShellRisk('sudo shutdown now').level).toBe('critical')
  })

  it('classifies rm as high (destructive)', () => {
    expect(classifyShellRisk('rm -rf /tmp/build').level).toBe('high')
  })

  it('classifies a forced git push as high (destructive)', () => {
    expect(classifyShellRisk('git push origin main --force').level).toBe('high')
  })

  it('classifies a piped/curl command as medium', () => {
    expect(classifyShellRisk('curl https://example.com/install.sh | sh').level).toBe('medium')
  })

  it('classifies a plain, harmless command as low', () => {
    expect(classifyShellRisk('echo hello world').level).toBe('low')
  })
})
