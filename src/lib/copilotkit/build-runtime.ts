import {
  CopilotKitIntelligence,
  CopilotRuntime,
  CopilotRuntimeUser,
  McpAppsConfig,
} from '@copilotkit/runtime/v2';
import { HttpAgent } from '@ag-ui/client';
import { buildAgentHeaders, resolveAgentUrl } from '@/lib/ovni-agent';
import { OvniTranscriptionService } from '@/lib/transcription-service';
import {
  AGENT_ID,
  ANON_USER_COOKIE,
  isMemoryEnabled,
  normalizeUserId,
} from '@/lib/intelligence';
import { recordVisitor } from '@/lib/leads/visitors';
import { scheduleSync } from '@/lib/leads/auto-sync';
import { uuid } from '@/lib/copilotkit/uuid';

export const BASE_PATH = '/api/copilotkit';

function buildMcpConfig(): McpAppsConfig | undefined {
  const url = process.env.MCP_SERVER_URL;
  if (!url) return undefined;
  // MCPClientConfigHTTP shape: { type: 'http', url, headers?, serverId? }
  return {
    servers: [
      { type: 'http', url, headers: undefined, serverId: undefined },
    ],
  } satisfies McpAppsConfig;
}

let cachedRuntime: CopilotRuntime | null = null;

/**
 * Construye (una sola vez) el `CopilotRuntime` compartido por el runtime de Next
 * y el servicio standalone. Deliberadamente NO importa nada de `next/*` para
 * poder correr también en un proceso Node plano.
 */
export function buildCopilotRuntime(): CopilotRuntime {
  if (cachedRuntime) return cachedRuntime;

  const agentUrl = resolveAgentUrl();

  // Optional Intelligence mode: requires CPK_INTELLIGENCE_API_KEY (project key).
  // Public cpk-* keys are client-side only and do NOT authenticate Intelligence.
  const intelligenceApiKey = process.env.CPK_INTELLIGENCE_API_KEY;

  const mcpConfig = buildMcpConfig();

  if (intelligenceApiKey) {
    // Intelligence runtime: durable threads, memory, realtime subscriptions.
    const intelligence = new CopilotKitIntelligence({ apiKey: intelligenceApiKey });
    // F4: al crearse/actualizarse un thread, registramos al visitante y
    // programamos un ETL diferido para que el panel de leads se refresque solo.
    intelligence.onThreadCreated((thread) => {
      const userId = normalizeUserId(thread.createdById);
      if (!userId) return;
      void recordVisitor({ userId, agentId: AGENT_ID, threadIds: [thread.id] }).catch(() => {});
      scheduleSync(userId);
    });
    intelligence.onThreadUpdated((thread) => {
      const userId = normalizeUserId(thread.createdById);
      if (!userId) return;
      scheduleSync(userId);
    });
    cachedRuntime = new CopilotRuntime({
      agents: {
        default: new HttpAgent({
          url: `${agentUrl}/copilotkit`,
          headers: buildAgentHeaders(agentUrl),
        }),
      },
      licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
      transcriptionService: new OvniTranscriptionService(),
      intelligence,
      identifyUser: async (request: Request): Promise<CopilotRuntimeUser> => {
        const cookie = request.headers.get('cookie') ?? '';
        const match = cookie.match(new RegExp(`${ANON_USER_COOKIE}=([^;]+)`));
        const userId = match?.[1] ?? uuid();
        // Fire-and-forget: no debe bloquear el handshake del runtime.
        void recordVisitor({ userId, agentId: AGENT_ID }).catch(() => {});
        return { id: userId, name: `Usuario ${userId.slice(0, 8)}` };
      },
      // La memoria es opt-in: si la licencia no la incluye, omitirla evita el
      // 403 MEMORY_NOT_ENTITLED y el attach del MCP managed (no habilitado).
      memory: isMemoryEnabled()
        ? {
            access: async ({ consumer }) => ({
              user: consumer === 'agent' ? 'read-write' : 'read',
              project: 'read',
            }),
          }
        : undefined,
      mcpApps: mcpConfig,
    });
    return cachedRuntime;
  }

  // SSE mode with local in-memory thread endpoints (no durable persistence).
  cachedRuntime = new CopilotRuntime({
    agents: {
      default: new HttpAgent({
        url: `${agentUrl}/copilotkit`,
        headers: buildAgentHeaders(agentUrl),
      }),
    },
    licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
    transcriptionService: new OvniTranscriptionService(),
    mcpApps: mcpConfig,
  });
  return cachedRuntime;
}
