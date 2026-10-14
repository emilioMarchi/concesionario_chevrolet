import {
  CopilotKitIntelligence,
  CopilotRuntime,
  createCopilotRuntimeHandler,
  CopilotRuntimeUser,
  McpAppsConfig,
} from '@copilotkit/runtime/v2';
import { HttpAgent } from '@ag-ui/client';
import { NextRequest } from 'next/server';
import { preflightResponse, withCors } from '@/lib/cors';
import { buildAgentHeaders, resolveAgentUrl } from '@/lib/ovni-agent';
import { OvniTranscriptionService } from '@/lib/transcription-service';

const BASE_PATH = '/api/copilotkit';
const ANON_USER_COOKIE = 'nv_uid';

type RuntimeHandler = (request: Request) => Promise<Response>;

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

let cachedHandler: RuntimeHandler | null = null;

function getHandler(): RuntimeHandler {
  if (cachedHandler) return cachedHandler;

  const agentUrl = resolveAgentUrl();

  // Optional Intelligence mode: requires CPK_INTELLIGENCE_API_KEY (project key).
  // Public cpk-* keys are client-side only and do NOT authenticate Intelligence.
  const intelligenceApiKey = process.env.CPK_INTELLIGENCE_API_KEY;

  let runtime: CopilotRuntime;
  let handler: ReturnType<typeof createCopilotRuntimeHandler>;

  const mcpConfig = buildMcpConfig();

  if (intelligenceApiKey) {
    // Intelligence runtime: durable threads, memory, realtime subscriptions.
    const intelligence = new CopilotKitIntelligence({ apiKey: intelligenceApiKey });
    runtime = new CopilotRuntime({
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
        const userId = match?.[1] ?? crypto.randomUUID();
        return { id: userId, name: `Usuario ${userId.slice(0, 8)}` };
      },
      memory: {
        access: async ({ consumer }) => ({
          user: consumer === 'agent' ? 'read-write' : 'read',
          project: 'read',
        }),
      },
      mcpApps: mcpConfig,
    });
    handler = createCopilotRuntimeHandler({
      runtime,
      basePath: BASE_PATH,
      mode: 'multi-route',
    });
  } else {
    // SSE mode with local in-memory thread endpoints (no durable persistence).
    runtime = new CopilotRuntime({
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
    handler = createCopilotRuntimeHandler({
      runtime,
      basePath: BASE_PATH,
      mode: 'multi-route',
    });
  }

  cachedHandler = handler;
  return cachedHandler;
}

async function delegate(req: NextRequest): Promise<Response> {
  // Set anonymous user cookie if not present (for Intelligence identifyUser).
  const res = await withCors(req, await getHandler()(req));
  if (!req.headers.get('cookie')?.includes(`${ANON_USER_COOKIE}=`)) {
    const userId = crypto.randomUUID();
    res.headers.append('Set-Cookie', `${ANON_USER_COOKIE}=${userId}; Path=/; SameSite=Lax; Max-Age=31536000; HttpOnly; Secure`);
  }
  return res;
}

export const handleGet = (req: NextRequest) => delegate(req);
export const handlePost = (req: NextRequest) => delegate(req);
export const handleOptions = async (req: NextRequest) => preflightResponse(req);
