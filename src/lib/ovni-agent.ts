// Helpers compartidos para hablar con el backend `ovni-agent` (server-to-server).

// La URL del backend es configurable por entorno: en desarrollo se usa
// OVNI_AGENT_URL_DEV y en producción OVNI_AGENT_URL_PROD (obligatoria, para
// evitar deployar apuntando al PC local por error). El backend expone el agente
// en `${url}/copilotkit`.
export function resolveAgentUrl(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const url = (isProd
    ? process.env.OVNI_AGENT_URL_PROD
    : process.env.OVNI_AGENT_URL_DEV
  )?.trim();
  if (url) return url.replace(/\/+$/, '');
  if (isProd) {
    throw new Error(
      'OVNI_AGENT_URL_PROD no está configurada. Definila en las variables de ' +
        'entorno de producción (ej. https://<subdominio>.ngrok-free.app).'
    );
  }
  return 'http://localhost:8080';
}

// El backend resuelve el agente (Firestore) con el header `x-agent-id`. Si no
// lo recibe, cae a un default hardcodeado y todas las apps hablan con el mismo
// agente sin importar qué se cambie en .env.local.
// `ngrok-skip-browser-warning` evita el interstitial de ngrok en el plan free.
export function buildAgentHeaders(agentUrl: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.OVNI_AGENT_ID) headers['x-agent-id'] = process.env.OVNI_AGENT_ID;
  if (process.env.OVNI_CLIENT_ID) headers['x-client-id'] = process.env.OVNI_CLIENT_ID;
  if (agentUrl.includes('ngrok')) headers['ngrok-skip-browser-warning'] = 'true';
  return headers;
}
