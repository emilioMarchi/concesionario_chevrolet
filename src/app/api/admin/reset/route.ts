import { NextResponse } from 'next/server';
import { resetAllData } from '@/lib/leads/reset';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() {
  const result = await resetAllData();
  return NextResponse.json({ ok: true, ...result });
}
