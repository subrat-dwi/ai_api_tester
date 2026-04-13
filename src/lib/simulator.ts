import type { AttackCategory, AttackFinding, AttackHistoryItem, WeaknessProfileItem } from './types';

type AttackMeta = {
  icon: string;
  weakness: string;
  impact: string[];
};

export const attackMeta: Record<AttackCategory, AttackMeta> = {
  'Prompt Injection': {
    icon: '🧠',
    weakness: 'AI Safety',
    impact: ['Model instruction override', 'Hidden policy exposure', 'Unsafe tool execution']
  },
  'Data Exfiltration': {
    icon: '🕵️',
    weakness: 'Authentication',
    impact: ['Sensitive document exposure', 'Credential leakage', 'Unauthorized retrieval']
  },
  'Role Escalation': {
    icon: '🎭',
    weakness: 'Session Integrity',
    impact: ['Privilege elevation', 'Admin context abuse', 'Authorization bypass']
  },
  'Logic Bypass': {
    icon: '🧩',
    weakness: 'Input Validation',
    impact: ['Business-rule bypass', 'Conditional shortcut abuse', 'Unexpected state mutation']
  },
  'Rate Abuse': {
    icon: '📈',
    weakness: 'Rate Limiting',
    impact: ['Request flood', 'Resource exhaustion', 'Timing oracle exposure']
  }
};

export const attackCategories: AttackCategory[] = [
  'Prompt Injection',
  'Data Exfiltration',
  'Role Escalation',
  'Logic Bypass',
  'Rate Abuse'
];

export function getAttackMeta(category: AttackCategory) {
  return attackMeta[category];
}

export function getImpactLines(category: AttackCategory, success: boolean, severity: AttackFinding['severity']) {
  const meta = getAttackMeta(category);
  const urgency = severity === 'HIGH' ? 'Critical' : severity === 'MEDIUM' ? 'Elevated' : 'Contained';

  return success
    ? [`${urgency} exposure path`, ...meta.impact.slice(0, 2)]
    : [`${urgency} attempt blocked`, 'Controls contained the payload', meta.impact[0]];
}

export function getWeaknessProfile(attacks: AttackFinding[]): WeaknessProfileItem[] {
  const bucket = new Map<string, { count: number; success: number; high: number }>();

  for (const attack of attacks) {
    const label = getAttackMeta(attack.category).weakness;
    const current = bucket.get(label) ?? { count: 0, success: 0, high: 0 };
    current.count += 1;
    if (attack.success) {
      current.success += 1;
    }
    if (attack.severity === 'HIGH') {
      current.high += 1;
    }
    bucket.set(label, current);
  }

  const labels = ['Input Validation', 'Authentication', 'AI Safety', 'Rate Limiting', 'Session Integrity'];

  return labels.map((label) => {
    const stats = bucket.get(label) ?? { count: 0, success: 0, high: 0 };
    let state: WeaknessProfileItem['state'] = 'Strong';
    let description = 'No successful attacks observed.';

    if (stats.success >= 2 || stats.high >= 1) {
      state = 'Critical';
      description = 'Multiple successful attacks indicate a high-risk weakness.';
    } else if (stats.success === 1) {
      state = 'Weak';
      description = 'At least one attack bypassed the control boundary.';
    } else if (stats.count > 0) {
      state = 'Medium';
      description = 'Attempts were observed, but the system contained them.';
    }

    return { label, state, description };
  });
}

export function summarizeHistory(history: AttackHistoryItem[]) {
  if (!history.length) {
    return 'No prior attack history.';
  }

  return history
    .slice(-8)
    .map((item) => `${item.category}: ${item.success ? 'success' : 'blocked'} (${item.severity})`)
    .join('; ');
}

export function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function getCategoryFromText(category: string): AttackCategory {
  const normalized = category.toLowerCase();

  if (normalized.includes('prompt') || normalized.includes('jailbreak') || normalized.includes('instruction')) {
    return 'Prompt Injection';
  }
  if (normalized.includes('data') || normalized.includes('exfil') || normalized.includes('leak') || normalized.includes('secret')) {
    return 'Data Exfiltration';
  }
  if (normalized.includes('role') || normalized.includes('auth') || normalized.includes('privilege') || normalized.includes('admin')) {
    return 'Role Escalation';
  }
  if (normalized.includes('rate') || normalized.includes('flood') || normalized.includes('dos') || normalized.includes('throttle')) {
    return 'Rate Abuse';
  }
  if (normalized.includes('logic') || normalized.includes('bypass') || normalized.includes('validation')) {
    return 'Logic Bypass';
  }

  return 'Logic Bypass';
}