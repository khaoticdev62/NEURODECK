export function fuzzyScore(query: string, label: string): number {
  const q = query.toLowerCase();
  const l = label.toLowerCase();
  if (l.startsWith(q)) return 100;
  let qi = 0;
  for (const ch of l) if (ch === q[qi]) qi++;
  return qi === q.length ? 60 + qi : 0;
}
