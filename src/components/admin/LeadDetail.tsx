'use client';

import { useState } from 'react';
import { InterestBadge, StatusBadge, TypeBadge } from '@/components/admin/StatusBadge';
import type { Conversation, Lead, LeadStatus, TelemetryEvent, Visitor } from '@/types/leads';

function renderContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) return String((part as { text: unknown }).text ?? '');
        return JSON.stringify(part);
      })
      .join('\n');
  }
  if (content == null) return '';
  return JSON.stringify(content, null, 2);
}

export default function LeadDetail({
  visitorId,
  lead,
  visitor,
  conversations,
  events,
}: {
  visitorId: string;
  lead: Lead | null;
  visitor: Visitor | null;
  conversations: Conversation[];
  events: TelemetryEvent[];
}) {
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'new');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${visitorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (res.ok) setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold">Visitante {visitorId.slice(0, 8)}</h1>
          {lead && <TypeBadge type={lead.classification.type} />}
          {lead && <InterestBadge level={lead.classification.interestLevel} />}
          {lead && <StatusBadge status={status} />}
          {lead && <span className="ml-auto text-sm text-muted">Score {lead.leadScore}</span>}
        </div>

        {lead?.summary && <p className="mt-3 text-sm text-muted">{lead.summary}</p>}

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div><span className="text-muted">Email: </span>{lead?.contact.email || '—'}</div>
          <div><span className="text-muted">Teléfono: </span>{lead?.contact.phone || '—'}</div>
          <div><span className="text-muted">Nombre: </span>{lead?.contact.name || '—'}</div>
        </div>

        {visitor && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <span>Primer visto: {visitor.firstSeen}</span>
            <span>Último: {visitor.lastSeen}</span>
            <span>Hilos: {visitor.threadIds?.length ?? 0}</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Gestión</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as LeadStatus)}
            className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="new">new</option>
            <option value="hot">hot</option>
            <option value="contacted">contacted</option>
          </select>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notas internas…"
            className="min-w-[240px] flex-1 rounded-xl border border-line bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          {savedAt && <span className="text-xs text-muted">Guardado {savedAt}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Conversaciones ({conversations.length})</h2>
        <div className="mt-3 space-y-3">
          {conversations.length === 0 && <p className="text-sm text-muted">Sin conversaciones sincronizadas.</p>}
          {conversations.map((conversation) => (
            <details key={conversation.threadId} className="rounded-xl border border-line">
              <summary className="cursor-pointer px-4 py-2 text-sm">
                {conversation.name || `Hilo ${conversation.threadId.slice(0, 8)}`} · {conversation.messages.length} mensajes
              </summary>
              <div className="space-y-2 border-t border-line px-4 py-3">
                {conversation.messages.map((message) => (
                  <div key={message.id} className="text-sm">
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${message.role === 'user' ? 'bg-accent text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                      {message.role}
                    </span>
                    <span className="whitespace-pre-wrap">{renderContent(message.content)}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Recorrido UI ({events.length})</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {events.length === 0 && <li className="text-muted">Sin eventos.</li>}
          {events.slice(0, 200).map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="w-40 shrink-0 text-xs text-muted">{new Date(event.ts).toLocaleString()}</span>
              <span className="font-mono text-xs">{event.type}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
