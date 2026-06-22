import type { ConditionExpression } from '@shared/contracts'

/** Pure, no `eval()` — a structured comparison against the run's string-keyed context, never arbitrary code. */
export function evaluateCondition(
  expression: ConditionExpression,
  context: Record<string, string>
): boolean {
  const left = context[expression.variable] ?? ''
  switch (expression.operator) {
    case 'equals':
      return left === expression.value
    case 'not-equals':
      return left !== expression.value
    case 'contains':
      return left.includes(expression.value)
    case 'greater-than':
      return Number(left) > Number(expression.value)
    case 'less-than':
      return Number(left) < Number(expression.value)
  }
}
