import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'x-agent-id',
  'x-client-id',
  'x-ovni-widget-token',
  'ngrok-skip-browser-warning',
].join(', ');

const ALLOWED_METHODS = 'GET, POST, OPTIONS';

function resolveAllowedOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : null;
}

export function buildCorsHeaders(requestOrigin: string | null): Headers {
  const headers = new Headers({
    Vary: 'Origin',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
  });

  const allowedOrigin = resolveAllowedOrigin(requestOrigin);
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    if (allowedOrigin !== '*') headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return headers;
}

export function preflightResponse(req: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req.headers.get('origin')),
  });
}

export function withCors(req: NextRequest, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [key, value] of buildCorsHeaders(req.headers.get('origin'))) {
    headers.set(key, value);
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}
