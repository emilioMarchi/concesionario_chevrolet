import { createCopilotRuntimeHandler } from '@copilotkit/runtime/v2';
import { NextRequest } from 'next/server';
import { preflightResponse, withCors } from '@/lib/cors';
import { anonUserCookie, ANON_USER_COOKIE } from '@/lib/intelligence';
import { BASE_PATH, buildCopilotRuntime } from '@/lib/copilotkit/build-runtime';

type RuntimeHandler = (request: Request) => Promise<Response>;

let cachedHandler: RuntimeHandler | null = null;

function getHandler(): RuntimeHandler {
  if (cachedHandler) return cachedHandler;
  cachedHandler = createCopilotRuntimeHandler({
    runtime: buildCopilotRuntime(),
    basePath: BASE_PATH,
    mode: 'multi-route',
  });
  return cachedHandler;
}

async function delegate(req: NextRequest): Promise<Response> {
  // Set anonymous user cookie if not present (for Intelligence identifyUser).
  const res = await withCors(req, await getHandler()(req));
  if (!req.headers.get('cookie')?.includes(`${ANON_USER_COOKIE}=`)) {
    const userId = crypto.randomUUID();
    res.headers.append('Set-Cookie', anonUserCookie(userId));
  }
  return res;
}

export const handleGet = (req: NextRequest) => delegate(req);
export const handlePost = (req: NextRequest) => delegate(req);
export const handleDelete = (req: NextRequest) => delegate(req);
export const handlePatch = (req: NextRequest) => delegate(req);
export const handleOptions = async (req: NextRequest) => preflightResponse(req);
