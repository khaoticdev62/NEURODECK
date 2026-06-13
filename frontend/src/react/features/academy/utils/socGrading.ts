import type { SocAlert, AlertDisposition, AlertGradeResult } from '../types';

/**
 * Deterministic SOC alert analysis grader.
 *
 * Score breakdown (100pts total):
 *   - Disposition  50pts  correct classification (TP/FP/Benign)
 *   - MITRE        25pts  any entered tag contains a correct base technique ID
 *   - Escalation   25pts  keyword coverage of escalation note
 *
 * For false-positive alerts: MITRE not required — full 25pts for any non-empty note.
 */
export function gradeAlertAnalysis(
  alert: SocAlert,
  disposition: AlertDisposition | '',
  mitreTags: string[],
  escalationNote: string,
): AlertGradeResult {
  // ── Disposition (50pts) ──────────────────────────────────────────────────
  const dispositionCorrect = disposition !== '' && disposition === alert.correctDisposition;
  const dispositionScore = dispositionCorrect ? 50 : 0;

  // ── MITRE (25pts) ────────────────────────────────────────────────────────
  let mitreScore: number;
  let mitreMapped: boolean;

  if (alert.correctMitreTechniques.length === 0) {
    // FP alert — no MITRE expected; credit for leaving it empty or noting N/A
    mitreMapped = true;
    mitreScore = 25;
  } else {
    const enteredText = mitreTags.join(' ').toLowerCase();
    mitreMapped = alert.correctMitreTechniques.some((tech) => {
      const base = tech.split('.')[0].toLowerCase();
      return enteredText.includes(base);
    });
    mitreScore = mitreMapped ? 25 : 0;
  }

  // ── Escalation note (25pts) ──────────────────────────────────────────────
  const normalized = escalationNote.toLowerCase().trim();
  const escalationScore = (() => {
    if (alert.escalationKeywords.length === 0) {
      return normalized ? 15 : 0;
    }
    const hits = alert.escalationKeywords.filter((kw) =>
      normalized.includes(kw.toLowerCase())
    );
    return Math.round((hits.length / alert.escalationKeywords.length) * 25);
  })();

  const score = dispositionScore + mitreScore + escalationScore;

  return {
    score,
    dispositionScore,
    mitreScore,
    escalationScore,
    dispositionCorrect,
    mitreMapped,
    feedback: buildFeedback(alert, disposition, dispositionCorrect, mitreMapped, score),
  };
}

function buildFeedback(
  alert: SocAlert,
  chosen: AlertDisposition | '',
  dispositionCorrect: boolean,
  mitreMapped: boolean,
  score: number,
): string {
  if (score >= 90) return 'Excellent analysis — disposition, technique, and escalation all accurate.';
  if (score >= 70) return 'Good — most elements correct. Review sample answer for what was missed.';

  const parts: string[] = [];
  if (!dispositionCorrect) {
    const correct = alert.correctDisposition.replace('-', ' ');
    const chosen_ = chosen ? chosen.replace('-', ' ') : 'not set';
    parts.push(`Disposition was ${chosen_} — correct answer is ${correct}.`);
  }
  if (!mitreMapped && alert.correctMitreTechniques.length > 0) {
    parts.push(`Missing MITRE technique — expected ${alert.correctMitreTechniques[0]}.`);
  }
  if (parts.length === 0) return 'Passing — escalation note needs more specific indicators.';
  return parts.join(' ');
}

export function alertScoreLabel(score: number): string {
  if (score >= 90) return 'Expert';
  if (score >= 75) return 'Proficient';
  if (score >= 50) return 'Developing';
  return 'Needs Work';
}

export function alertScoreTone(score: number): 'success' | 'accent' | 'warning' | 'danger' {
  if (score >= 75) return 'success';
  if (score >= 50) return 'accent';
  if (score >= 25) return 'warning';
  return 'danger';
}
