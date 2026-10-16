import { NextRequest, NextResponse } from 'next/server';
import { getIntelligence } from '@/lib/intelligence';
import { runEtl } from '@/lib/leads/etl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!getIntelligence()) {
    return NextResponse.json({ ok: false, error: 'intelligence_not_configured' }, { status: 503 });
  }
  let userId: string | undefined;
  try {
    const body = (await req.json()) as { userId?: string };
    userId = body?.userId;
  } catch {
    // body opcional
  }
  const results = await runEtl(userId);
  return NextResponse.json({ ok: true, synced: results.length, results });
}
