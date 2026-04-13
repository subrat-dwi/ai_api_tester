'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { currentUser, loading, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace('/');
    }
  }, [currentUser, loading, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signUp(email, password);
      router.replace('/');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to create account.';
      console.error('[SignupPage] sign-up failed', caught);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-slate-950/85 p-8 shadow-2xl shadow-black/30">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">AI Red-Team Simulator</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Save test history, breached attacks, and scores across sessions.</p>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm text-slate-200">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/60"
              required
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-slate-700/80 bg-slate-900/70 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400/60"
              required
            />
          </label>

          {error ? <pre className="whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">{error}</pre> : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-emerald-400/30 bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account? <Link href="/login" className="text-sky-300 hover:text-sky-200">Sign in</Link>
        </p>
      </section>
    </main>
  );
}