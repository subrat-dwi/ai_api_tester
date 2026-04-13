'use client';

import { motion } from 'framer-motion';

import { attackMeta } from '@/lib/simulator';
import type { AttackFinding } from '@/lib/types';

type AttackCardProps = {
  attack: AttackFinding;
  index: number;
  onClick: (attack: AttackFinding) => void;
  stage: AttackFinding['stages'][number];
  active?: boolean;
  muted?: boolean;
};

const stageLabels: Record<AttackFinding['stages'][number], string> = {
  generated: 'Generated',
  'payload-sent': 'Payload sent',
  'response-received': 'Response received',
  'outcome-determined': 'Outcome determined'
};

export function AttackCard({ attack, index, onClick, stage, active = false, muted = false }: AttackCardProps) {
  const meta = attackMeta[attack.category];

  if (!active) {
    return (
      <motion.button
        type="button"
        onClick={() => onClick(attack)}
        initial={{ opacity: 0, x: -24, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
        whileHover={{ scale: 1.01, y: -1 }}
        className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-lg border px-4 py-3 text-left backdrop-blur-xl transition-all duration-300 ${
          muted
            ? 'border-red-500/20 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
            : 'border-red-500/30 bg-red-950/35 shadow-[0_0_24px_rgba(239,68,68,0.18)]'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/8 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-red-400/25 bg-red-400/10 text-base">
          {attack.icon}
        </div>
        <div className="relative min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-red-200/70">Attack {String(index + 1).padStart(2, '0')}</p>
          <p className="truncate text-sm font-semibold text-white">{attack.type}</p>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => onClick(attack)}
      initial={{ opacity: 0, x: -24, y: 10 }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        scale: active ? 1.015 : 1
      }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.01, y: -2 }}
      className={`group relative flex w-full flex-col gap-4 overflow-hidden rounded-lg border px-4 py-4 text-left backdrop-blur-xl transition-all duration-300 ${
        muted
          ? 'border-red-500/20 bg-red-500/5 shadow-[0_0_25px_rgba(239,68,68,0.12)]'
          : active
            ? 'border-red-400/60 bg-red-950/55 shadow-glowRed'
            : 'border-red-500/30 bg-red-950/40 shadow-glowRed'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className={`absolute inset-y-0 left-0 w-1 ${active ? 'bg-red-300' : 'bg-red-500/60'}`} />

      <div className="relative flex items-start gap-3">
        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-md border border-red-400/25 bg-red-400/10 text-lg shadow-[0_0_18px_rgba(248,113,113,0.25)]">
          {attack.icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-red-200/70">
            Attack {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">{attack.type}</h3>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-red-100/70">{attack.category}</p>
        </div>
        <span className="rounded-md border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100">
          {attack.severity}
        </span>
      </div>

      <div className="relative rounded-md border border-red-500/20 bg-black/15 px-3 py-2 text-[11px] text-red-50/90">
        <p className="font-semibold uppercase tracking-[0.25em] text-red-200/70">Current Stage</p>
        <p className="mt-1 text-sm text-white">{stageLabels[stage]}</p>
      </div>

      <p className="relative whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-50/80">
        {attack.input}
      </p>

      <div className="relative grid gap-2">
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em] text-red-100/70">
          {attack.stages.map((item) => (
            <span
              key={item}
              className={`rounded-full border px-2 py-1 ${item === stage ? 'border-red-300/60 bg-red-300/15 text-red-50' : 'border-red-500/20 bg-red-500/5 text-red-100/60'}`}
            >
              {stageLabels[item]}
            </span>
          ))}
        </div>

        <div className="rounded-md border border-slate-700/60 bg-slate-950/70 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">Weakness</p>
          <p className="mt-1 text-xs text-slate-100">{meta.weakness}</p>
        </div>
      </div>
    </motion.button>
  );
}