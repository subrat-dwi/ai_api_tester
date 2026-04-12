export type AttackSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type AttackFinding = {
  type: string;
  input: string;
  success: boolean;
  reason: string;
  severity: AttackSeverity;
  fix: string;
};

export type SimulationResponse = {
  attacks: AttackFinding[];
  source: 'llm' | 'fallback';
};