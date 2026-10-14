import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { LangGraphHttpAgent } from '@copilotkit/runtime/langgraph';
import { NextRequest, NextResponse } from 'next/server';
import { preflightResponse, withCors } from '@/lib/cors';

const ENDPOINT = '/api/copilotkit';

// La URL del backend es configurable por entorno. En desarrollo cae a
// localhost; en producción es obligatoria (evita deployar apuntando al PC local
// por error). El backend expone el agente en `${OVNI_AGENT_URL}/copilotkit`.
function resolveAgentUrl(): string {
  const url = process.env.OVNI_AGENT_URL?.trim();
  if (url) return url.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'OVNI_AGENT_URL no está configurada. Definila en las variables de entorno ' +
        'de producción (ej. https://<subdominio>.ngrok-free.app).'
    );
  }
  return 'http://localhost:8080';
}

// El backend resuelve el agente (Firestore) con el header `x-agent-id`. Si no
// lo recibe, cae a un default hardcodeado y todas las apps hablan con el mismo
// agente sin importar qué se cambie en .env.local.
// `ngrok-skip-browser-warning` evita el interstitial de ngrok en el plan free.
function buildAgentHeaders(agentUrl: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.OVNI_AGENT_ID) headers['x-agent-id'] = process.env.OVNI_AGENT_ID;
  if (process.env.OVNI_CLIENT_ID) headers['x-client-id'] = process.env.OVNI_CLIENT_ID;
  if (agentUrl.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';
  return headers;
}

// Se construye de forma perezosa para que la configuración de entorno se lea en
// runtime (y no durante `next build`), y se cachea para reutilizar la instancia.
let cachedRuntime: CopilotRuntime | null = null;

function getRuntime(): CopilotRuntime {
  if (cachedRuntime) return cachedRuntime;
  const agentUrl = resolveAgentUrl();
  cachedRuntime = new CopilotRuntime({
    agents: {
      default: new LangGraphHttpAgent({
        agentId: 'default',
        description: 'Agente OVNI - asistente de ventas y navegación de NovaMotors',
        url: `${agentUrl}/copilotkit`,
        headers: buildAgentHeaders(agentUrl),
      }),
    },
  });
  return cachedRuntime;
}

const createHandler = () =>
  copilotRuntimeNextJSAppRouterEndpoint({ runtime: getRuntime(), endpoint: ENDPOINT });

export const handleInfo = async (req: NextRequest) => {
  const { handleRequest } = createHandler();
  const headers = new Headers({
    'content-type': 'application/json',
    ...buildAgentHeaders(resolveAgentUrl()),
  });

  const syntheticReq = new Request(req.url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ method: 'info' }),
  });
  return withCors(req, await handleRequest(syntheticReq));
};

export const handlePost = async (req: NextRequest) => {
  try {
    const { handleRequest } = createHandler();
    const agentHeaders = buildAgentHeaders(resolveAgentUrl());

    let rawBody: unknown;
    try {
      rawBody = await req.clone().json();
    } catch {
      rawBody = undefined;
    }

    const isRpc =
      !!rawBody &&
      typeof rawBody === 'object' &&
      'method' in (rawBody as Record<string, unknown>);

    // Los headers de agente se resuelven ANTES de las dos ramas: la rama RPC
    // devolvía `handleRequest(req)` con los headers del navegador, que nunca
    // traen `x-agent-id`.
    const forwardHeaders = new Headers(req.headers);
    for (const [key, value] of Object.entries(agentHeaders)) {
      forwardHeaders.set(key, value);
    }

    if (isRpc) {
      const res = await handleRequest(
        new Request(req.url, {
          method: 'POST',
          headers: forwardHeaders,
          body: JSON.stringify(rawBody),
        }),
      );
      return withCors(req, res);
    }

    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const agentIdx = parts.indexOf('agent');
    const agentId =
      agentIdx !== -1 && parts[agentIdx + 1] ? parts[agentIdx + 1] : 'default';
    const action =
      agentIdx !== -1 && parts[agentIdx + 2] ? parts[agentIdx + 2] : 'connect';

    const rpcBody = {
      method: `agent/${action}`,
      params: { agentId },
      body: rawBody ?? {},
    };

    const syntheticReq = new Request(req.url, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(rpcBody),
    });

    return withCors(req, await handleRequest(syntheticReq));
  } catch (error) {
    console.error('Error en ruta copilotkit:', error);
    return withCors(
      req,
      NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 })
    );
  }
};

export const handleOptions = async (req: NextRequest) => preflightResponse(req);
