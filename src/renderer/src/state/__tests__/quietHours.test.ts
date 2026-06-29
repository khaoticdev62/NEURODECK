import { describe, expect, it } from 'vitest'
import { isWithinQuietHours } from '../quietHours'

function at(hours: number, minutes: number): Date {
  const date = new Date(2026, 0, 1, hours, minutes)
  return date
}

describe('isWithinQuietHours', () => {
  it('handles a real same-day window (e.g. 13:00-17:00)', () => {
    expect(isWithinQuietHours('13:00', '17:00', at(12, 59))).toBe(false)
    expect(isWithinQuietHours('13:00', '17:00', at(13, 0))).toBe(true)
    expect(isWithinQuietHours('13:00', '17:00', at(16, 59))).toBe(true)
    expect(isWithinQuietHours('13:00', '17:00', at(17, 0))).toBe(false)
  })

  it('handles a real overnight window that wraps past midnight (22:00-07:00)', () => {
    expect(isWithinQuietHours('22:00', '07:00', at(21, 59))).toBe(false)
    expect(isWithinQuietHours('22:00', '07:00', at(22, 0))).toBe(true)
    expect(isWithinQuietHours('22:00', '07:00', at(23, 30))).toBe(true)
    expect(isWithinQuietHours('22:00', '07:00', at(0, 0))).toBe(true)
    expect(isWithinQuietHours('22:00', '07:00', at(6, 59))).toBe(true)
    expect(isWithinQuietHours('22:00', '07:00', at(7, 0))).toBe(false)
  })

  it('treats an identical start and end time as never active', () => {
    expect(isWithinQuietHours('09:00', '09:00', at(9, 0))).toBe(false)
    expect(isWithinQuietHours('09:00', '09:00', at(12, 0))).toBe(false)
  })
})
