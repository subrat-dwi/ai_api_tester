'use client';

import { motion } from 'framer-motion';

import type { WeaknessProfileItem } from '@/lib/types';

type WeaknessPanelProps = {
  entries: WeaknessProfileItem[];
};

const stateClasses: Record<WeaknessProfileItem['state'], string> = {
  Critical: 'border-red-400/30 bg-red-400/10 text-red-100',
  Weak: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  Medium: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  Strong: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
};

export function WeaknessPanel({ entries }: WeaknessPanelProps) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">System Weakness Profile</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Control coverage analysis</h3>

      <div className="mt-5 grid gap-3">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
            className={`rounded-md border px-3 py-3 ${stateClasses[entry.state]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{entry.label}</p>
              <span className="text-[10px] font-semibold uppercase tracking-[0.28em] text-inherit/80">{entry.state}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-white/80">{entry.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}