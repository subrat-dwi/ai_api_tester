import { NextResponse } from 'next/server';

import { fallbackSimulation, generateSimulation } from '@/lib/redteam';
import type { SimulationMode, AttackHistoryItem } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      description?: string;
      apiUrl?: string;
      mode?: SimulationMode;
      previousResults?: AttackHistoryItem[];
    };
    const description = body.description ?? '';
    const apiUrl = body.apiUrl ?? '';
    const mode = body.mode ?? 'simulation';
    const previousResults = body.previousResults ?? [];
    const simulation = await generateSimulation(description, apiUrl, previousResults, mode);

    return NextResponse.json(simulation);
  } catch {
    return NextResponse.json(fallbackSimulation('generic API'));
  }
}