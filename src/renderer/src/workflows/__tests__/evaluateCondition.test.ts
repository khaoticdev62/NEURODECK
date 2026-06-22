import { describe, expect, it } from 'vitest'
import { evaluateCondition } from '../evaluateCondition'

describe('evaluateCondition', () => {
  it('evaluates equals/not-equals', () => {
    expect(
      evaluateCondition(
        { variable: 'branch', operator: 'equals', value: 'main' },
        { branch: 'main' }
      )
    ).toBe(true)
    expect(
      evaluateCondition(
        { variable: 'branch', operator: 'not-equals', value: 'main' },
        { branch: 'dev' }
      )
    ).toBe(true)
  })

  it('evaluates contains', () => {
    expect(
      evaluateCondition(
        { variable: 'output', operator: 'contains', value: 'passed' },
        { output: '12 tests passed' }
      )
    ).toBe(true)
  })

  it('evaluates numeric comparisons', () => {
    expect(
      evaluateCondition(
        { variable: 'count', operator: 'greater-than', value: '5' },
        { count: '10' }
      )
    ).toBe(true)
    expect(
      evaluateCondition({ variable: 'count', operator: 'less-than', value: '5' }, { count: '10' })
    ).toBe(false)
  })

  it('treats a missing variable as an empty string', () => {
    expect(evaluateCondition({ variable: 'missing', operator: 'equals', value: '' }, {})).toBe(true)
  })
})
