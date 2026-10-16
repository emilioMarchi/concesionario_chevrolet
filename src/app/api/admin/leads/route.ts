import { NextResponse } from 'next/server';
import { leadsStore } from '@/lib/leads/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [leads, visitors] = await Promise.all([leadsStore.listLeads(), leadsStore.listVisitors()]);
  const visitorById = new Map(visitors.map((visitor) => [visitor.userId, visitor]));
  const enriched = leads
    .map((lead) => ({
      ...lead,
      threadCount: visitorById.get(lead.visitorId)?.threadIds?.length ?? 0,
      lastSeen: visitorById.get(lead.visitorId)?.lastSeen ?? null,
    }))
    .sort((a, b) => b.leadScore - a.leadScore);
  return NextResponse.json({ ok: true, leads: enriched });
}
