import { NextResponse } from 'next/server';
import { leadsStore } from '@/lib/leads/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [leads, visitors, conversations, events] = await Promise.all([
    leadsStore.listLeads(),
    leadsStore.listVisitors(),
    leadsStore.listConversations(),
    leadsStore.listEvents(),
  ]);

  const byType = { lead: 0, conversation: 0, support: 0 };
  const byInterest = { high: 0, medium: 0, low: 0 };
  let contactable = 0;
  for (const lead of leads) {
    byType[lead.classification.type] += 1;
    byInterest[lead.classification.interestLevel] += 1;
    if (lead.contact.email || lead.contact.phone) contactable += 1;
  }

  return NextResponse.json({
    ok: true,
    metrics: {
      visitors: visitors.length,
      conversations: conversations.length,
      messages: conversations.reduce((total, c) => total + c.messages.length, 0),
      events: events.length,
      leads: leads.length,
      contactable,
      byType,
      byInterest,
    },
  });
}
