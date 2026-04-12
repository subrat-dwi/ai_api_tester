'use client';

import { motion } from 'framer-motion';

import type { AttackFinding } from '@/lib/types';

type ResultCardProps = {
  attack: AttackFinding;
  index: number;
  onClick: (attack: AttackFinding) => void;
  stage: AttackFinding['stages'][number];
};

const stageLabels: Record<AttackFinding['stages'][number], string> = {
  generated: 'Generated',
  'payload-sent': 'Payload sent',
  'response-received': 'Response received',
  'outcome-determined': 'Outcome determined'
};

export function ResultCard({ attack, index, onClick, stage }: ResultCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(attack)}
      initial={{ opacity: 0, x: 24, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.11, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-4 py-4 text-left shadow-glowGreen backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200/70">
            Breach {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">{attack.type}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-emerald-100/70">{attack.category}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-100">
            {attack.severity}
          </span>
          <span className="rounded-md border border-emerald-400/20 bg-emerald-950/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-100/80">
            {stageLabels[stage]}
          </span>
        </div>
      </div>
      <div className="relative grid gap-2 rounded-md border border-emerald-400/20 bg-black/15 px-3 py-2 text-xs text-emerald-50/90">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200/75">Potential Impact</p>
        <ul className="space-y-1">
          {attack.impact.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
      <p className="relative whitespace-pre-wrap break-words font-mono text-xs leading-5 text-emerald-50/80">
        {attack.reason}
      </p>
      <div className="relative rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200/75">Fix</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-emerald-50/90">{attack.fix}</p>
      </div>
    </motion.button>
  );
}