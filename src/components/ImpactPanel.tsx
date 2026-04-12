'use client';

import { motion } from 'framer-motion';

import type { AttackFinding } from '@/lib/types';

type ImpactPanelProps = {
  attacks: AttackFinding[];
};

export function ImpactPanel({ attacks }: ImpactPanelProps) {
  const successful = attacks.filter((attack) => attack.success);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Impact Analysis</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Potential consequences</h3>

      <div className="mt-5 space-y-3">
        {successful.length > 0 ? (
          successful.map((attack, index) => (
            <motion.div
              key={attack.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="rounded-md border border-emerald-400/25 bg-emerald-400/10 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-emerald-50">{attack.category}</p>
                <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-100">
                  Success
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-emerald-50/90">
                {attack.impact.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </motion.div>
          ))
        ) : (
          <div className="rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-4 text-sm text-slate-400">
            Potential impact will appear when a breach succeeds.
          </div>
        )}
      </div>
    </div>
  );
}