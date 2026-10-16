import { NextRequest, NextResponse } from 'next/server';
import { leadsStore } from '@/lib/leads/store';
import type { LeadStatus } from '@/types/leads';

export const dynamic = 'force-dynamic';

const STATUSES: LeadStatus[] = ['new', 'hot', 'contacted'];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await params;
  const [lead, visitor, conversations, events] = await Promise.all([
    leadsStore.getLead(visitorId),
    leadsStore.listVisitors().then((list) => list.find((v) => v.userId === visitorId) ?? null),
    leadsStore.listConversations().then((list) => list.filter((c) => c.userId === visitorId)),
    leadsStore.listEvents({ visitorId }),
  ]);
  return NextResponse.json({ ok: true, lead, visitor, conversations, events });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await params;
  let body: { status?: LeadStatus; notes?: string };
  try {
    body = (await req.json()) as { status?: LeadStatus; notes?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const patch: { status?: LeadStatus; notes?: string } = {};
  if (body.status) {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: 'invalid_status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.notes === 'string') patch.notes = body.notes;
  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
  }

  await leadsStore.updateLead(visitorId, patch);
  const lead = await leadsStore.getLead(visitorId);
  return NextResponse.json({ ok: true, lead });
}
