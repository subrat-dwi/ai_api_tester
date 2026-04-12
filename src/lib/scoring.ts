import type { AttackFinding } from './types';

const severityPenalty: Record<AttackFinding['severity'], number> = {
  HIGH: 18,
  MEDIUM: 11,
  LOW: 6
};

export function calculateSecurityScore(attacks: AttackFinding[]): number {
  const deductions = attacks
    .filter((attack) => attack.success)
    .reduce((total, attack) => total + severityPenalty[attack.severity], 0);

  const successPressure = Math.max(0, attacks.filter((attack) => attack.success).length - 1) * 2;

  return Math.max(0, 100 - deductions - successPressure);
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