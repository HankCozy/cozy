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
      return '#10b981'; // Green
    case 'strong':
      return '#059669'; // Dark Green
    case 'complete':
      return '#f59e0b'; // Amber/Gold
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
