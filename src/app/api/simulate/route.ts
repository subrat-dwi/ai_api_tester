import { NextResponse } from 'next/server';

import { fallbackSimulation, generateSimulation } from '@/lib/llm';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { description?: string; apiUrl?: string };
    const description = body.description ?? '';
    const apiUrl = body.apiUrl ?? '';
    const simulation = await generateSimulation(description, apiUrl);

    return NextResponse.json(simulation);
  } catch {
    return NextResponse.json(fallbackSimulation('generic API'));
  }
}