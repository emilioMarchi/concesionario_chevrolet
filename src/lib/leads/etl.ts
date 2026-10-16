import 'server-only';
import { AGENT_ID, getIntelligence, isMemoryEnabled, normalizeUserId } from '@/lib/intelligence';
import { leadsStore } from './store';
import { qualifyLead } from './qualify';
import { notifyHotLead } from './notify';
import type { ChatMessage, Conversation, Lead } from '@/types/leads';

export interface SyncResult {
  userId: string;
  threads: number;
  messages: number;
  leadScore: number;
  leadType: string;
}

/** Un thread borrado en la plataforma responde 404; no debe abortar el sync. */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 404
  );
}

/** La plataforma responde 403 `MEMORY_NOT_ENTITLED` si la licencia no incluye memoria. */
function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 403
  );
}

// La plataforma Intelligence devuelve 502/503/504 esporádicos; reintentamos con
// backoff exponencial en lugar de perder el sync completo.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status?: number }).status === 'number' &&
    RETRYABLE_STATUS.has((error as { status: number }).status)
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts) throw error;
      const delay = 250 * 2 ** (attempt - 1);
      console.warn(`[etl] ${label} falló (intento ${attempt}/${attempts}); reintento en ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// La memoria es opcional; si la licencia no la incluye (403), dejamos de pedirla
// en este proceso para no repetir la llamada ni ensuciar los logs.
let memoryUnavailable = false;

async function loadMemories(
  intelligence: NonNullable<ReturnType<typeof getIntelligence>>,
  userId: string,
): Promise<string[]> {
  if (memoryUnavailable || !isMemoryEnabled()) return [];
  try {
    const response = await withRetry(`memories ${userId}`, () =>
      intelligence.listMemories({ userId }),
    );
    return response.memories.map((memory) => memory.content);
  } catch (error) {
    if (isPermissionDenied(error)) {
      memoryUnavailable = true;
      console.info(
        '[etl] Intelligence sin memoria para esta licencia; se omite el enriquecimiento por memoria.',
      );
    } else {
      console.warn('[etl] no se pudieron leer memorias:', error);
    }
    return [];
  }
}

async function syncVisitor(userId: string): Promise<SyncResult> {
  const intelligence = getIntelligence();
  if (!intelligence) throw new Error('intelligence_not_configured');

  const { threads } = await withRetry(`listThreads ${userId}`, () =>
    intelligence.listThreads({ userId, agentId: AGENT_ID }),
  );

  const conversations: Conversation[] = [];
  for (const thread of threads) {
    let messages: Awaited<ReturnType<typeof intelligence.getThreadMessages>>['messages'];
    try {
      ({ messages } = await withRetry(`thread ${thread.id}`, () =>
        intelligence.getThreadMessages({ threadId: thread.id, userId }),
      ));
    } catch (error) {
      if (isNotFound(error)) {
        console.warn(`[etl] thread ${thread.id} no existe; se omite`);
        continue;
      }
      throw error;
    }
    const mapped: ChatMessage[] = messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content ?? null,
      createdAt: null,
    }));
    const conversation: Conversation = {
      threadId: thread.id,
      userId,
      agentId: AGENT_ID,
      name: thread.name ?? null,
      messages: mapped,
      lastRunAt: thread.lastRunAt ?? null,
      syncedAt: new Date().toISOString(),
    };
    await leadsStore.upsertConversation(conversation);
    conversations.push(conversation);
  }

  const memories = await loadMemories(intelligence, userId);

  const events = await leadsStore.listEvents({ visitorId: userId });
  await leadsStore.recordVisitor({ userId, agentId: AGENT_ID, threadIds: threads.map((t) => t.id) });

  const computed = qualifyLead({ visitorId: userId, conversations, events, memories });

  // Preservar campos gestionados manualmente y el estado de notificación.
  const existing = await leadsStore.getLead(userId);
  const lead: Lead = {
    ...computed,
    notes: existing?.notes,
    notifiedAt: existing?.notifiedAt,
    status: existing?.status === 'contacted' ? 'contacted' : computed.status,
  };

  // F6: notificar una sola vez cuando un lead pasa a "hot" y no fue contactado.
  const threshold = Number(process.env.LEAD_HOT_THRESHOLD ?? 60);
  if (lead.status !== 'contacted' && lead.leadScore >= threshold && !lead.notifiedAt) {
    const visitor = (await leadsStore.listVisitors()).find((v) => v.userId === userId) ?? null;
    if (await notifyHotLead(lead, visitor)) {
      lead.notifiedAt = new Date().toISOString();
    }
  }

  await leadsStore.upsertLead(lead);

  return {
    userId,
    threads: threads.length,
    messages: conversations.reduce((total, conversation) => total + conversation.messages.length, 0),
    leadScore: lead.leadScore,
    leadType: lead.classification.type,
  };
}

/**
 * Sincroniza threads/mensajes/memorias de Intelligence a Firestore y recalifica
 * el lead. Sin `userId`, recorre todos los visitantes conocidos.
 */
export async function runEtl(userId?: string): Promise<SyncResult[]> {
  const rawTargets = userId
    ? [userId]
    : (await leadsStore.listVisitors()).map((visitor) => visitor.userId);
  // Los visitantes persistidos podrían traer el id scopeado por proyecto
  // (`{projectId}_{userId}`); lo normalizamos antes de consultar a Intelligence.
  const targets = Array.from(
    new Set(rawTargets.map((target) => normalizeUserId(target) ?? target)),
  );
  const results: SyncResult[] = [];
  for (const target of targets) {
    try {
      results.push(await syncVisitor(target));
    } catch (error) {
      console.error(`[etl] fallo al sincronizar ${target}:`, error);
    }
  }
  return results;
}
