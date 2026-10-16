import { notFound } from 'next/navigation';
import { leadsStore } from '@/lib/leads/store';
import LeadDetail from '@/components/admin/LeadDetail';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({ params }: { params: Promise<{ visitorId: string }> }) {
  const { visitorId } = await params;
  const [lead, visitor, conversations, events] = await Promise.all([
    leadsStore.getLead(visitorId),
    leadsStore.listVisitors().then((list) => list.find((v) => v.userId === visitorId) ?? null),
    leadsStore.listConversations().then((list) => list.filter((c) => c.userId === visitorId)),
    leadsStore.listEvents({ visitorId }),
  ]);

  if (!lead && !visitor) notFound();

  return (
    <LeadDetail
      visitorId={visitorId}
      lead={lead}
      visitor={visitor}
      conversations={conversations}
      events={events}
    />
  );
}
