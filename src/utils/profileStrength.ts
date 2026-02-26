export type StrengthLevel = 'building' | 'complete';

export function getStrengthLevel(totalAnswers: number): StrengthLevel {
  if (totalAnswers >= 12) return 'complete';
  return 'building';
}

export function getStrengthColor(level: StrengthLevel): string {
  switch (level) {
    case 'building':
      return '#f97316'; // Orange
    case 'complete':
      return '#22c55e'; // Green
  }
}

export function getStrengthLabel(level: StrengthLevel): string {
  switch (level) {
    case 'building':
      return 'Building Profile';
    case 'complete':
      return 'Complete';
  }
}
