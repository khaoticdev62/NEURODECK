import type { LabTask } from "../types";

export interface GradeResult {
  score: number; // 0–100
  passed: boolean; // score >= 60
  matchedKeywords: string[];
  missedKeywords: string[];
  feedback: string;
}

/**
 * Deterministic keyword + regex grader.
 *
 * Scoring breakdown:
 *   - Keyword portion (80 pts max): (matched / total) × 80
 *   - Pattern portion (20 pts max): (matched patterns / total patterns) × 20
 *   - If a task has no keywords, 60 pts are granted for any non-empty answer
 *   - If a task has no patterns, the full 20 pattern pts are granted
 */
export function gradeAnswer(task: LabTask, answer: string): GradeResult {
  const normalizedAnswer = answer.toLowerCase().trim();

  if (!normalizedAnswer) {
    return {
      score: 0,
      passed: false,
      matchedKeywords: [],
      missedKeywords: task.gradingKeywords,
      feedback: "No answer provided.",
    };
  }

  // ── Keyword scoring ───────────────────────────────────────────────────────
  let keywordScore: number;
  let matchedKeywords: string[];
  let missedKeywords: string[];

  if (task.gradingKeywords.length === 0) {
    keywordScore = 60;
    matchedKeywords = [];
    missedKeywords = [];
  } else {
    matchedKeywords = task.gradingKeywords.filter((kw) =>
      normalizedAnswer.includes(kw.toLowerCase())
    );
    missedKeywords = task.gradingKeywords.filter(
      (kw) => !normalizedAnswer.includes(kw.toLowerCase())
    );
    keywordScore = Math.round((matchedKeywords.length / task.gradingKeywords.length) * 80);
  }

  // ── Pattern scoring ───────────────────────────────────────────────────────
  let patternScore: number;

  if (task.gradingPatterns.length === 0) {
    patternScore = 20;
  } else {
    const patternHits = task.gradingPatterns.filter((pattern) => {
      try {
        return new RegExp(pattern, "i").test(answer);
      } catch {
        return false;
      }
    });
    patternScore = Math.round((patternHits.length / task.gradingPatterns.length) * 20);
  }

  const score = Math.min(100, keywordScore + patternScore);
  const passed = score >= 60;

  const feedback = buildFeedback(score, missedKeywords);

  return { score, passed, matchedKeywords, missedKeywords, feedback };
}

function buildFeedback(score: number, missed: string[]): string {
  if (score >= 90) return "Excellent — all key indicators identified.";
  if (score >= 75) return "Good — most key indicators found.";
  if (score >= 60) {
    const hint = missed.length > 0 ? ` Consider mentioning: ${missed.slice(0, 2).join(", ")}.` : "";
    return `Passing — a few indicators were missing.${hint}`;
  }
  if (missed.length > 0) {
    return `Needs work — key terms missing: ${missed.slice(0, 3).join(", ")}.`;
  }
  return "Needs work — review the sample answer and try again.";
}

export function labOverallScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Pass";
  return "Needs Review";
}

export function scoreTone(score: number): "success" | "accent" | "warning" | "danger" {
  if (score >= 75) return "success";
  if (score >= 60) return "accent";
  if (score >= 40) return "warning";
  return "danger";
}
