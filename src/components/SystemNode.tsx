'use client';

import { motion } from 'framer-motion';

type SystemNodeProps = {
  endpoint: string;
  description: string;
  source: 'llm' | 'fallback';
  loading: boolean;
};

export function SystemNode({ endpoint, description, source, loading }: SystemNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-[28px] border border-sky-400/25 bg-slate-950/80 p-6 shadow-glowBlue backdrop-blur-xl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.14),transparent_45%)]" />
      <div className="relative flex h-[320px] flex-col justify-between rounded-[24px] border border-sky-300/15 bg-slate-950/70 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.45em] text-cyan-200/70">
            Target System
          </p>
          <div className="mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 font-mono text-sm text-sky-100 shadow-glowBlue">
            {endpoint}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">System Description</p>
            <p className="mt-2 text-sm leading-6 text-slate-200/90">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
              <p className="text-slate-400">Mode</p>
              <p className="mt-1 font-semibold text-sky-100">{source === 'llm' ? 'Live LLM' : 'Demo fallback'}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
              <p className="text-slate-400">State</p>
              <p className="mt-1 font-semibold text-emerald-100">{loading ? 'Simulating' : 'Guarded'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className={`h-2.5 w-2.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
          {loading ? 'Ingesting attacker payloads...' : 'Awaiting new attack run'}
        </div>
      </div>
    </motion.div>
  );
}