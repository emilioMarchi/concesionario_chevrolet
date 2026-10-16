import { NextRequest, NextResponse } from 'next/server';
import { AGENT_ID, anonUserCookie, readUserId } from '@/lib/intelligence';
import { leadsStore } from '@/lib/leads/store';
import { recordVisitor } from '@/lib/leads/visitors';
import { scheduleSync } from '@/lib/leads/auto-sync';
import type { TelemetryEvent } from '@/types/leads';

export const dynamic = 'force-dynamic';

interface IncomingEvent {
  id?: string;
  ts?: string;
  type?: string;
  name?: string;
  payload?: unknown;
  threadId?: string | null;
  runId?: string | null;
  source?: TelemetryEvent['source'];
}

export async function POST(req: NextRequest) {
  // Si el runtime de CopilotKit todavía no emitió la cookie `nv_uid`, la
  // acuñamos acá para no perder la telemetría temprana. La seteamos en la
  // respuesta para que la identidad quede fijada (el runtime reusa esta cookie).
  let visitorId = readUserId(req);
  let mintedCookie = false;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    mintedCookie = true;
  }

  let body: { events?: IncomingEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const incoming = Array.isArray(body.events) ? body.events : [];
  const now = new Date().toISOString();
  const events: TelemetryEvent[] = incoming.map((e) => ({
    id: e.id ?? crypto.randomUUID(),
    visitorId,
    threadId: e.threadId ?? null,
    runId: e.runId ?? null,
    type: e.type ?? 'unknown',
    name: e.name ?? null,
    payload: e.payload ?? null,
    source: e.source ?? 'ui',
    ts: e.ts ?? now,
  }));

  let stored = false;
  try {
    // Aprovechamos para registrar/actualizar el visitante aunque aún no haya chat.
    await recordVisitor({ userId: visitorId, agentId: AGENT_ID });
    await leadsStore.addEvents(events);
    stored = true;
    // Recalifica el lead de forma diferida (debounce) para que el panel se actualice solo.
    scheduleSync(visitorId);
  } catch (error) {
    console.error('[telemetry] fallo al persistir:', error);
  }

  const res = NextResponse.json({ ok: stored, accepted: stored ? events.length : 0 });
  if (mintedCookie && visitorId) res.headers.append('Set-Cookie', anonUserCookie(visitorId));
  return res;
}
