import { bandForScore, type ThresholdBand } from './thresholds';

export type MatchChipType = ThresholdBand;

export interface FieldMatchResult {
  text: string;
  type: MatchChipType;
  /** Numeric score when percentage (null for Yes / —). */
  pct?: number;
}

function isMissing(value: string | null | undefined): boolean {
  if (value == null) return true;
  const t = value.trim();
  return t === '' || t === '-' || t === '—' || t.toLowerCase() === 'null';
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function similarityPct(a: string, b: string): number {
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) return 100;
  const maxLen = Math.max(left.length, right.length);
  if (maxLen === 0) return 100;

  const matrix: number[][] = Array.from({ length: left.length + 1 }, () =>
    Array(right.length + 1).fill(0),
  );
  for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  const distance = matrix[left.length][right.length];
  return Math.round(((maxLen - distance) / maxLen) * 10000) / 100;
}

export interface FieldMatchOptions {
  fieldLabel?: string;
  seededPct?: number;
  /** When set, NAME-like fields always show % and band against this threshold. */
  nameMatchMin?: number;
  /** Force percentage display even on exact match (name rows). */
  forcePercent?: boolean;
}

function isNameField(label?: string): boolean {
  if (!label) return false;
  const l = label.toLowerCase();
  return l === 'name' || l.includes('name');
}

export function computeFieldMatch(
  formValue: string,
  compareValue: string,
  options?: FieldMatchOptions,
): FieldMatchResult {
  if (isMissing(formValue) || isMissing(compareValue)) {
    return { text: '—', type: 'gray' };
  }

  const exact = normalize(formValue) === normalize(compareValue);
  const nameMode = options?.forcePercent || isNameField(options?.fieldLabel);
  const nameMin = options?.nameMatchMin ?? 85;

  if (nameMode) {
    const pct = options?.seededPct ?? (exact ? 100 : similarityPct(formValue, compareValue));
    return {
      text: `${pct.toFixed(2)}%`,
      type: bandForScore(pct, nameMin),
      pct,
    };
  }

  if (exact) {
    return { text: 'Yes', type: 'green', pct: 100 };
  }

  const pct = options?.seededPct ?? similarityPct(formValue, compareValue);
  return {
    text: `${pct.toFixed(2)}%`,
    type: bandForScore(pct, nameMin),
    pct,
  };
}

export function computeReportMatch(
  formValue: string,
  aadhaarValue: string,
  panValue: string,
  options?: FieldMatchOptions,
): FieldMatchResult {
  const aadhaarMatch = computeFieldMatch(formValue, aadhaarValue, options);
  const panMatch = computeFieldMatch(formValue, panValue, options);

  if (!isMissing(aadhaarValue) && !isMissing(panValue)) {
    if (aadhaarMatch.text === 'Yes' && panMatch.text === 'Yes') return { text: 'Yes', type: 'green', pct: 100 };
    if (aadhaarMatch.pct != null && panMatch.pct != null) {
      return aadhaarMatch.pct >= panMatch.pct ? aadhaarMatch : panMatch;
    }
    if (aadhaarMatch.text === 'Yes') return aadhaarMatch;
    if (panMatch.text === 'Yes') return panMatch;
    return aadhaarMatch;
  }
  if (!isMissing(aadhaarValue)) return aadhaarMatch;
  if (!isMissing(panValue)) return panMatch;
  return { text: '—', type: 'gray' };
}

/** Extract numeric name-match % for gating (defaults to 100 when exact Yes). */
export function nameMatchPctFromResult(result: FieldMatchResult): number {
  if (result.pct != null) return result.pct;
  if (result.text === 'Yes') return 100;
  const m = result.text.match(/([\d.]+)%/);
  return m ? Number(m[1]) : 0;
}
