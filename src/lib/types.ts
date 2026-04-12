export type SimulationMode = 'simulation' | 'live';

export type AttackSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type AttackCategory =
  | 'Prompt Injection'
  | 'Data Exfiltration'
  | 'Role Escalation'
  | 'Logic Bypass'
  | 'Rate Abuse';

export type AttackStage = 'generated' | 'payload-sent' | 'response-received' | 'outcome-determined';

export type AttackHistoryItem = {
  type: string;
  category: AttackCategory;
  success: boolean;
  severity: AttackSeverity;
};

export type AttackFinding = {
  id: string;
  category: AttackCategory;
  icon: string;
  type: string;
  input: string;
  success: boolean;
  reason: string;
  severity: AttackSeverity;
  fix: string;
  impact: string[];
  weakness: string;
  stages: AttackStage[];
  order: number;
};

export type TimelineEntry = {
  id: string;
  label: string;
  timeLabel: string;
  attackId?: string;
  tone?: 'red' | 'blue' | 'green' | 'amber';
};

export type WeaknessProfileItem = {
  label: string;
  state: 'Critical' | 'Weak' | 'Medium' | 'Strong';
  description: string;
};

export type SimulationRequest = {
  description: string;
  apiUrl?: string;
  mode: SimulationMode;
  previousResults?: AttackHistoryItem[];
};

export type SimulationResponse = {
  attacks: AttackFinding[];
  source: 'llm' | 'fallback' | 'live';
};