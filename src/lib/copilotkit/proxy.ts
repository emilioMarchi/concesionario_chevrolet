import { NextRequest } from 'next/server';
import { buildCorsHeaders, preflightResponse } from '@/lib/cors';
import { anonUserCookie, ANON_USER_COOKIE } from '@/lib/intelligence';
import { handleGet } from '@/lib/copilotkit-runtime';

const HOP_BY_HOP = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'transfer-encoding',
  'keep-alive',
  'upgrade',
]);

function runtimeBaseUrl(): string | null {
  const url = process.env.COPILOT_RUNTIME_URL?.trim();
  if (!url) return null;
  return url.replace(/\/+$/, '');
}

function appendAnonCookie(req: NextRequest, headers: Headers): void {
  if (req.headers.get('cookie')?.includes(`${ANON_USER_COOKIE}=`)) return;
  headers.append('Set-Cookie', anonUserCookie(crypto.randomUUID()));
}

async function proxy(req: NextRequest, base: string): Promise<Response> {
  const incoming = new URL(req.url);
  const target = `${base}${incoming.pathname}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers,
    redirect: 'manual',
  };
  if (method !== 'GET' && method !== 'HEAD') {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
      init.duplex = 'half';
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (error) {
    return Response.json(
      { error: 'COPILOT_RUNTIME_UNREACHABLE', detail: String(error) },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'content-encoding' || lower === 'set-cookie') return;
    outHeaders.set(key, value);
  });
  for (const cookie of (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []) {
    outHeaders.append('Set-Cookie', cookie);
  }
  for (const [key, value] of buildCorsHeaders(req.headers.get('origin'))) {
    outHeaders.set(key, value);
  }
  appendAnonCookie(req, outHeaders);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export async function handleCopilotRequest(req: NextRequest): Promise<Response> {
  const base = runtimeBaseUrl();
  if (!base) return handleGet(req);
  return proxy(req, base);
}

export const handleCopilotOptions = async (req: NextRequest) => preflightResponse(req);
