'use client';

import { motion } from 'framer-motion';

import type { StoredTest } from '@/lib/firestore';

type HistoryPanelProps = {
  tests: StoredTest[];
  loading: boolean;
  selectedTestId: string | null;
  onSelectTest: (test: StoredTest) => void;
  onRetest: (test: StoredTest) => void;
};

function scoreTone(score: number) {
  if (score >= 70) {
    return {
      badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
      accent: 'text-emerald-300',
      label: 'Safe'
    };
  }

  if (score >= 45) {
    return {
      badge: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
      accent: 'text-amber-300',
      label: 'Medium Risk'
    };
  }

  return {
    badge: 'border-red-400/30 bg-red-400/10 text-red-100',
    accent: 'text-red-300',
    label: 'High Risk'
  };
}

function formatDate(value: Date | null) {
  if (!value) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

export function HistoryPanel({ tests, loading, selectedTestId, onSelectTest, onRetest }: HistoryPanelProps) {
  const selectedTest = tests.find((test) => test.id === selectedTestId) ?? null;

  return (
    <aside className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30 xl:sticky xl:top-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Previous Tests</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Test history</h3>
        </div>
        <span className="rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300">
          {tests.length}
        </span>
      </div>

      {loading ? (
        <div className="mt-5 rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-8 text-sm text-slate-400">
          Loading previous tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="mt-5 rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-8 text-sm text-slate-400">
          No saved tests yet. Run a simulation to store results here.
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          {tests.map((test, index) => {
            const tone = scoreTone(test.securityScore);
            const isSelected = selectedTestId === test.id;

            return (
              <motion.div
                key={test.id}
                onClick={() => onSelectTest(test)}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
                className={`rounded-xl border p-4 text-left transition ${
                  isSelected
                    ? 'border-sky-400/50 bg-sky-500/10 shadow-[0_0_30px_rgba(56,189,248,0.12)]'
                    : 'border-slate-700/60 bg-slate-900/55 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{test.description}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-slate-400">
                      {test.mode === 'live' ? 'Live Attack' : 'Simulation'} • {formatDate(test.createdAt)}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${tone.badge}`}>
                    {tone.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Security Score</span>
                    <span className={tone.accent}>{test.securityScore} / 100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Breaches</span>
                    <span>{test.successCount} / {test.attackCount}</span>
                  </div>
                  {test.apiUrl ? (
                    <div className="truncate rounded-md border border-slate-800/80 bg-black/20 px-3 py-2 font-mono text-[11px] text-slate-400">
                      {test.apiUrl}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectTest(test);
                    }}
                    className="rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-slate-500"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRetest(test);
                    }}
                    className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-red-100 transition hover:border-red-300/50"
                  >
                    Retest
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedTest ? (
        <div className="mt-5 rounded-xl border border-slate-700/60 bg-slate-900/55 p-4">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Selected Test</p>
          <h4 className="mt-2 text-base font-semibold text-white">{selectedTest.description}</h4>
          <div className="mt-3 grid gap-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>Mode</span>
              <span>{selectedTest.mode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Score</span>
              <span>{selectedTest.securityScore} / 100</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Breaches</span>
              <span>{selectedTest.successCount} / {selectedTest.attackCount}</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}