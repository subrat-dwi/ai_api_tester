import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { AttackFinding, SimulationMode } from '@/lib/types';

export type StoredTest = {
  id: string;
  userId: string;
  email?: string;
  description: string;
  apiUrl?: string;
  mode: SimulationMode;
  securityScore: number;
  attackCount: number;
  successCount: number;
  compromisedLabel?: string | null;
  createdAt: Date | null;
};

type SaveTestRunInput = {
  userId: string;
  email?: string | null;
  description: string;
  apiUrl?: string;
  mode: SimulationMode;
  securityScore: number;
  attacks: AttackFinding[];
  compromisedLabel?: string | null;
};

function toDateValue(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

export async function saveUserProfile(userId: string, email: string) {
  await setDoc(
    doc(db, 'users', userId),
    {
      uid: userId,
      email,
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function saveTestRun(input: SaveTestRunInput): Promise<string> {
  const testRef = doc(collection(db, 'tests'));
  const successCount = input.attacks.filter((attack) => attack.success).length;
  const batch = writeBatch(db);

  batch.set(testRef, {
    userId: input.userId,
    email: input.email ?? null,
    description: input.description,
    apiUrl: input.apiUrl ?? '',
    mode: input.mode,
    securityScore: input.securityScore,
    attackCount: input.attacks.length,
    successCount,
    compromisedLabel: input.compromisedLabel ?? null,
    createdAt: serverTimestamp()
  });

  input.attacks.forEach((attack) => {
    const attackRef = doc(collection(db, 'tests', testRef.id, 'attacks'));
    batch.set(attackRef, {
      type: attack.type,
      input: attack.input,
      success: attack.success,
      severity: attack.severity,
      reason: attack.reason,
      impact: attack.impact,
      category: attack.category,
      fix: attack.fix,
      weakness: attack.weakness,
      order: attack.order
    });
  });

  await batch.commit();
  return testRef.id;
}

export function subscribeToUserTests(userId: string, onChange: (tests: StoredTest[]) => void) {
  const testsQuery = query(collection(db, 'tests'), where('userId', '==', userId));

  return onSnapshot(testsQuery, (snapshot) => {
    const tests = snapshot.docs
      .map((snapshotDoc) => {
        const data = snapshotDoc.data();

        return {
          id: snapshotDoc.id,
          userId: String(data.userId ?? userId),
          email: typeof data.email === 'string' ? data.email : undefined,
          description: String(data.description ?? ''),
          apiUrl: typeof data.apiUrl === 'string' ? data.apiUrl : '',
          mode: data.mode === 'live' ? 'live' : 'simulation',
          securityScore: typeof data.securityScore === 'number' ? data.securityScore : 0,
          attackCount: typeof data.attackCount === 'number' ? data.attackCount : 0,
          successCount: typeof data.successCount === 'number' ? data.successCount : 0,
          compromisedLabel: typeof data.compromisedLabel === 'string' ? data.compromisedLabel : null,
          createdAt: toDateValue(data.createdAt)
        } satisfies StoredTest;
      })
      .sort((left, right) => (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0));

    onChange(tests);
  });
}