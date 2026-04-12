'use client';

import { ArrowFlow } from './ArrowFlow';
import { AttackCard } from './AttackCard';
import { ResultCard } from './ResultCard';
import { SystemNode } from './SystemNode';

import type { AttackFinding, SimulationMode } from '@/lib/types';

type AttackFlowProps = {
  attacks: AttackFinding[];
  successes: AttackFinding[];
  stageById: Record<string, AttackFinding['stages'][number]>;
  activeAttackId: string | null;
  onSelectAttack: (attack: AttackFinding) => void;
  endpoint: string;
  description: string;
  mode: SimulationMode;
  loading: boolean;
  compromisedLabel: string | null;
};

export function AttackFlow({
  attacks,
  successes,
  stageById,
  activeAttackId,
  onSelectAttack,
  endpoint,
  description,
  mode,
  loading,
  compromisedLabel
}: AttackFlowProps) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.08),transparent_35%)]" />
      <ArrowFlow attackCount={attacks.length} successCount={successes.length} />

      <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_360px_1fr] xl:items-center">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]" />
            <h2 className="text-lg font-semibold text-white">Attack Attempts</h2>
          </div>

          <div className="grid gap-4">
            {attacks.map((attack, index) => (
              <AttackCard
                key={attack.id}
                attack={attack}
                index={index}
                onClick={onSelectAttack}
                active={activeAttackId === attack.id}
                stage={stageById[attack.id] ?? 'generated'}
              />
            ))}
          </div>
        </div>

        <div className="self-center">
          <SystemNode
            endpoint={endpoint}
            description={description}
            mode={mode}
            loading={loading}
            compromisedLabel={compromisedLabel}
          />
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.85)]" />
            <h2 className="text-lg font-semibold text-white">Successful Breaches</h2>
          </div>

          <div className="grid gap-4">
            {successes.length > 0 ? (
              successes.map((attack, index) => (
                <ResultCard
                  key={`${attack.id}-success`}
                  attack={attack}
                  index={index}
                  onClick={onSelectAttack}
                  stage={stageById[attack.id] ?? 'outcome-determined'}
                />
              ))
            ) : (
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-5 py-8 text-sm text-emerald-100/80">
                No breaches yet. Launch a simulation to see successful attacks appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}