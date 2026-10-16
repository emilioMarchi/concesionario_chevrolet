import { NextRequest, NextResponse } from 'next/server';
import { getIntelligence } from '@/lib/intelligence';
import { runEtl } from '@/lib/leads/etl';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.ETL_SECRET;
  if (!secret) return true;
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
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
