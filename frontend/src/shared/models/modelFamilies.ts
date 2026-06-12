import type { ParameterClass } from '../contracts/models.contracts';

export const KNOWN_MODEL_FAMILIES = [
  'llama',
  'qwen',
  'gemma',
  'phi',
  'mistral',
  'deepseek',
  'mixtral',
  'yi',
  'falcon',
  'stablelm',
  'command',
  'general',
] as const;

export type KnownModelFamily = (typeof KNOWN_MODEL_FAMILIES)[number];

/**
 * Heuristically extract a family name from a model id or name.
 * Handles common aliases such as llama3.2, qwen2.5-coder, gemma3, phi4-mini.
 */
export function guessFamilyFromModelId(modelId: string): KnownModelFamily | 'general' {
  const lower = modelId.toLowerCase();
  for (const family of KNOWN_MODEL_FAMILIES) {
    if (lower.includes(family)) return family;
  }
  if (lower.includes('llama')) return 'llama';
  return 'general';
}

/**
 * Heuristically classify parameter count from a model id/name.
 * Not a substitute for registry metadata; used as a fallback only.
 */
export function guessParameterClassFromModelId(modelId: string): ParameterClass {
  const lower = modelId.toLowerCase();
  const map: Array<[ParameterClass, RegExp]> = [
    ['sub_1b', /\b(0\.5b|0\.6b|600m|500m)\b/],
    ['1b', /\b1b\b/],
    ['1_5b', /\b(1\.5b|1\.7b|1\.8b)\b/],
    ['2b', /\b2b\b/],
    ['3b', /\b3b\b/],
    ['4b', /\b(3\.8b|4b)\b/],
    ['7b', /\b7b\b/],
    ['8b', /\b8b\b/],
    ['12b', /\b12b\b/],
    ['14b', /\b14b\b/],
    ['27b', /\b(27b|28b|29b)\b/],
    ['30b_plus', /\b(30b|32b|34b|70b|235b|671b)\b/],
  ];
  for (const [cls, re] of map) {
    if (re.test(lower)) return cls;
  }
  return 'unknown';
}

/**
 * Compare two parameter classes numerically.
 * Returns negative if a < b, positive if a > b, 0 if equal or either unknown.
 */
export function compareParameterClasses(a: ParameterClass, b: ParameterClass): number {
  const order: Record<ParameterClass, number> = {
    sub_1b: 0,
    '1b': 1,
    '1_5b': 2,
    '2b': 3,
    '3b': 4,
    '4b': 5,
    '7b': 6,
    '8b': 7,
    '12b': 8,
    '14b': 9,
    '27b': 10,
    '30b_plus': 11,
    unknown: -1,
  };
  return order[a] - order[b];
}
