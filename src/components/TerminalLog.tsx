'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type TerminalLogProps = {
  history: string[];
  activeText: string;
  status: string;
};

export function TerminalLog({ history, activeText, status }: TerminalLogProps) {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (!activeText) {
      setTypedText('');
      return;
    }

    let index = 0;
    setTypedText('');

    const interval = window.setInterval(() => {
      index += 1;
      setTypedText(activeText.slice(0, index));

      if (index >= activeText.length) {
        window.clearInterval(interval);
      }
    }, 18);

    return () => window.clearInterval(interval);
  }, [activeText]);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Live Terminal</p>
          <p className="mt-1 text-sm font-semibold text-white">{status}</p>
        </div>
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="mt-4 max-h-72 space-y-2 overflow-auto font-mono text-xs leading-6 text-emerald-100/90">
        {history.map((line, index) => (
          <motion.div key={`${line}-${index}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-slate-500">$ </span>
            {line}
          </motion.div>
        ))}

        {activeText ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-slate-100">
            <span className="text-slate-500">$ </span>
            {typedText}
            <span className="ml-1 inline-block h-3 w-2 translate-y-[2px] bg-emerald-400/90 align-middle animate-pulse" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}