import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node';
import { BASE_PATH, buildCopilotRuntime } from '@/lib/copilotkit/build-runtime';

// Carga .env.runtime a mano para no depender de `--env-file*` (que depende de la
// versión de Node del servidor). No pisar claves ya presentes en el entorno.
function loadEnvFile(): void {
  try {
    const file = resolve(process.cwd(), '.env.runtime');
    if (!existsSync(file)) return;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = value;
    }
  } catch (error) {
    console.warn('[copilot-runtime] no se pudo leer .env.runtime:', error);
  }
}

loadEnvFile();

const PORT = Number(process.env.COPILOT_RUNTIME_PORT ?? process.env.PORT ?? 8787);
const HOST = process.env.COPILOT_RUNTIME_HOST ?? '0.0.0.0';

const listener = createCopilotNodeListener({
  runtime: buildCopilotRuntime(),
  basePath: BASE_PATH,
  mode: 'multi-route',
});

const server = createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  void listener(req, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[copilot-runtime] listening on http://${HOST}:${PORT}${BASE_PATH}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[copilot-runtime] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}
