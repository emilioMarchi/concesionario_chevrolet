import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { LangGraphHttpAgent } from '@copilotkit/runtime/langgraph';
import { NextRequest, NextResponse } from 'next/server';

const OVNI_AGENT_URL = process.env.OVNI_AGENT_URL || 'http://localhost:8080';

const ENDPOINT = '/api/copilotkit';

export const runtime = new CopilotRuntime({
  agents: {
    default: new LangGraphHttpAgent({
      agentId: 'default',
      description: 'Agente OVNI - asistente de ventas y navegación de NovaMotors',
      url: `${OVNI_AGENT_URL}/copilotkit`,
    }),
  },
});

const createHandler = () =>
  copilotRuntimeNextJSAppRouterEndpoint({ runtime, endpoint: ENDPOINT });

export const handleInfo = async (req: NextRequest) => {
  const { handleRequest } = createHandler();
  const syntheticReq = new Request(req.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method: 'info' }),
  });
  return handleRequest(syntheticReq);
};

export const handlePost = async (req: NextRequest) => {
  try {
    const { handleRequest } = createHandler();

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

    if (isRpc) {
      return handleRequest(req);
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
      headers: req.headers,
      body: JSON.stringify(rpcBody),
    });

    return handleRequest(syntheticReq);
  } catch (error) {
    console.error('Error en ruta copilotkit:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    );
  }
};

export const handleOptions = async (req: NextRequest) => {
  const { handleRequest } = createHandler();
  return handleRequest(req);
};