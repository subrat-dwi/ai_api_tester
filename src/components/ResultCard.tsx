'use client';

import { motion } from 'framer-motion';

import type { AttackFinding } from '@/lib/types';

type ResultCardProps = {
  attack: AttackFinding;
  index: number;
  onClick: (attack: AttackFinding) => void;
};

export function ResultCard({ attack, index, onClick }: ResultCardProps) {
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
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-200/70">
            Breach {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">{attack.type}</h3>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-100">
          {attack.severity}
        </span>
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