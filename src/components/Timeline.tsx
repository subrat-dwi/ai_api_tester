'use client';

import { motion } from 'framer-motion';

import type { TimelineEntry } from '@/lib/types';

type TimelineProps = {
  entries: TimelineEntry[];
};

const toneClasses: Record<NonNullable<TimelineEntry['tone']>, string> = {
  red: 'border-red-400/30 bg-red-400/10 text-red-100',
  blue: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  green: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  amber: 'border-amber-400/30 bg-amber-400/10 text-amber-100'
};

export function Timeline({ entries }: TimelineProps) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Timeline</p>
      <h3 className="mt-2 text-lg font-semibold text-white">Attack sequence</h3>

      <div className="mt-5 space-y-3 border-l border-slate-700/70 pl-4">
        {entries.length > 0 ? (
          entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="relative"
            >
              <span className="absolute -left-[1.55rem] top-1 h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.7)]" />
              <div className={`rounded-md border px-3 py-2 text-xs ${toneClasses[entry.tone ?? 'blue']}`}>
                <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.25em] text-inherit/70">
                  <span>{entry.timeLabel}</span>
                  <span>Step {index + 1}</span>
                </div>
                <p className="mt-1 leading-5 text-white/90">{entry.label}</p>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="rounded-md border border-slate-800/80 bg-slate-900/60 px-3 py-4 text-sm text-slate-400">
            Timeline will populate during simulation.
          </div>
        )}
      </div>
    </div>
  );
}