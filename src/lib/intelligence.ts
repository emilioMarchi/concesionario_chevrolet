import { CopilotKitIntelligence } from '@copilotkit/runtime/v2';

// El agente registrado en el runtime es `default` (ver `page.tsx` / `copilotkit-runtime.ts`).
// Intelligence scopea threads y memoria por (userId, agentId), así que este ID es
// el que hay que usar para leer de vuelta.
export const AGENT_ID = 'default';

// Nombre de la cookie anónima que resuelve `identifyUser`. Es la identidad que
// usa Intelligence como `userId`.
export const ANON_USER_COOKIE = 'nv_uid';

/**
 * La memoria de largo plazo de Intelligence es opt-in: según la organización o
 * licencia, la plataforma responde 403 `MEMORY_NOT_ENTITLED`. La habilitamos
 * sólo cuando el deploy la tiene (env `INTELLIGENCE_MEMORY_ENABLED=true`).
 */
export function isMemoryEnabled(): boolean {
  return process.env.INTELLIGENCE_MEMORY_ENABLED === 'true';
}

let cached: CopilotKitIntelligence | null = null;

/**
 * Cliente de lectura/escritura contra CopilotKit Intelligence.
 *
 * Reusa la misma API key que el runtime (`CPK_INTELLIGENCE_API_KEY`). Devuelve
 * `null` cuando no está configurada, para que los llamadores degraden sin
 * romper (p. ej. en local sin la key, o en build).
 */
export function getIntelligence(): CopilotKitIntelligence | null {
  const apiKey = process.env.CPK_INTELLIGENCE_API_KEY;
  if (!apiKey) return null;
  if (!cached) cached = new CopilotKitIntelligence({ apiKey });
  return cached;
}

// Formato de las API keys de Intelligence: `cpk-{projectId}_{resto}`.
const API_KEY_PROJECT_ID_PATTERN = /^cpk-(\d+)_/;

/** Devuelve el `projectId` embebido en la API key, o `null` si no se puede leer. */
export function getProjectId(): string | null {
  const apiKey = process.env.CPK_INTELLIGENCE_API_KEY;
  if (!apiKey) return null;
  return API_KEY_PROJECT_ID_PATTERN.exec(apiKey)?.[1] ?? null;
}

/**
 * La plataforma scopea los ids de usuario como `{projectId}_{userId}`, así que
 * los campos que devuelve (p. ej. `thread.createdById`) traen ese prefijo que
 * NO es válido para volver a consultar con `listThreads`. Lo quitamos para
 * quedarnos con el id app original (el de la cookie `nv_uid`).
 */
export function normalizeUserId(userId: string | null | undefined): string | null {
  if (!userId) return null;
  const projectId = getProjectId();
  if (projectId && userId.startsWith(`${projectId}_`)) {
    return userId.slice(projectId.length + 1);
  }
  // Fallback defensivo: cualquier prefijo numérico de proyecto (`12636_...`).
  return /^\d+_(.+)$/.exec(userId)?.[1] ?? userId;
}

/** Extrae el `userId` (cookie `nv_uid`) de un `Request`/headers, o `null`. */
export function readUserIdFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ANON_USER_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

/** Extrae el `userId` desde un `Request` de Fetch. */
export function readUserId(request: Request): string | null {
  return readUserIdFromCookie(request.headers.get('cookie'));
}

/**
 * `Set-Cookie` de la cookie anónima `nv_uid`. Misma forma en todos los puntos
 * que la emiten (runtime de CopilotKit y `/api/telemetry`), para que la
 * identidad sea consistente.
 */
export function anonUserCookie(userId: string): string {
  return `${ANON_USER_COOKIE}=${userId}; Path=/; SameSite=Lax; Max-Age=31536000; HttpOnly; Secure`;
}
