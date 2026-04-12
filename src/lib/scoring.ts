import type { AttackFinding } from './types';

const severityPenalty: Record<AttackFinding['severity'], number> = {
  HIGH: 20,
  MEDIUM: 10,
  LOW: 5
};

export function calculateSecurityScore(attacks: AttackFinding[]): number {
  const deductions = attacks
    .filter((attack) => attack.success)
    .reduce((total, attack) => total + severityPenalty[attack.severity], 0);

  return Math.max(0, 100 - deductions);
}

export function scoreLabel(score: number): string {
  if (score >= 90) {
    return 'Hardened';
  }

  if (score >= 70) {
    return 'Resilient';
  }

  if (score >= 45) {
    return 'Exposed';
  }

  return 'Critical';
}