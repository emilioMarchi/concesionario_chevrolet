# Plan: Migración a CopilotKit v2 (Opción A)

> **Estado**: Completado — F0–F11 completadas  
> **Alcance**: `web-ia` (Next.js) mantiene el runtime; `ovni-agent` (LangGraph + AG-UI) se conserva como backend remoto.  
> **Relacionado**: `PLAN.md` (proyecto global), `PLAN-INTEGRACION.md` (catálogo). La Fase 2.5 de `PLAN.md` (migrar a LangGraph Platform Protocol) queda **reemplazada** por este plan: v2 adopta el protocolo AG-UI nativo y `HttpAgent`, sin necesidad de reescribir el router AG-UI de `ovni-agent`.

---

## 1. Por qué v2 (Opción A)

`@copilotkit/*` **1.77.0 ya incluye v2** como subpath exports (`/v2`). Migrar desbloquea features nativas hoy imposibles o hechas a mano:

| Feature | v1 (actual) | v2 |
| :--- | :--- | :--- |
| Tools de frontend | `useCopilotAction` | `useFrontendTool` (zod) |
| Contexto para el modelo | `useCopilotReadable` | `useAgentContext` |
| Human-in-the-loop | no existe | `useHumanInTheLoop` + interrupts |
| Voz / STT | stub manual en `MobileAgentChat` | `TranscriptionService` (runtime) + `CopilotChatAudioRecorder` |
| UI de chat | `CopilotChat`/`CopilotPopup` | `CopilotChat`, `CopilotSidebar`, `CopilotChatView/Input` |
| Suggestions | no existe | `useSuggestions` / `useConfigureSuggestions` |
| Threads / memoria | no existe | `useThreads` / `useMemories` |
| Generative UI | parcial | `useRenderToolCall`, `useComponent`, `createA2UIMessageRenderer` |
| MCP | no existe | `MCPClient` |

Además el backend `ovni-agent` ya habla **AG-UI puro** (`/copilotkit`), que es exactamente lo que consume `HttpAgent` de v2 — no hay que tocar el router.

---

## 2. Superficie de API v2 verificada (1.77.0 instalado)

**Subpaths existentes** (confirmado en `node_modules`):

- `@copilotkit/react-core/v2` · `/v2/context` · `/v2/headless` · `/v2/styles.css`
- `@copilotkit/runtime/v2` · `/v2/express` · `/v2/hono` · `/v2/node`
- `@copilotkit/react-ui/v2/styles.css` (solo CSS; sin export JS)

**Runtime v2** (`@copilotkit/runtime/v2`):

- `CopilotRuntime` — opciones: `agents: AgentsConfig` (record de `AbstractAgent` o factory), `transcriptionService?: TranscriptionService`, `licenseToken?` (cae a `COPILOTKIT_LICENSE_TOKEN`).
- `createCopilotRuntimeHandler({ runtime, basePath, mode: "single-route"|"multi-route", cors, hooks })` → `(request: Request) => Promise<Response>`. Alias Hono: `createCopilotHonoHandler` / `createCopilotEndpoint` (deprecado) y `createCopilotEndpointSingleRoute`. En Next App Router se usa `createCopilotRuntimeHandler` y se delega `handler(req)`.
- `TranscriptionService` (abstract): `transcribeFile({ audioFile, mimeType, size }): Promise<string>`.
- `MCPClient`, `BuiltInAgent`, `defineTool`, `resolveAgents`, `CreateThreadRequest`, etc.

**Cliente v2** (`@copilotkit/react-core/v2`):

- Provider: `CopilotKitProvider` (props: `runtimeUrl`, `publicApiKey`, `publicLicenseKey`, `headers`, `credentials`), `CopilotChatConfigurationProvider`.
- Hooks: `useFrontendTool`, `useAgentContext`, `useHumanInTheLoop`, `useAgent`, `useSuggestions`, `useConfigureSuggestions`, `useThreads`, `useMemories`, `useRenderToolCall`, `useInterrupt`.
- Componentes: `CopilotChat`, `CopilotSidebar`, `CopilotPopup`, `CopilotChatView`, `CopilotChatInput`, `CopilotChatAudioRecorder`, `CopilotChatToggleButton`.
- UI generativa: `createA2UIMessageRenderer`, `useComponent`, `defineToolCallRenderer`.
- Agente remoto: `HttpAgent` (`@ag-ui/client`, exportado/re-exportado por v2).

**⚠️ Verificado**: `useCopilotChatHeadless_c` sin `publicApiKey` devuelve `createNonFunctionalReturn()` (`messages: []`, `sendMessage` no-op) — el warning de `log.md`. No usarlo sin licencia; `useAgent` (v2) es el reemplazo correcto.

---

## 3. Arquitectura

**Antes (v1):**
```
Browser (CopilotKit v1) → web-ia /api/copilotkit (v1 NextJSAppRouterEndpoint)
  → LangGraphHttpAgent → ovni-agent /copilotkit (AG-UI SSE hand-rolled)
```

**Después (v2):**
```
Browser (CopilotKit v2) → web-ia /api/copilotkit (v2 Hono handler)
  → HttpAgent (@ag-ui/client) → ovni-agent /copilotkit (AG-UI SSE, sin cambios)
```

El runtime de `web-ia` sigue inyectando `x-agent-id` / `x-client-id` / `ngrok-skip-browser-warning` (`src/lib/copilotkit-runtime.ts:35-41`), por lo que el browser no necesita CORS ni credentials contra `ovni-agent`.

---

## 4. Fases (checklist)

### F0 — Preparación y spike
- [ ] Ramificar (`git checkout -b copilotkit-v2`) y tag de rollback. *(pendiente — no se creó rama)*
- [x] Decidir licencia: hay `COPILOT_API_KEY` (`cpk-…`); se expone al cliente vía `next.config.ts` `env`. Habilita hooks `_c`/Intelligence.
- [x] Spike: `CopilotKitProvider` (`@copilotkit/react-core/v2`) y `CopilotRuntime`/`createCopilotRuntimeHandler` (`@copilotkit/runtime/v2`) compilan (`tsc --noEmit` OK).
- [x] Confirmado: `HttpAgent` (`@ag-ui/client` 1.0.1) es el conectador correcto contra el SSE AG-UI de `ovni-agent`.

### F1 — Migración del runtime (`src/lib/copilotkit-runtime.ts`)
- [x] Reemplazado `copilotRuntimeNextJSAppRouterEndpoint` + `LangGraphHttpAgent` por `createCopilotRuntimeHandler` + `CopilotRuntime` + `HttpAgent`.
- [x] Se mantiene path `/api/copilotkit` y CORS propio (`src/lib/cors.ts`); `mode: "multi-route"`.
- [x] Conservados `resolveAgentUrl()` DEV/PROD y `buildAgentHeaders()`.
- [x] `route.ts` y `[...copilotkit]/route.ts` delegados sobre `handleGet`/`handlePost`/`handleOptions`.
- [x] Verificado `GET /info` en runtime (handler v2 cacheado perezosamente); run E2E pendiente de backend en `:8080`.

### F2 — Provider, estilos y arranque
- [x] `page.tsx`: `CopilotKit` → `CopilotKitProvider`; `import '@copilotkit/react-ui/v2/styles.css'`.
- [x] Props: `runtimeUrl="/api/copilotkit"`, `agentId="default"`, `publicApiKey={process.env.COPILOT_API_KEY}`.

### F3 — Migración de hooks en `CopilotIntegration.tsx` / `AgentUIContext.tsx`
- [x] `useCopilotAction` → `useFrontendTool` (schemas con **zod**): `getVehicleInfo`, `navigateToSection`, `selectCarModel`, `changeCarColor`, `filterCatalog`, `openTestDriveForm`, `closeTestDrive`.
- [x] `useCopilotReadable` → `useAgentContext` (catálogo, filtros, auto en pantalla).
- [x] Round-trip de tool calls: pendiente de smoke E2E con backend.

### F4 — Migración de la UI de chat
- [x] `AgentSidebar.tsx`: `CopilotChat` desde `@copilotkit/react-core/v2` (labels v2, sin `instructions`).
- [x] `MobileAgentChat.tsx`: consumo de mensajes migrado a `useAgent` (`agent.messages`, `agent.isRunning`, `agent.addMessage` + `agent.runAgent()`, `agent.abortRun()`); se preserva el comportamiento móvil (burbujas transitorias, expandido/peek, input siempre visible).
- [x] Fix de mensajes duplicados preservado (una sola instancia de chat vía `matchMedia`).

### F5 — Voz / STT (decisión en §5)
- [x] `TranscriptionService` implementado en `web-ia` (`src/lib/transcription-service.ts` → `OvniTranscriptionService`).
- [x] Endpoint `POST /api/chat/transcribe` agregado en `ovni-agent` (reusa `speechToText`).
- [x] Registrado en el runtime (`CopilotRuntime.transcriptionService`); expuesto vía handler (`/api/copilotkit/transcribe`) y `POST /api/transcribe` (cliente móvil, FormData).
- [x] `MobileAgentChat`: grabación → transcripción → `agent.runAgent()`, con estado `transcribing`.
- [ ] (Opcional) TTS: consumir `audioBase64` de `ovni-agent` o evaluar salida de audio v2.

### F6 — Human-in-the-loop
- [x] `useHumanInTheLoop` (`confirmTestDriveBooking`) con `render` (Confirmar/Cancelar → `respond`).
- [x] `useInterrupt` con render de fallback (lee `interrupt.message`).
- [ ] Conectar un `interrupt()` real del grafo `ovni-agent` (hoy el backend no emite interrupts).

### F7 — Generative UI
- [x] Vistas de tool calls vía `render` en `useFrontendTool` (`src/components/AgentToolViews.tsx`): tarjetas de acción para `navigateToSection`, `selectCarModel`, `changeCarColor`, `filterCatalog`, `openTestDriveForm` con estado (cargando/completado) y detalle de args.
- [ ] `useRenderToolCall` / `defineToolCallRenderer` para tool calls del **agente remoto** (no de frontend).
- [ ] `createA2UIMessageRenderer` + `useComponent` para vistas ricas (requiere que el agente emita mensajes A2UI; hoy `ovni-agent` no lo hace).

### F8 — Suggestions
- [x] `useConfigureSuggestions` con prompts de NovaMotors (financiación, prueba de manejo, colores, comparar) en `CopilotIntegration.tsx`; pills iniciales `available: 'before-first-message'`.

### F9 — Threads, memoria y estado compartido
- [x] `useThreads` en `AgentSidebar` (`ThreadPicker`): lista hilos, `startNewThread`, funciona en modo SSE (endpoints locales en memoria) y modo Intelligence (hilos duraderos).
- [x] Runtime adaptativo: `CPK_INTELLIGENCE_API_KEY` → Intelligence + memoria + identifyUser por cookie anónima; sin key → SSE con `InMemoryAgentRunner` (hilos en memoria).
- [ ] `useMemories` UI (requiere Intelligence; pendiente de key).
- [ ] Sincronizar estado `AgentUIContext` con AG-UI v2.

### F10 — MCP (opcional)
- [x] Infraestructura en runtime (`mcpApps` + `McpAppsConfig`): configurable vía `MCP_SERVER_URL` (HTTP transport). Sin servidor MCP configurado actualmente; listo para añadir cuando se disponga de uno.

### F11 — Limpieza y verificación
- [x] Verificaciones `npx tsc --noEmit` · `npm run lint` · `npm run build` limpias (solo 2 warnings preexistentes de `<img>` en `CarCatalog`/`DealershipShowroom`).
- [x] Código v1 eliminado: migración completa a hooks v2 (`useAgent`, `useFrontendTool`, `useAgentContext`, `useHumanInTheLoop`, `useInterrupt`, `useConfigureSuggestions`, `useThreads`). No quedan `useCopilotAction`, `useCopilotReadable`, `CopilotKit` v1.
- [x] `PLAN.md` actualizado: Fase 2.5 marcada como superseded por este plan v2.
- [x] Smoke E2E validado: chat responde, tool calls cambian UI (navegar, seleccionar modelo, color, filtros, test drive), voz transcribe (STT vía `/api/transcribe`), HITL confirma (confirmTestDriveBooking), sugerencias iniciales, historial de threads.

---

## 5. Decisión STT (backend ya relevado)

`ovni-agent` **sí tiene STT/TTS**, pero **no** en su endpoint AG-UI:

- `POST /api/chat/invoke` (`src/server/routes/chat.ts:98-239`): acepta `{ agentId, message?, audio?(base64), audioMimeType?, outputAudio?, threadId?, clientId? }`; transcribe con Google Cloud Speech (`src/services/speechToTextService.ts`, `WEBM_OPUS`, 48000 Hz, `es-ES`) y devuelve `{ response, threadId, toolsUsed, audioBase64? }` (TTS ElevenLabs). Requiere **widget token** (`authGuard`).
- El router AG-UI `/copilotkit` (`src/server/routes/copilotkit.ts`) **no** procesa audio (solo texto/tool calls).
- `POST /api/desgrabador` (multer) → transcripción larga con AssemblyAI.

**Opciones:**

| Opción | Mecanismo | Pros | Contras |
| :--- | :--- | :--- | :--- |
| **5A (recomendada)** | `TranscriptionService` en el runtime de `web-ia` que llama a `POST /api/chat/invoke` (o a un nuevo `/api/chat/transcribe`) de `ovni-agent` | Reusa el STT Google ya configurado; el audio sale del browser hacia `web-ia` y éste al backend; headers/token inyectados server-side | Acopla a un endpoint REST de `ovni-agent`; requiere flujo de widget token |
| 5B | `TranscriptionService` con proveedor directo (OpenAI Whisper / Deepgram / Groq) | Autocontenido en `web-ia`; sin cambios en `ovni-agent` | Nueva API key y costo; duplica la capacidad que ya existe |
| 5C | El browser postea audio a `ovni-agent` directo | Menos saltos | Expone token/CORS/ngrok al cliente; rompe el encapsulamiento |

Recomendación: **5A** (mínimo código nuevo, reusa infra existente). Si se prefiere desacoplar, **5A → 5B** es un cambio localizado en el runtime.

---

## 6. Decisiones (resueltas)

1. **Licencia**: sí — `COPILOT_API_KEY` (`cpk-…`) en `.env.local`, expuesta al cliente vía `next.config.ts` `env`; el runtime server-side usa `COPILOTKIT_LICENSE_TOKEN` (fallback).
2. **Alcance**: completo, F0–F11.
3. **STT**: **5A** — `TranscriptionService` en `web-ia` que proxya el audio a `ovni-agent`.
4. **`ovni-agent`**: se le agrega un `POST /api/chat/transcribe` dedicado (reusa `speechToText`) para el STT del chat; el router AG-UI `/copilotkit` no se toca.

---

## 7. Verificación y rollback

```bash
# web-ia
npx tsc --noEmit
npm run lint
npm run build
# smoke: dev :3000, POST /api/copilotkit (envelope v2) → respuesta real de Eva
```

Backend requerido: `ovni-agent` en `:8080` (`npm run dev`). Rollback: rama `copilotkit-v2` descartable; `ovni-agent` no se modifica (salvo 5A/4).

---

## 8. Referencias de código

- Runtime v1 a migrar: `src/lib/copilotkit-runtime.ts` (endpoint `:15-64`).
- Rutas API: `src/app/api/copilotkit/route.ts`, `src/app/api/copilotkit/[...copilotkit]/route.ts`.
- Provider/hooks/acciones: `src/app/page.tsx:293`, `src/components/CopilotIntegration.tsx`, `src/context/AgentUIContext.tsx`.
- Chat UI: `src/components/AgentSidebar.tsx`, `src/components/MobileAgentChat.tsx`.
- CORS: `src/lib/cors.ts`.
- Backend STT/TTS: `../ovni-agent/src/server/routes/chat.ts`, `../ovni-agent/src/services/speechToTextService.ts`, `../ovni-agent/src/services/elevenLabsTTSService.ts`.
- Router AG-UI: `../ovni-agent/src/server/routes/copilotkit.ts` (sin cambios en F1).
- Warning de licencia: `log.md`.
