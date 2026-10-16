import Link from 'next/link';
import { leadsStore } from '@/lib/leads/store';
import SyncButton from '@/components/admin/SyncButton';
import ResetButton from '@/components/admin/ResetButton';
import { InterestBadge, StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const [leads, visitors] = await Promise.all([leadsStore.listLeads(), leadsStore.listVisitors()]);
  const visitorById = new Map(visitors.map((visitor) => [visitor.userId, visitor]));
  const sorted = [...leads].sort((a, b) => b.leadScore - a.leadScore);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="mt-1 text-sm text-muted">{sorted.length} registro(s).</p>
        </div>
        <div className="flex items-center gap-2">
          <ResetButton />
          <SyncButton />
        </div>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
          Todavía no hay leads. Interactuá con el agente o pulsá «Sincronizar Intelligence».
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Visitante</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Interés</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Hilos</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead) => {
                const visitor = visitorById.get(lead.visitorId);
                const contact = lead.contact.email || lead.contact.phone || lead.contact.name || '—';
                return (
                  <tr key={lead.visitorId} className="border-b border-line last:border-0 hover:bg-black/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/leads/${lead.visitorId}`} className="font-medium text-accent hover:underline">
                        {lead.visitorId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold">{lead.leadScore}</td>
                    <td className="px-4 py-3"><TypeBadge type={lead.classification.type} /></td>
                    <td className="px-4 py-3"><InterestBadge level={lead.classification.interestLevel} /></td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-muted">{contact}</td>
                    <td className="px-4 py-3 text-muted">{visitor?.threadIds?.length ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
