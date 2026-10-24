export const SCALE_LABELS = ['Rough', 'Low', 'OK', 'Good', 'Great'] as const;

export function scaleLabel(v: number | undefined): string {
  return v && v >= 1 && v <= 5 ? SCALE_LABELS[Math.round(v) - 1] : '—';
}

export const COMMON_SYMPTOMS = [
  'Nausea',
  'Reduced appetite',
  'Headache',
  'Fatigue',
  'Injection-site reaction',
  'Water retention',
  'Numbness/tingling',
  'Flushing',
  'Insomnia',
  'Dizziness',
  'Constipation',
  'Diarrhoea',
  'Heartburn',
  'Increased hunger',
  'Joint pain',
];
