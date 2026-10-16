import 'server-only';
import type { Lead, Visitor } from '@/types/leads';

export interface LeadWebhookPayload {
  event: 'lead.hot';
  lead: Lead;
  visitor: Visitor | null;
  sentAt: string;
}

/**
 * Notifica un lead caliente a un webhook externo (CRM, Slack, etc.).
 * Se activa con `LEAD_WEBHOOK_URL`. Opcionalmente `LEAD_WEBHOOK_AUTH` se envía
 * tal cual en el header `Authorization`.
 *
 * @returns `true` si el webhook respondió 2xx; `false` si no está configurado o falló.
 */
export async function notifyHotLead(lead: Lead, visitor: Visitor | null): Promise<boolean> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return false;

  const payload: LeadWebhookPayload = {
    event: 'lead.hot',
    lead,
    visitor,
    sentAt: new Date().toISOString(),
  };

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const auth = process.env.LEAD_WEBHOOK_AUTH;
  if (auth) headers.authorization = auth;

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
    if (!res.ok) {
      console.warn(`[notify] webhook respondió ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[notify] fallo el webhook de lead:', error);
    return false;
  }
}
