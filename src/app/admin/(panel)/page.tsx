import { leadsStore } from '@/lib/leads/store';
import { getDb } from '@/lib/firebase-admin';
import { getIntelligence } from '@/lib/intelligence';

export const dynamic = 'force-dynamic';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}

export default async function AdminDashboard() {
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

  const mode = getDb() ? 'Firestore' : 'Memoria (sin credenciales)';
  const intelligence = getIntelligence() ? 'configurada' : 'no configurada';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="mt-1 text-sm text-muted">
          Persistencia: {mode}. Intelligence: {intelligence}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Visitantes" value={visitors.length} />
        <Stat label="Leads" value={leads.length} />
        <Stat label="Contactables" value={contactable} />
        <Stat label="Eventos UI" value={events.length} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Conversaciones" value={conversations.length} />
        <Stat label="Mensajes" value={conversations.reduce((t, c) => t + c.messages.length, 0)} />
        <Stat label="Interés alto" value={byInterest.high} />
        <Stat label="Soporte" value={byType.support} />
      </div>
    </div>
  );
}
