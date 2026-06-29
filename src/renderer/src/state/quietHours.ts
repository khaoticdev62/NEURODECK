/**
 * Real quiet-hours window check (Epic X14, supplemental spec §43).
 * Handles the real overnight-wraparound case (e.g. 22:00–06:00) the
 * same way any real "do not disturb" window must: if `start > end`,
 * the window spans midnight, so "within" means *outside* the
 * complementary daytime range rather than a simple `start <= now <= end`.
 */
export function isWithinQuietHours(start: string, end: string, now: Date): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = toMinutes(start)
  const endMinutes = toMinutes(end)

  if (startMinutes === endMinutes) return false
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}
