export type StrengthLevel = 'starting' | 'good' | 'strong' | 'complete';

export function getStrengthLevel(totalAnswers: number): StrengthLevel {
  if (totalAnswers >= 16) return 'complete';
  if (totalAnswers >= 8) return 'strong';
  if (totalAnswers >= 4) return 'good';
  return 'starting';
}

export function getStrengthColor(level: StrengthLevel): string {
  switch (level) {
    case 'starting':
      return '#8b5cf6'; // Purple
    case 'good':
      return '#84cc16'; // Light green / Yellow-green
    case 'strong':
      return '#047857'; // Race green (British racing green)
    case 'complete':
      return '#14532d'; // Dark green
  }
}

export function getStrengthLabel(level: StrengthLevel): string {
  switch (level) {
    case 'starting':
      return 'Building Profile';
    case 'good':
      return 'Ready for AI';
    case 'strong':
      return 'Fairly Complete';
    case 'complete':
      return 'Fully Complete';
  }
}
