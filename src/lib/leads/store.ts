import 'server-only';
import { FieldValue, type Query } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase-admin';
import type {
  Conversation,
  Lead,
  TelemetryEvent,
  Visitor,
} from '@/types/leads';

export const COLLECTIONS = {
  visitors: 'cpk_visitors',
  events: 'cpk_events',
  conversations: 'cpk_conversations',
  leads: 'leads',
} as const;

// Fallback en memoria para dev/local sin credenciales de Firestore. No persiste
// entre procesos (serverless), pero permite ejercitar el flujo completo.
const memory = {
  visitors: new Map<string, Visitor>(),
  events: [] as TelemetryEvent[],
  conversations: new Map<string, Conversation>(),
  leads: new Map<string, Lead>(),
};

function db() {
  return getDb();
}

export const leadsStore = {
  async recordVisitor(input: { userId: string; agentId: string; threadIds?: string[] }): Promise<void> {
    const now = new Date().toISOString();
    const firestore = db();
    if (!firestore) {
      const prev = memory.visitors.get(input.userId);
      memory.visitors.set(input.userId, {
        userId: input.userId,
        agentId: input.agentId,
        firstSeen: prev?.firstSeen ?? now,
        lastSeen: now,
        threadIds: Array.from(new Set([...(prev?.threadIds ?? []), ...(input.threadIds ?? [])])),
      });
      return;
    }
    const ref = firestore.collection(COLLECTIONS.visitors).doc(input.userId);
    const existing = await ref.get();
    await ref.set(
      {
        userId: input.userId,
        agentId: input.agentId,
        firstSeen: existing.exists ? (existing.data()?.firstSeen ?? now) : now,
        lastSeen: now,
        threadIds: existing.exists ? (existing.data()?.threadIds ?? []) : [],
      },
      { merge: true },
    );
    if (input.threadIds?.length) {
      await ref.update({ threadIds: FieldValue.arrayUnion(...input.threadIds) });
    }
  },

  async addEvents(events: TelemetryEvent[]): Promise<void> {
    if (!events.length) return;
    const firestore = db();
    if (!firestore) {
      memory.events.push(...events);
      return;
    }
    const batch = firestore.batch();
    for (const event of events) {
      batch.set(firestore.collection(COLLECTIONS.events).doc(event.id), event);
    }
    await batch.commit();
  },

  async upsertConversation(conversation: Conversation): Promise<void> {
    const firestore = db();
    if (!firestore) {
      memory.conversations.set(conversation.threadId, conversation);
      return;
    }
    await firestore
      .collection(COLLECTIONS.conversations)
      .doc(conversation.threadId)
      .set(conversation, { merge: true });
  },

  async upsertLead(lead: Lead): Promise<void> {
    const firestore = db();
    if (!firestore) {
      memory.leads.set(lead.visitorId, lead);
      return;
    }
    await firestore.collection(COLLECTIONS.leads).doc(lead.visitorId).set(lead, { merge: true });
  },

  async listVisitors(): Promise<Visitor[]> {
    const firestore = db();
    if (!firestore) return Array.from(memory.visitors.values());
    const snap = await firestore.collection(COLLECTIONS.visitors).get();
    return snap.docs.map((d) => {
      const data = d.data() as Visitor;
      return { ...data, threadIds: data.threadIds ?? [] };
    });
  },

  async listEvents(filter?: { visitorId?: string; threadId?: string }): Promise<TelemetryEvent[]> {
    const firestore = db();
    if (!firestore) {
      return memory.events.filter(
        (e) =>
          (!filter?.visitorId || e.visitorId === filter.visitorId) &&
          (!filter?.threadId || e.threadId === filter.threadId),
      );
    }
    let query: Query = firestore.collection(COLLECTIONS.events);
    if (filter?.visitorId) query = query.where('visitorId', '==', filter.visitorId);
    if (filter?.threadId) query = query.where('threadId', '==', filter.threadId);
    // Sin orderBy en la query para no exigir índices compuestos; ordenamos en memoria.
    const snap = await query.limit(2000).get();
    return snap.docs
      .map((d) => d.data() as TelemetryEvent)
      .sort((a, b) => b.ts.localeCompare(a.ts));
  },

  async listConversations(): Promise<Conversation[]> {
    const firestore = db();
    if (!firestore) return Array.from(memory.conversations.values());
    const snap = await firestore.collection(COLLECTIONS.conversations).get();
    return snap.docs.map((d) => d.data() as Conversation);
  },

  async getConversation(threadId: string): Promise<Conversation | null> {
    const firestore = db();
    if (!firestore) return memory.conversations.get(threadId) ?? null;
    const doc = await firestore.collection(COLLECTIONS.conversations).doc(threadId).get();
    return doc.exists ? (doc.data() as Conversation) : null;
  },

  async listLeads(): Promise<Lead[]> {
    const firestore = db();
    if (!firestore) return Array.from(memory.leads.values());
    const snap = await firestore.collection(COLLECTIONS.leads).get();
    return snap.docs.map((d) => d.data() as Lead);
  },

  async getLead(visitorId: string): Promise<Lead | null> {
    const firestore = db();
    if (!firestore) return memory.leads.get(visitorId) ?? null;
    const doc = await firestore.collection(COLLECTIONS.leads).doc(visitorId).get();
    return doc.exists ? (doc.data() as Lead) : null;
  },

  async updateLead(visitorId: string, patch: Partial<Lead>): Promise<void> {
    const firestore = db();
    if (!firestore) {
      const prev = memory.leads.get(visitorId);
      if (prev) memory.leads.set(visitorId, { ...prev, ...patch });
      return;
    }
    await firestore.collection(COLLECTIONS.leads).doc(visitorId).set(patch, { merge: true });
  },

  /** Borra TODOS los datos del backoffice (reinicia el panel a cero). */
  async resetAll(): Promise<{
    visitors: number;
    events: number;
    conversations: number;
    leads: number;
  }> {
    const firestore = db();
    if (!firestore) {
      const counts = {
        visitors: memory.visitors.size,
        events: memory.events.length,
        conversations: memory.conversations.size,
        leads: memory.leads.size,
      };
      memory.visitors.clear();
      memory.events.length = 0;
      memory.conversations.clear();
      memory.leads.clear();
      return counts;
    }

    const clearCollection = async (name: string): Promise<number> => {
      const snap = await firestore.collection(name).get();
      const refs = snap.docs.map((doc) => doc.ref);
      // Los batch de Firestore están limitados a 500 writes; vamos por tandas.
      for (let i = 0; i < refs.length; i += 450) {
        const batch = firestore.batch();
        for (const ref of refs.slice(i, i + 450)) batch.delete(ref);
        await batch.commit();
      }
      return refs.length;
    };

    const [visitors, events, conversations, leads] = await Promise.all([
      clearCollection(COLLECTIONS.visitors),
      clearCollection(COLLECTIONS.events),
      clearCollection(COLLECTIONS.conversations),
      clearCollection(COLLECTIONS.leads),
    ]);
    return { visitors, events, conversations, leads };
  },
};
