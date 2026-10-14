# web-ia — NovaMotors (Next.js + CopilotKit)

Sitio SPA con catálogo de vehículos, financiación y asistente IA (CopilotKit)
conectado al backend `ovni-agent`.

## Variables de entorno

Copia `.env.example` a `.env.local` y completalo:

| Variable | Descripción |
| --- | --- |
| `OVNI_AGENT_URL_DEV` | URL base del backend en **desarrollo** (ej. `http://localhost:8080`). Si falta, cae a `http://localhost:8080` |
| `OVNI_AGENT_URL_PROD` | URL base del backend en **producción** (ej. `https://<subdominio>.ngrok-free.app`). **Obligatoria en prod** (si falta, `/api/copilotkit` responde 500) |
| `OVNI_AGENT_ID` | Header `x-agent-id` que resuelve el agente en Firestore. Obligatorio en prod |
| `OVNI_CLIENT_ID` | Header `x-client-id` que resuelve el cliente/organización. Obligatorio en prod |
| `ALLOWED_ORIGINS` | Orígenes permitidos para llamar a `/api/copilotkit` desde otro dominio (separados por coma). El dominio propio funciona siempre (same-origin). Vacío = sin orígenes cruzados |

Ningún secreto va al repo: `.env*` está en `.gitignore` excepto `.env.example`.

### Cómo fluye el CORS

```
navegador ──► /api/copilotkit (Vercel, mismo origen, sin CORS)
                    │  servidor a servidor (sin header Origin)
                    ▼
             OVNI_AGENT_URL_DEV/PROD/copilotkit  (ovni-agent, en tu PC detrás de ngrok)
```

El navegador nunca habla directo con ngrok, por eso el tramo Vercel → ngrok no
está sujeto a CORS. `ALLOWED_ORIGINS` solo se usa si exponés `/api/copilotkit`
a otro dominio (widget embebido, preview, etc.); en ese caso se responden los
preflight `OPTIONS` y los headers `Access-Control-Allow-*`.

## Desarrollo local

```bash
npm install
npm run dev     # http://localhost:3000
```

El backend `ovni-agent` debe correr en `http://localhost:8080`.

## Deploy en Vercel + ngrok en tu PC

1. Servidor del agente corriendo localmente (`ovni-agent`, puerto 8080).
2. Exponelo por ngrok: `ngrok http 8080` → copia la URL `https://xxx.ngrok-free.app`.
3. En Vercel → Settings → Environment Variables, cargá:
   - `OVNI_AGENT_URL_PROD=https://xxx.ngrok-free.app`
   - `OVNI_AGENT_ID=agent_...`
   - `OVNI_CLIENT_ID=org_...`
   - `ALLOWED_ORIGINS=` (solo si algo va a llamar a la API desde otro dominio)
4. Deploy. La URL ngrok cambia cada reinicio en el plan free: actualizala en
   Vercel y redeployeá (o usá un dominio fijo con ngrok).

> `ovni-agent` también aplica CORS del lado del backend (orígenes base +
> dominios de admins en Firestore). Como el tramo Vercel → ngrok no manda
> `Origin`, no requiere cambios.

## Comandos

```bash
npm run lint
npm run build
```
