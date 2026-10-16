import 'server-only';
import { AGENT_ID, getIntelligence, isMemoryEnabled, normalizeUserId } from '@/lib/intelligence';
import { leadsStore } from './store';
import { cancelAllScheduledSync } from './auto-sync';

export interface ResetResult {
  local: {
    visitors: number;
    events: number;
    conversations: number;
    leads: number;
  };
  remote: {
    threads: number;
    memories: number;
  };
  errors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reinicia el backoffice a cero:
 *   1. Borra los threads/mensajes (y memorias, si están habilitadas) en
 *      CopilotKit Intelligence para cada visitante conocido.
 *   2. Borra las colecciones propias (visitors, events, conversations, leads).
 *
 * Es irreversible. Se recopilan usuarios/threads ANTES de limpiar el store
 * local, porque ahí vive la lista de visitantes.
 */
export async function resetAllData(): Promise<ResetResult> {
  const intelligence = getIntelligence();

  // Evita que un ETL diferido agendado repueble los datos apenas terminemos.
  cancelAllScheduledSync();

  const [visitors, conversations] = await Promise.all([
    leadsStore.listVisitors(),
    leadsStore.listConversations(),
  ]);

  const userIds = new Set<string>();
  for (const visitor of visitors) userIds.add(normalizeUserId(visitor.userId) ?? visitor.userId);
  for (const conversation of conversations) {
    userIds.add(normalizeUserId(conversation.userId) ?? conversation.userId);
  }

  const remote = { threads: 0, memories: 0 };
  const errors: string[] = [];

  if (intelligence) {
    for (const userId of userIds) {
      try {
        const { threads } = await intelligence.listThreads({ userId, agentId: AGENT_ID });
        for (const thread of threads) {
          try {
            await intelligence.deleteThread({ threadId: thread.id, userId, agentId: AGENT_ID });
            remote.threads += 1;
          } catch (error) {
            errors.push(`deleteThread ${thread.id}: ${errorMessage(error)}`);
          }
        }
      } catch (error) {
        errors.push(`listThreads ${userId}: ${errorMessage(error)}`);
      }

      // La memoria es opt-in; si la licencia no la incluye, la plataforma 403ea.
      if (isMemoryEnabled()) {
        try {
          const { memories } = await intelligence.listMemories({
            userId,
            includeInvalidated: true,
          });
          for (const memory of memories) {
            try {
              await intelligence.removeMemory({ userId, id: memory.id });
              remote.memories += 1;
            } catch (error) {
              errors.push(`removeMemory ${memory.id}: ${errorMessage(error)}`);
            }
          }
        } catch (error) {
          errors.push(`listMemories ${userId}: ${errorMessage(error)}`);
        }
      }
    }
  }

  const local = await leadsStore.resetAll();

  return { local, remote, errors };
}
