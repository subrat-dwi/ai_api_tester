'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';

import { AttackFlow } from '@/components/AttackFlow';
import { ImpactPanel } from '@/components/ImpactPanel';
import { TerminalLog } from '@/components/TerminalLog';
import { Timeline } from '@/components/Timeline';
import { WeaknessPanel } from '@/components/WeaknessPanel';
import { calculateSecurityScore, scoreLabel } from '@/lib/scoring';
import { fallbackSimulation } from '@/lib/redteam';
import { formatSeconds, getWeaknessProfile } from '@/lib/simulator';
import type { AttackFinding, AttackHistoryItem, AttackStage, SimulationMode, SimulationResponse, TimelineEntry } from '@/lib/types';

const starterDescription = 'This API summarizes user documents';

const narrativeSteps = ['Initializing attack vectors…', 'Scanning target endpoint…', 'Launching injection payload…', 'Analyzing response…'];

function buildEndpoint(description: string, apiUrl: string): string {
  const trimmedApiUrl = apiUrl.trim();

  if (trimmedApiUrl) {
    if (/^[A-Z]+\s+/i.test(trimmedApiUrl)) return trimmedApiUrl.toUpperCase();
    if (/^https?:\/\//i.test(trimmedApiUrl)) return `POST ${trimmedApiUrl}`;
    if (trimmedApiUrl.startsWith('/')) return `POST ${trimmedApiUrl}`;
    return `POST /${trimmedApiUrl.replace(/^\/+/, '')}`;
  }

  const normalized = description.toLowerCase();

  if (normalized.includes('summar')) return 'POST /api/summarize';
  if (normalized.includes('chat')) return 'POST /api/chat';
  if (normalized.includes('search')) return 'POST /api/search';
  if (normalized.includes('upload')) return 'POST /api/upload';

  return 'POST /api/target';
}

function formatTimeLabel(ms: number): string {
  return `T+${formatSeconds(ms)}`;
}

function getOutcomeSummary(attacks: AttackFinding[]) {
  const successCount = attacks.filter((attack) => attack.success).length;
  const score = calculateSecurityScore(attacks);

  return {
    successCount,
    total: attacks.length,
    score,
    ratio: attacks.length > 0 ? `${successCount} / ${attacks.length}` : '0 / 0',
    verdict: successCount > 0 ? 'System integrity compromised' : 'System contained'
  };
}

function AttackDetailModal({ attack, onClose }: { attack: AttackFinding | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {attack ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 p-6 shadow-2xl shadow-black/60"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_35%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Detailed Analysis</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{attack.type}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-600/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="relative mt-6 grid gap-4">
              <div className="rounded-md border border-red-500/25 bg-red-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-red-200/70">Malicious Input</p>
                <p className="mt-3 font-mono text-sm leading-6 text-red-50/90">{attack.input}</p>
              </div>
              <div className="rounded-md border border-sky-500/25 bg-sky-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/70">Expert Analysis</p>
                <p className="mt-3 text-sm leading-7 text-slate-100/90">{attack.reason}</p>
              </div>
              <div className="rounded-md border border-emerald-500/25 bg-emerald-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">Fix Suggestion</p>
                <p className="mt-3 text-sm leading-7 text-emerald-50/90">{attack.fix}</p>
              </div>
              <div className="rounded-md border border-amber-500/25 bg-amber-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">Potential Impact</p>
                <ul className="mt-3 space-y-1 text-sm leading-6 text-amber-50/90">
                  {attack.impact.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

type RunSummary = {
  ratio: string;
  verdict: string;
  score: number;
  durationLabel: string;
};

export default function Home() {
  const [apiUrl, setApiUrl] = useState('');
  const [description, setDescription] = useState(starterDescription);
  const [mode, setMode] = useState<SimulationMode>('simulation');
  const [attacks, setAttacks] = useState<AttackFinding[]>([]);
  const [stageById, setStageById] = useState<Record<string, AttackStage>>({});
  const [activeAttackId, setActiveAttackId] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<AttackFinding | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<SimulationResponse['source']>('fallback');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [terminalActive, setTerminalActive] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [compromisedLabel, setCompromisedLabel] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [history, setHistory] = useState<AttackHistoryItem[]>([]);

  const runIdRef = useRef(0);
  const attackCount = attacks.length;
  const successfulAttacks = attacks.filter((attack) => attack.success);
  const weaknessProfile = useMemo(() => getWeaknessProfile(attacks), [attacks]);
  const endpoint = useMemo(() => buildEndpoint(description, apiUrl), [description, apiUrl]);
  const score = attacks.length > 0 ? calculateSecurityScore(attacks) : 100;
  const sourceLabel = source === 'llm' ? 'Live AI batch' : source === 'live' ? 'Live execution' : 'Fallback demo';

  async function wait(ms: number) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function narrate(text: string, holdMs = 900) {
    setTerminalActive(text);
    await wait(Math.max(holdMs, Math.min(1500, text.length * 22)));
    setTerminalHistory((current) => [...current, text]);
    setTerminalActive('');
    await wait(120);
  }

  async function executeLiveAttack(attack: AttackFinding) {
    const targetUrl = apiUrl.trim();

    if (!targetUrl) {
      return attack.success;
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          attackType: attack.type,
          category: attack.category,
          input: attack.input
        })
      });

      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
        if (typeof data?.success === 'boolean') {
          return data.success;
        }
      }

      return true;
    } catch {
      return attack.success;
    }
  }

  function addTimelineEntry(label: string, tone: TimelineEntry['tone'], startedAt: number, attackId?: string) {
    setTimeline((current) => [
      ...current,
      {
        id: `${attackId ?? 'global'}-${current.length}`,
        label,
        timeLabel: formatTimeLabel(performance.now() - startedAt),
        attackId,
        tone
      }
    ]);
  }

  async function handleSimulate() {
    const trimmedDescription = description.trim();
    const trimmedApiUrl = apiUrl.trim();

    if (!trimmedDescription) {
      return;
    }

    const currentRun = runIdRef.current + 1;
    runIdRef.current = currentRun;
    const startedAt = performance.now();

    setLoading(true);
    setSelectedAttack(null);
    setAttacks([]);
    setStageById({});
    setActiveAttackId(null);
    setTerminalHistory([]);
    setTerminalActive('');
    setTimeline([]);
    setSummary(null);
    setCompromisedLabel(null);

    await narrate(narrativeSteps[0], 800);
    await narrate(narrativeSteps[1], 700);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: trimmedDescription,
          apiUrl: trimmedApiUrl,
          mode,
          previousResults: history.slice(-8)
        })
      });

      const data = (await response.json()) as SimulationResponse;
      const plannedAttacks = data?.attacks?.length ? data.attacks : fallbackSimulation(trimmedDescription, trimmedApiUrl, history.slice(-8)).attacks;

      setSource(mode === 'live' ? 'live' : (data?.source ?? 'fallback'));
      setAttacks(plannedAttacks);
      setStageById(Object.fromEntries(plannedAttacks.map((attack) => [attack.id, 'generated'] as const)));

      await narrate(narrativeSteps[2], 650);

      const resolvedAttacks = plannedAttacks.map((attack) => ({ ...attack }));
      let breachLabel: string | null = null;

      for (let index = 0; index < resolvedAttacks.length; index += 1) {
        const attack = resolvedAttacks[index];

        if (runIdRef.current !== currentRun) {
          return;
        }

        setActiveAttackId(attack.id);
        setStageById((current) => ({ ...current, [attack.id]: 'generated' }));
        addTimelineEntry(`Attack generated: ${attack.category}`, 'blue', startedAt, attack.id);

        await narrate(`[ATTACK] ${attack.category}`, 550);

        setStageById((current) => ({ ...current, [attack.id]: 'payload-sent' }));
        addTimelineEntry('Payload sent', 'amber', startedAt, attack.id);
        await narrate('→ Sending payload…', 500);

        setStageById((current) => ({ ...current, [attack.id]: 'response-received' }));
        addTimelineEntry('Response received', 'blue', startedAt, attack.id);
        await narrate('→ Response received…', 500);

        const success = mode === 'live' ? await executeLiveAttack(attack) : attack.success;
        resolvedAttacks[index] = { ...attack, success };
        setAttacks([...resolvedAttacks]);

        setStageById((current) => ({ ...current, [attack.id]: 'outcome-determined' }));
        addTimelineEntry(success ? 'Breach confirmed' : 'Attack blocked', success ? 'red' : 'green', startedAt, attack.id);

        if (success && !breachLabel) {
          breachLabel = `System Compromised in ${formatSeconds(performance.now() - startedAt)}`;
          setCompromisedLabel(breachLabel);
        }

        await narrate(success ? '→ Breach SUCCESS ⚠️' : '→ Attack blocked 🛡️', 700);

        if (runIdRef.current !== currentRun) {
          return;
        }

        setHistory((current) => [
          ...current,
          {
            type: attack.type,
            category: attack.category,
            success,
            severity: attack.severity
          }
        ].slice(-20));

        await wait(180);
      }

      setActiveAttackId(null);
      const finalSummary = getOutcomeSummary(resolvedAttacks);
      setSummary({
        ...finalSummary,
        durationLabel: formatSeconds(performance.now() - startedAt)
      });
      setTerminalHistory((current) => [...current, 'Simulation complete.']);
      setTerminalActive('');
      await narrate('Simulation complete.', 450);
    } catch {
      const fallback = fallbackSimulation(trimmedDescription, trimmedApiUrl, history.slice(-8));
      setAttacks(fallback.attacks);
      setSource(fallback.source);
      setStageById(Object.fromEntries(fallback.attacks.map((attack) => [attack.id, 'outcome-determined'] as const)));
      setSummary({
        ...getOutcomeSummary(fallback.attacks),
        durationLabel: formatSeconds(performance.now() - startedAt)
      });
      setTerminalHistory((current) => [...current, 'Network fallback engaged.']);
      setTerminalActive('');
      setCompromisedLabel(null);
    } finally {
      if (runIdRef.current === currentRun) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-shell opacity-20" />
      <div className="absolute inset-0 noise-overlay opacity-20 mix-blend-soft-light" />
      <div className="absolute left-1/2 top-[-8rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-red-500/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-300 shadow-lg shadow-black/20">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
              AI Red-Team Simulator
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Break your API before attackers do.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Run autonomous red-team simulations against AI systems and traditional APIs, watch attacks evolve in real time, and surface exact weaknesses with impact and fix guidance.
              </p>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[30rem] xl:grid-cols-2">
            <MetricCard label="Security Score" value={`${score} / 100`} accent={score >= 70 ? 'text-emerald-300' : score >= 45 ? 'text-amber-300' : 'text-red-300'} />
            <MetricCard label="Posture" value={scoreLabel(score)} accent="text-sky-200" />
            <MetricCard label="Result" value={summary?.verdict ?? 'Awaiting simulation'} accent="text-white" />
            <MetricCard label="Mode" value={mode === 'live' ? 'Live Attack' : 'Simulation'} accent="text-cyan-200" />
          </div>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/30">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <label htmlFor="api-url" className="text-sm font-medium text-slate-200">
                  API URL / Endpoint
                </label>
                <input
                  id="api-url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://api.example.com/v1/summarize or /api/summarize"
                  className="mt-3 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-3 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div>
                <label htmlFor="system-description" className="text-sm font-medium text-slate-200">
                  Describe your API / AI system
                </label>
                <textarea
                  id="system-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="This API summarizes user documents"
                  className="mt-3 min-h-[150px] w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-4 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/70">
                  <button
                    type="button"
                    onClick={() => setMode('simulation')}
                    className={`px-4 py-3 text-sm font-semibold transition ${mode === 'simulation' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-300 hover:bg-slate-900/80'}`}
                  >
                    Simulation Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('live')}
                    className={`px-4 py-3 text-sm font-semibold transition ${mode === 'live' ? 'bg-emerald-500/20 text-emerald-100' : 'text-slate-300 hover:bg-slate-900/80'}`}
                  >
                    Live Attack Mode
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-red-400/30 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-glowRed transition hover:scale-[1.01] hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Simulating…' : 'Simulate Attack'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{endpoint}</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{sourceLabel}</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{attackCount} attack vectors</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">
                  {compromisedLabel ?? 'System not yet compromised'}
                </span>
              </div>
            </div>

            <TerminalLog history={terminalHistory} activeText={terminalActive} status={loading ? 'Running autonomous red-team sequence' : 'Idle'} />
          </div>
        </section>

        <AttackFlow
          attacks={attacks}
          successes={successfulAttacks}
          stageById={stageById}
          activeAttackId={activeAttackId}
          onSelectAttack={setSelectedAttack}
          endpoint={endpoint}
          description={description}
          mode={mode}
          loading={loading}
          compromisedLabel={compromisedLabel}
        />

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <WeaknessPanel entries={weaknessProfile} />
          <ImpactPanel attacks={attacks} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Timeline entries={timeline} />

          <section className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Final Summary</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Simulation outcome</h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `${summary.ratio} attacks succeeded` : 'Run a simulation to generate attack outcomes.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? summary.verdict : 'System integrity status will appear here.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `Compromised in ${summary.durationLabel}` : 'Elapsed compromise time will appear here.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `Security Score: ${summary.score} / 100` : 'Security score will update after execution.'}
              </div>
            </div>
          </section>
        </section>
      </section>

      <AttackDetailModal attack={selectedAttack} onClose={() => setSelectedAttack(null)} />
    </main>
  );
}
/*
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';

import { AttackFlow } from '@/components/AttackFlow';
import { ImpactPanel } from '@/components/ImpactPanel';
import { TerminalLog } from '@/components/TerminalLog';
import { Timeline } from '@/components/Timeline';
import { WeaknessPanel } from '@/components/WeaknessPanel';
import { calculateSecurityScore, scoreLabel } from '@/lib/scoring';
import { fallbackSimulation } from '@/lib/redteam';
import { formatSeconds, getWeaknessProfile } from '@/lib/simulator';
import type { AttackFinding, AttackHistoryItem, AttackStage, SimulationMode, SimulationResponse, TimelineEntry } from '@/lib/types';

const starterDescription = 'This API summarizes user documents';

const narrativeSteps = [
  'Initializing attack vectors…',
  'Scanning target endpoint…',
  'Launching injection payload…',
  'Analyzing response…'
];

function buildEndpoint(description: string, apiUrl: string): string {
  const trimmedApiUrl = apiUrl.trim();

  if (trimmedApiUrl) {
    if (/^[A-Z]+\s+/i.test(trimmedApiUrl)) {
      return trimmedApiUrl.toUpperCase();
    }

    if (/^https?:\/\//i.test(trimmedApiUrl)) {
      return `POST ${trimmedApiUrl}`;
    }

    if (trimmedApiUrl.startsWith('/')) {
      return `POST ${trimmedApiUrl}`;
    }

    return `POST /${trimmedApiUrl.replace(/^\/+/, '')}`;
  }

  const normalized = description.toLowerCase();

  if (normalized.includes('summar')) {
    return 'POST /api/summarize';
  }

  if (normalized.includes('chat')) {
    return 'POST /api/chat';
  }

  if (normalized.includes('search')) {
    return 'POST /api/search';
  }

  if (normalized.includes('upload')) {
    return 'POST /api/upload';
  }

  return 'POST /api/target';
}

function formatTimeLabel(ms: number): string {
  return `T+${formatSeconds(ms)}`;
}

function getOutcomeSummary(attacks: AttackFinding[]) {
  const successCount = attacks.filter((attack) => attack.success).length;
  const score = calculateSecurityScore(attacks);

  return {
    successCount,
    total: attacks.length,
    score,
    ratio: attacks.length > 0 ? `${successCount} / ${attacks.length}` : '0 / 0',
    verdict: successCount > 0 ? 'System integrity compromised' : 'System contained'
  };
}

function AttackDetailModal({ attack, onClose }: { attack: AttackFinding | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {attack ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 p-6 shadow-2xl shadow-black/60"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_35%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Detailed Analysis</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{attack.type}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-600/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="relative mt-6 grid gap-4">
              <div className="rounded-md border border-red-500/25 bg-red-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-red-200/70">Malicious Input</p>
                <p className="mt-3 font-mono text-sm leading-6 text-red-50/90">{attack.input}</p>
              </div>
              <div className="rounded-md border border-sky-500/25 bg-sky-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/70">Expert Analysis</p>
                <p className="mt-3 text-sm leading-7 text-slate-100/90">{attack.reason}</p>
              </div>
              <div className="rounded-md border border-emerald-500/25 bg-emerald-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">Fix Suggestion</p>
                <p className="mt-3 text-sm leading-7 text-emerald-50/90">{attack.fix}</p>
              </div>
              <div className="rounded-md border border-amber-500/25 bg-amber-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">Potential Impact</p>
                <ul className="mt-3 space-y-1 text-sm leading-6 text-amber-50/90">
                  {attack.impact.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

type RunSummary = {
  ratio: string;
  verdict: string;
  score: number;
  durationLabel: string;
};

export default function Home() {
  const [apiUrl, setApiUrl] = useState('');
  const [description, setDescription] = useState(starterDescription);
  const [mode, setMode] = useState<SimulationMode>('simulation');
  const [attacks, setAttacks] = useState<AttackFinding[]>([]);
  const [stageById, setStageById] = useState<Record<string, AttackStage>>({});
  const [activeAttackId, setActiveAttackId] = useState<string | null>(null);
  const [selectedAttack, setSelectedAttack] = useState<AttackFinding | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<SimulationResponse['source']>('fallback');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [terminalActive, setTerminalActive] = useState('');
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [compromisedLabel, setCompromisedLabel] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [history, setHistory] = useState<AttackHistoryItem[]>([]);

  const runIdRef = useRef(0);
  const attackCount = attacks.length;
  const successfulAttacks = attacks.filter((attack) => attack.success);
  const weaknessProfile = useMemo(() => getWeaknessProfile(attacks), [attacks]);
  const endpoint = useMemo(() => buildEndpoint(description, apiUrl), [description, apiUrl]);
  const score = attacks.length > 0 ? calculateSecurityScore(attacks) : 100;
  const sourceLabel = source === 'llm' ? 'Live AI batch' : source === 'live' ? 'Live execution' : 'Fallback demo';

  async function wait(ms: number) {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function narrate(text: string, holdMs = 900) {
    setTerminalActive(text);
    await wait(Math.max(holdMs, Math.min(1500, text.length * 22)));
    setTerminalHistory((current) => [...current, text]);
    setTerminalActive('');
    await wait(120);
  }

  async function executeLiveAttack(attack: AttackFinding) {
    const targetUrl = apiUrl.trim();

    if (!targetUrl) {
      return attack.success;
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description,
          attackType: attack.type,
          category: attack.category,
          input: attack.input
        })
      });

      if (!response.ok) {
        return false;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
        if (typeof data?.success === 'boolean') {
          return data.success;
        }
      }

      return true;
    } catch {
      return attack.success;
    }
  }

  function addTimelineEntry(label: string, tone: TimelineEntry['tone'], startedAt: number, attackId?: string) {
    setTimeline((current) => [
      ...current,
      {
        id: `${attackId ?? 'global'}-${current.length}`,
        label,
        timeLabel: formatTimeLabel(performance.now() - startedAt),
        attackId,
        tone
      }
    ]);
  }

  async function handleSimulate() {
    const trimmedDescription = description.trim();
    const trimmedApiUrl = apiUrl.trim();

    if (!trimmedDescription) {
      return;
    }

    const currentRun = runIdRef.current + 1;
    runIdRef.current = currentRun;
    const startedAt = performance.now();

    setLoading(true);
    setSelectedAttack(null);
    setAttacks([]);
    setStageById({});
    setActiveAttackId(null);
    setTerminalHistory([]);
    setTerminalActive('');
    setTimeline([]);
    setSummary(null);
    setCompromisedLabel(null);

    await narrate(narrativeSteps[0], 800);
    await narrate(narrativeSteps[1], 700);

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: trimmedDescription,
          apiUrl: trimmedApiUrl,
          mode,
          previousResults: history.slice(-8)
        })
      });

      const data = (await response.json()) as SimulationResponse;
      const plannedAttacks = data?.attacks?.length ? data.attacks : fallbackSimulation(trimmedDescription, trimmedApiUrl, history.slice(-8)).attacks;

      setSource(mode === 'live' ? 'live' : (data?.source ?? 'fallback'));
      setAttacks(plannedAttacks);
      setStageById(Object.fromEntries(plannedAttacks.map((attack) => [attack.id, 'generated'] as const)));

      await narrate(narrativeSteps[2], 650);

      const resolvedAttacks = plannedAttacks.map((attack) => ({ ...attack }));
      let breachLabel: string | null = null;

      for (let index = 0; index < resolvedAttacks.length; index += 1) {
        const attack = resolvedAttacks[index];

        if (runIdRef.current !== currentRun) {
          return;
        }

        setActiveAttackId(attack.id);
        setStageById((current) => ({ ...current, [attack.id]: 'generated' }));
        addTimelineEntry(`Attack generated: ${attack.category}`, 'blue', startedAt, attack.id);

        await narrate(`[ATTACK] ${attack.category}` , 550);

        setStageById((current) => ({ ...current, [attack.id]: 'payload-sent' }));
        addTimelineEntry('Payload sent', 'amber', startedAt, attack.id);
        await narrate('→ Sending payload…', 500);

        setStageById((current) => ({ ...current, [attack.id]: 'response-received' }));
        addTimelineEntry('Response received', 'blue', startedAt, attack.id);
        await narrate('→ Response received…', 500);

        const success = mode === 'live' ? await executeLiveAttack(attack) : attack.success;
        resolvedAttacks[index] = { ...attack, success };
        setAttacks([...resolvedAttacks]);

        setStageById((current) => ({ ...current, [attack.id]: 'outcome-determined' }));
        addTimelineEntry(success ? 'Breach confirmed' : 'Attack blocked', success ? 'red' : 'green', startedAt, attack.id);

        if (success && !breachLabel) {
          breachLabel = `System Compromised in ${formatSeconds(performance.now() - startedAt)}`;
          setCompromisedLabel(breachLabel);
        }

        await narrate(success ? '→ Breach SUCCESS ⚠️' : '→ Attack blocked 🛡️', 700);

        if (runIdRef.current !== currentRun) {
          return;
        }

        setHistory((current) => [
          ...current,
          {
            type: attack.type,
            category: attack.category,
            success,
            severity: attack.severity
          }
        ].slice(-20));

        await wait(180);
      }

      setActiveAttackId(null);
      const finalSummary = getOutcomeSummary(resolvedAttacks);
      setSummary({
        ...finalSummary,
        durationLabel: formatSeconds(performance.now() - startedAt)
      });
      setTerminalHistory((current) => [...current, 'Simulation complete.']);
      setTerminalActive('');
      await narrate('Simulation complete.', 450);
    } catch {
      const fallback = fallbackSimulation(trimmedDescription, trimmedApiUrl, history.slice(-8));
      setAttacks(fallback.attacks);
      setSource(fallback.source);
      setStageById(Object.fromEntries(fallback.attacks.map((attack) => [attack.id, 'outcome-determined'] as const)));
      setSummary({
        ...getOutcomeSummary(fallback.attacks),
        durationLabel: formatSeconds(performance.now() - startedAt)
      });
      setTerminalHistory((current) => [...current, 'Network fallback engaged.']);
      setTerminalActive('');
      setCompromisedLabel(null);
    } finally {
      if (runIdRef.current === currentRun) {
        setLoading(false);
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-shell opacity-20" />
      <div className="absolute inset-0 noise-overlay opacity-20 mix-blend-soft-light" />
      <div className="absolute left-1/2 top-[-8rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-red-500/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-300 shadow-lg shadow-black/20">
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
              AI Red-Team Simulator
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Break your API before attackers do.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Run autonomous red-team simulations against AI systems and traditional APIs, watch attacks evolve in real time, and surface exact weaknesses with impact and fix guidance.
              </p>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[30rem] xl:grid-cols-2">
            <MetricCard label="Security Score" value={`${score} / 100`} accent={score >= 70 ? 'text-emerald-300' : score >= 45 ? 'text-amber-300' : 'text-red-300'} />
            <MetricCard label="Posture" value={scoreLabel(score)} accent="text-sky-200" />
            <MetricCard label="Result" value={summary?.verdict ?? 'Awaiting simulation'} accent="text-white" />
            <MetricCard label="Mode" value={mode === 'live' ? 'Live Attack' : 'Simulation'} accent="text-cyan-200" />
          </div>
        </header>

        <section className="rounded-xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/30">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <label htmlFor="api-url" className="text-sm font-medium text-slate-200">
                  API URL / Endpoint
                </label>
                <input
                  id="api-url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://api.example.com/v1/summarize or /api/summarize"
                  className="mt-3 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-3 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div>
                <label htmlFor="system-description" className="text-sm font-medium text-slate-200">
                  Describe your API / AI system
                </label>
                <textarea
                  id="system-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="This API summarizes user documents"
                  className="mt-3 min-h-[150px] w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-4 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950/70">
                  <button
                    type="button"
                    onClick={() => setMode('simulation')}
                    className={`px-4 py-3 text-sm font-semibold transition ${mode === 'simulation' ? 'bg-sky-500/20 text-sky-100' : 'text-slate-300 hover:bg-slate-900/80'}`}
                  >
                    Simulation Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('live')}
                    className={`px-4 py-3 text-sm font-semibold transition ${mode === 'live' ? 'bg-emerald-500/20 text-emerald-100' : 'text-slate-300 hover:bg-slate-900/80'}`}
                  >
                    Live Attack Mode
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-red-400/30 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-glowRed transition hover:scale-[1.01] hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Simulating…' : 'Simulate Attack'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{endpoint}</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{sourceLabel}</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{attackCount} attack vectors</span>
                <span className="rounded-md border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">
                  {compromisedLabel ?? 'System not yet compromised'}
                </span>
              </div>
            </div>

            <TerminalLog history={terminalHistory} activeText={terminalActive} status={loading ? 'Running autonomous red-team sequence' : 'Idle'} />
          </div>
        </section>

        <AttackFlow
          attacks={attacks}
          successes={successfulAttacks}
          stageById={stageById}
          activeAttackId={activeAttackId}
          onSelectAttack={setSelectedAttack}
          endpoint={endpoint}
          description={description}
          mode={mode}
          loading={loading}
          compromisedLabel={compromisedLabel}
        />

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <WeaknessPanel entries={weaknessProfile} />
          <ImpactPanel attacks={attacks} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Timeline entries={timeline} />

          <section className="rounded-xl border border-slate-700/60 bg-slate-950/80 p-5 shadow-lg shadow-black/30">
            <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Final Summary</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Simulation outcome</h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `${summary.ratio} attacks succeeded` : 'Run a simulation to generate attack outcomes.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? summary.verdict : 'System integrity status will appear here.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `Compromised in ${summary.durationLabel}` : 'Elapsed compromise time will appear here.'}
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/60 px-4 py-3 text-sm text-slate-100">
                {summary ? `Security Score: ${summary.score} / 100` : 'Security score will update after execution.'}
              </div>
            </div>
          </section>
        </section>
      </section>

      <AttackDetailModal attack={selectedAttack} onClose={() => setSelectedAttack(null)} />
    </main>
  );
}'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import { ArrowFlow } from '@/components/ArrowFlow';
import { AttackCard } from '@/components/AttackCard';
import { ResultCard } from '@/components/ResultCard';
import { SystemNode } from '@/components/SystemNode';
import { calculateSecurityScore, scoreLabel } from '@/lib/scoring';
import { fallbackSimulation } from '@/lib/llm';
import type { AttackFinding, SimulationResponse } from '@/lib/types';

const starterDescription = 'This API summarizes user documents';

const loaderFrames = [
  'Initializing attacker swarm...',
  'Mapping the target surface...',
  'Injecting prompt probes...',
  'Evaluating defensive responses...',
  'Tracing successful breaches...'
];

function buildEndpoint(description: string, apiUrl: string): string {
  const trimmedApiUrl = apiUrl.trim();

  if (trimmedApiUrl) {
    if (/^[A-Z]+\s+/i.test(trimmedApiUrl)) {
      return trimmedApiUrl.toUpperCase();
    }

    if (/^https?:\/\//i.test(trimmedApiUrl)) {
      return `POST ${trimmedApiUrl}`;
    }

    if (trimmedApiUrl.startsWith('/')) {
      return `POST ${trimmedApiUrl}`;
    }

    return `POST /${trimmedApiUrl.replace(/^\/+/, '')}`;
  }

  const normalized = description.toLowerCase();

  if (normalized.includes('summar')) {
    return 'POST /api/summarize';
  }

  if (normalized.includes('chat')) {
    return 'POST /api/chat';
  }

  if (normalized.includes('search')) {
    return 'POST /api/search';
  }

  if (normalized.includes('upload')) {
    return 'POST /api/upload';
  }

  return 'POST /api/target';
}

function AttackDetailModal({ attack, onClose }: { attack: AttackFinding | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {attack ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700/80 p-6 shadow-2xl shadow-black/60"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_35%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-slate-400">Detailed Analysis</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{attack.type}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-600/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="relative mt-6 grid gap-4">
              <div className="rounded-md border border-red-500/25 bg-red-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-red-200/70">Malicious Input</p>
                <p className="mt-3 font-mono text-sm leading-6 text-red-50/90">{attack.input}</p>
              </div>
              <div className="rounded-md border border-sky-500/25 bg-sky-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-sky-200/70">Explanation</p>
                <p className="mt-3 text-sm leading-7 text-slate-100/90">{attack.reason}</p>
              </div>
              <div className="rounded-md border border-emerald-500/25 bg-emerald-950/35 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-emerald-200/70">Fix Suggestion</p>
                <p className="mt-3 text-sm leading-7 text-emerald-50/90">{attack.fix}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

export default function Home() {
  const [apiUrl, setApiUrl] = useState('');
  const [description, setDescription] = useState(starterDescription);
  const [attacks, setAttacks] = useState<AttackFinding[]>([]);
  const [selectedAttack, setSelectedAttack] = useState<AttackFinding | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<SimulationResponse['source']>('fallback');
  const [showFailedAttacks, setShowFailedAttacks] = useState(false);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to launch simulation.');

  useEffect(() => {
    if (!loading) {
      setLoaderIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoaderIndex((current) => (current + 1) % loaderFrames.length);
    }, 1250);

    return () => window.clearInterval(interval);
  }, [loading]);

  const endpoint = useMemo(() => buildEndpoint(description, apiUrl), [description, apiUrl]);
  const successfulAttacks = attacks.filter((attack) => attack.success);
  const failedAttacks = attacks.filter((attack) => !attack.success);

  async function handleSimulate() {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return;
    }

    setLoading(true);
    setStatusMessage('Dispatching LLM agents...');

    try {
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: trimmedDescription, apiUrl: apiUrl.trim() })
      });

      const data = (await response.json()) as SimulationResponse;
      const simulation = data?.attacks?.length ? data : fallbackSimulation(trimmedDescription, apiUrl.trim());

      setAttacks(simulation.attacks);
      setSource(simulation.source);
      setStatusMessage(simulation.source === 'llm' ? 'Live attack plan generated.' : 'Demo fallback loaded with curated attacks.');
    } catch {
      const simulation = fallbackSimulation(trimmedDescription, apiUrl.trim());
      setAttacks(simulation.attacks);
      setSource(simulation.source);
      setStatusMessage('Network fallback engaged.');
    } finally {
      setLoading(false);
    }
  }

  const attackRows = attacks;
  const activeScore = attacks.length > 0 ? calculateSecurityScore(attacks) : 100;
  const scoreTone = activeScore >= 70 ? 'text-emerald-300' : activeScore >= 45 ? 'text-amber-300' : 'text-red-300';

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-shell opacity-20" />
      <div className="absolute inset-0 noise-overlay opacity-20 mix-blend-soft-light" />
      <div className="absolute left-1/2 top-[-8rem] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-[-6rem] h-[26rem] w-[26rem] rounded-full bg-red-500/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-300 shadow-lg shadow-black/20">
  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_16px_rgba(239,68,68,0.9)]" />
  AI + API Red-Team Engine
</div>

<div>
  <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
    Break your API before attackers do.
  </h1>

  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
    Launch real-time attack simulations against AI systems and traditional APIs. 
    Watch malicious inputs flow through your endpoints, see where they succeed, 
    and uncover critical vulnerabilities with live security scoring and fix recommendations.
  </p>
</div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[26rem] xl:grid-cols-1">
            <MetricCard label="Security Score" value={`${activeScore} / 100`} accent={scoreTone} />
            <MetricCard label="Threat Posture" value={scoreLabel(activeScore)} accent="text-sky-200" />
          </div>
        </header>

        <section className="glass-panel relative overflow-hidden rounded-xl border border-slate-700/60 p-6 shadow-2xl shadow-black/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,0.12),transparent_32%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <label htmlFor="api-url" className="text-sm font-medium text-slate-200">
                  API URL / Endpoint
                </label>
                <input
                  id="api-url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://api.example.com/v1/summarize or POST /api/summarize"
                  className="mt-3 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-3 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div>
                <label htmlFor="system-description" className="text-sm font-medium text-slate-200">
                  Describe your API / AI system
                </label>
                <textarea
                  id="system-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="This API summarizes user documents"
                  className="mt-3 min-h-[150px] w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-5 py-4 font-mono text-sm leading-6 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/20 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleSimulate}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-lg border border-red-400/30 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-glowRed transition hover:scale-[1.01] hover:from-red-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Simulating...' : 'Simulate Attack'}
                </button>

                <label className="inline-flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={showFailedAttacks}
                    onChange={(event) => setShowFailedAttacks(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-sky-400 focus:ring-sky-400"
                  />
                  Show Failed Attacks
                </label>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">{endpoint}</span>
                <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">
                  {source === 'llm' ? 'LLM-backed' : 'Fallback dataset'}
                </span>
                <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 font-mono">
                  {attacks.length} attack vectors
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/70 bg-slate-950/70 p-5 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Simulation Console</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">{loading ? 'Running agents...' : 'Standing by'}</h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900 text-sky-200 shadow-glowBlue">
                  ⚡
                </div>
              </div>

              <div className="mt-5 rounded-md border border-slate-800 bg-black/50 p-4 font-mono text-xs leading-6 text-slate-300">
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  terminal@simulator
                </div>
                <div className="mt-3">
                  <span className="text-slate-500">$ </span>
                  <span className="text-slate-100">launch red-team flow</span>
                </div>
                <motion.p
                  key={loaderIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 text-slate-200"
                >
                  {loading ? loaderFrames[loaderIndex] : statusMessage}
                </motion.p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.08),transparent_35%)]" />
          <ArrowFlow attackCount={attackRows.length} successCount={successfulAttacks.length} />

          <div className="relative z-10 grid gap-6 xl:grid-cols-[1fr_360px_1fr] xl:items-center">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]" />
                <h2 className="text-lg font-semibold text-white">Attack Attempts</h2>
              </div>

              <div className="grid gap-4">
                {attackRows.map((attack, index) => (
                  <AttackCard
                    key={`${attack.type}-${index}`}
                    attack={attack}
                    index={index}
                    onClick={setSelectedAttack}
                    muted={!showFailedAttacks && !attack.success}
                  />
                ))}
              </div>
            </div>

            <div className="self-center">
              <SystemNode endpoint={endpoint} description={description} source={source} loading={loading} />
            </div>

            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.85)]" />
                <h2 className="text-lg font-semibold text-white">Successful Breaches</h2>
              </div>

              <div className="grid gap-4">
                {successfulAttacks.length > 0 ? (
                  successfulAttacks.map((attack, index) => (
                    <ResultCard key={`${attack.type}-success-${index}`} attack={attack} index={index} onClick={setSelectedAttack} />
                  ))
                ) : (
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-950/20 px-5 py-8 text-sm text-emerald-100/80">
                    No breaches yet. Launch a simulation to see successful attacks appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl shadow-black/30">
          <div className="border-b border-slate-800/70 px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">Attack Log</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Detailed outcome timeline</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800/70 text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.3em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Attack Type</th>
                  <th className="px-6 py-4">Success / Fail</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Short Reason</th>
                  <th className="px-6 py-4">Fix Suggestion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-200">
                {attackRows.map((attack, index) => (
                  <tr key={`${attack.type}-${index}`} className="bg-slate-950/40 transition hover:bg-slate-900/60">
                    <td className="px-6 py-4 font-medium text-white">{attack.type}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                          attack.success
                            ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                            : 'border-red-400/30 bg-red-400/10 text-red-200'
                        }`}
                      >
                        {attack.success ? 'Success' : 'Blocked'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] ${
                          attack.severity === 'HIGH'
                            ? 'border-red-400/30 bg-red-400/10 text-red-200'
                            : attack.severity === 'MEDIUM'
                              ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                              : 'border-sky-400/30 bg-sky-400/10 text-sky-200'
                        }`}
                      >
                        {attack.severity}
                      </span>
                    </td>
                    <td className="max-w-xl px-6 py-4 text-slate-300">{attack.reason}</td>
                    <td className="max-w-xl px-6 py-4 text-emerald-100/90">{attack.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {showFailedAttacks && failedAttacks.length > 0 ? (
          <section className="glass-panel rounded-xl border border-slate-700/60 p-6 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.85)]" />
              <h2 className="text-lg font-semibold text-white">Blocked Attempts</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {failedAttacks.map((attack, index) => (
                <AttackCard key={`failed-${attack.type}-${index}`} attack={attack} index={index} onClick={setSelectedAttack} muted />
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <AttackDetailModal attack={selectedAttack} onClose={() => setSelectedAttack(null)} />
    </main>
  );
}
*/