'use client';

import { motion } from 'framer-motion';

import type { AttackFinding } from '@/lib/types';

type AttackCardProps = {
  attack: AttackFinding;
  index: number;
  onClick: (attack: AttackFinding) => void;
  muted?: boolean;
};

export function AttackCard({ attack, index, onClick, muted = false }: AttackCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(attack)}
      initial={{ opacity: 0, x: -24, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: index * 0.09, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`group relative flex h-[132px] w-full flex-col justify-between overflow-hidden rounded-2xl border px-4 py-4 text-left backdrop-blur-xl transition-all duration-300 ${
        muted
          ? 'border-red-500/20 bg-red-500/5 shadow-[0_0_25px_rgba(239,68,68,0.12)]'
          : 'border-red-500/30 bg-red-950/40 shadow-glowRed'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-red-200/70">
            Attack {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">{attack.type}</h3>
        </div>
        <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100">
          {attack.severity}
        </span>
      </div>
      <p className="relative max-h-[4.5rem] overflow-hidden font-mono text-xs leading-5 text-red-50/80">
        {attack.input}
      </p>
    </motion.button>
  );
}