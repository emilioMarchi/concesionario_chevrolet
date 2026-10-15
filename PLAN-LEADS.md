# Plan: Captura de Telemetría y Generación de Leads Calificados

> **Estado**: Planificado (F0–F8 pendientes)
> **Alcance**: `web-ia` (Next.js) captura identidad + recorrido UI y hace ETL desde CopilotKit Intelligence hacia Firestore propio; `ovni-agent` (LangGraph) ya persiste y clasifica conversaciones.
> **Relacionado**: `PLAN-COPLOTKIT-V2.md` (migración v2 / Intelligence), `PLAN-INTEGRACION.md` (catálogo), `PLAN.md` (proyecto global).
> **Objetivo**: convertir la conversación + el recorrido por la UI en **leads calificados** (contacto, intención, scoring) reutilizando la data que CopilotKit ya guarda, sin depender de un vendor de analytics externo.

---

## 1. Hallazgos (verificado en código)

| # | Hecho | Ubicación |
| :-: | :--- | :--- |
| 1 | Intelligence está habilitado vía `CPK_INTELLIGENCE_API_KEY` → threads duraderos + memoria + `identifyUser` por cookie `nv_uid` | `src/lib/copilotkit-runtime.ts:46-72` |
| 2 | `identifyUser` ya resuelve un `userId` estable (cookie anónima `nv_uid`) | `src/lib/copilotkit-runtime.ts:59-64` |
| 3 | El recorrido UI **se registra pero no se persiste**: `agentLogs` en memoria, topado a 20 | `src/context/AgentUIContext.tsx:40-45` |
| 4 | El estado vivo de la UI se publica al agente en cada run (transitorio) | `src/components/CopilotIntegration.tsx:70-97` |
| 5 | El SDK v2 expone suscripción a eventos AG-UI (`onRunStarted/Finished`, `onToolCall*`, `onNewMessage`, token usage) — nadie la usa | `@ag-ui/client` `AgentSubscriber`; `headless.d.mts:126` |
| 6 | Intelligence permite leer threads/mensajes/memoria/estado/eventos y **anotar** acciones de usuario | `CopilotKitIntelligence` (`client.d.mts:422-784`) |
| 7 | `ovni-agent` ya guarda `history` en Firestore con `classification {type, interestLevel, intentions, topics, sentiment}` | `ovni-agent/src/nodes/save_history.ts`, `services/sessionAnalyzer.ts` |
| 8 | La clasificación solo corre con `endSession=true`, que el path AG-UI **nunca** envía → hoy no hay señal de lead | `save_history.ts:79`, `copilotkit.ts:163-175` |
| 9 | No hay analytics/telemetry vendor integrado (solo deps transitivas) | `package.json` |

**Conclusión**: la data existe en dos silos (CopilotKit Intelligence por `userId`; Firestore `history` de `ovni-agent` por `threadId`). Falta (a) capturar el `userId`, (b) volcarla a una base propia unificada, (c) calificar/usar.

---

## 2. Arquitectura

```mermaid
flowchart LR
    U[Usuario] -->|chat + clicks| WEB[web-ia UI]
    WEB -->|identifyUser nv_uid| RT[/api/copilotkit]
    RT -->|run| OVNI[ovni-agent /copilotkit]
    RT -.->|Intelligence| CK[(CopilotKit\nIntelligence)]

    RT -->|F1: recordVisitor| FS[(Firestore propio)]
    WEB -->|F2: journey events| TEL[/api/telemetry]
    TEL --> FS

    CRON[[Cron/Manual]] --> ETL[/api/etl/intelligence]
    ETL -->|listThreads + getThreadMessages| CK
    ETL -->|F3: upsert| FS
    CK -->|F4: onThreadUpdated| RT

    FS -->|F5: scoring| LEAD[leads/*]
    LEAD --> CRM[CRM / notas / notif]

    ADMIN[Backoffice /admin] -->|F7: read APIs| FS
    ADMIN -->|trigger manual| ETL
```

- **Identidad**: `userId` (cookie `nv_uid`) es la clave de join con Intelligence. `threadId` es la clave de join con `ovni-agent`.
- **Dos capas de captura**: identidad (`recordVisitor`, server-side) + journey UI (`annotate`/`/api/telemetry`).
- **ETL**: batch (cron) desde Intelligence a Firestore propio + realtime (listeners) como complemento.
- **Calificación**: reusa `analyzeSession` de `ovni-agent` + scoring por profundidad de journey.

---

## 3. Modelo de datos (Firestore propio)

| Colección | Doc | Campos |
| :--- | :--- | :--- |
| `cpk_visitors` | `{userId}` | `firstSeen`, `lastSeen`, `agentId`, `threadIds[]`, `identifiedUserId?` |
| `cpk_conversations` | `{threadId}` | `userId`, `agentId`, `name`, `messages[]`, `lastRunAt`, `syncedAt` |
| `cpk_events` | auto | `visitorId`, `threadId?`, `runId?`, `type`, `name`, `payload`, `ts`, `source` (`ui`/`agent`/`annotate`) |
| `leads` | `{visitorId}` | `contact{name,email,phone}`, `summary`, `classification{}`, `leadScore`, `journey{}`, `source`, `status`, `updatedAt` |

> Si se prefiere reutilizar `ovni-agent`, unificar por `threadId` con su colección `history` en lugar de duplicar en `cpk_conversations`.

---

## 4. Fases

### F0 — Preparación
- [ ] Crear `src/lib/intelligence.ts`: singleton `CopilotKitIntelligence` reusando `CPK_INTELLIGENCE_API_KEY` (misma config que el runtime).
- [ ] Definir `agentId` canónico (`"default"`) y helper `getAgentId()`.
- [ ] Definir `ETL_SECRET` (auth de rutas ETL) y documentarlo en `.env.example`.
- [ ] Confirmar que `CPK_INTELLIGENCE_API_KEY` está en el entorno de **producción** (hoy solo `.env.local`).

### F1 — Captura de identidad (`userId`)
- [ ] Envolver `identifyUser` en `src/lib/copilotkit-runtime.ts` para llamar `recordVisitor(user.id)` (fire-and-forget).
- [ ] Implementar `recordVisitor()` (`src/lib/leads/visitors.ts`): upsert `cpk_visitors/{userId}` con `lastSeen`, `agentId`.
- [ ] (Opcional) `hooks.onRequest` en `createCopilotRuntimeHandler` para capturar también `threadId` del body de `agent/run`.
- [ ] Verificar que cada request con cookie genera/actualiza un `cpk_visitors`.

### F2 — Captura del recorrido UI
- [ ] Crear hook `useAgentTelemetry` (o extender `CopilotIntegration.tsx`) suscrito a `agent.subscribe({ onRunStartedEvent, onRunFinishedEvent, onToolCallStartEvent, onToolCallEndEvent, onNewMessage })`.
- [ ] Emitir eventos del `AgentUIContext.dispatch` (`ui.section_view`, `ui.car_view`, `ui.color_change`, `ui.filter_apply`, `ui.test_drive_open/fill/submit`).
- [ ] Crear `POST /api/telemetry` (web-ia) que resuelve `userId` (cookie) + `threadId` y persiste en `cpk_events`.
- [ ] Envío batched con `navigator.sendBeacon` en `visibilitychange`/`beforeunload`.
- [ ] (Opcional) Reenviar journey a Intelligence con `intelligence.annotate({ type: 'user_action', payload })` para el loop de self-learning.

### F3 — ETL batch (núcleo)
- [ ] Crear `POST /api/etl/intelligence` (protegido por `x-etl-secret`):
      `listVisitors()` → por `userId`: `listThreads({userId, agentId})` → por thread: `getThreadMessages({threadId, userId})` → `upsertConversation` → `qualify` → `upsertLead`.
- [ ] Implementar `upsertConversation()` y `upsertLead()` (`src/lib/leads/store.ts`).
- [ ] Paginado por cursor (`limit`) y procesamiento idempotente (upsert por `threadId`).
- [ ] Trigger: Vercel Cron (`*/15 * * * *`) o invocación manual con el secret.

### F4 — Realtime (complemento)
- [ ] Registrar `intelligence.onThreadUpdated(thread => upsertThread(thread))` una sola vez (proceso long-lived) en `copilotkit-runtime.ts`.
- [ ] `onThreadCreated` para backfill inmediato de hilos nuevos.

### F5 — Calificación de leads
- [ ] `qualify()`: extraer PII (`name/email/phone`) de los mensajes + `analyzeSession()` (reusar de `ovni-agent` o port minimal).
- [ ] Scoring combinado: `interestLevel` (analyzeSession) + señales del journey (nº modelos vistos, financiación usada, color cambiado, test drive abierto/enviado, consultas de precio/entrega).
- [ ] Disparar calificación por evento (submit de test drive, "quiero que me contacten", salida, o cada N turnos), no solo en endSession.
- [ ] Escribir `leads/*` con `leadScore` y `status` (`new`/`hot`/`contacted`).

### F6 — Salidas de negocio (CRM / notificaciones)
- [ ] Cola de ventas / CRM leída de `leads` (ordenada por `leadScore`).
- [ ] Notificación (email/WhatsApp) para leads `hot`.
- [ ] Memoria de Intelligence para visitantes recurrentes.

### F7 — Interfaz de Administración (Backoffice)
- [ ] Agregar `firebase-admin` a `web-ia` y `src/lib/firebase-admin.ts` (acceso server-side a las colecciones `cpk_*` / `leads`).
- [ ] Middleware de auth del backoffice (`src/middleware.ts` + `ADMIN_PASSWORD`/sesión).
- [ ] Read APIs protegidas (`src/app/api/admin/*`).
- [ ] Layout y páginas del backoffice (route group `/(admin)`): dashboard, leads, visitantes, conversaciones, eventos.
- [ ] Componentes de UI (tablas, chips de score, timeline de journey, visor de conversación).
- [ ] Acciones: cambiar `status`/notas de lead, disparo manual del ETL.

### F8 — Verificación y limpieza
- [ ] `npx tsc --noEmit` · `npm run lint` · `npm run build` limpios.
- [ ] Smoke: navegar + chatear → aparecen `cpk_visitors`/`cpk_events`; correr ETL → `cpk_conversations` + `leads`; el backoffice lista y abre el detalle.
- [ ] Confirmar join `userId` ↔ `threadId` ↔ `ovni-agent.history`.
- [ ] Documentar `ETL_SECRET`, `ADMIN_PASSWORD` y el cron en `.env.example`/README.

---

## 5. Diseño de la Interfaz de Administración (Backoffice)

**Objetivo.** Un backoffice en la propia `web-ia` para visualizar la data capturada (visitantes, recorrido UI, conversaciones y leads calificados) y operar sobre ella (notas, estado, disparo ETL), sin exponer nada del chat público.

### 5.1 Ubicación y estructura

Route group aparte `src/app/(admin)/admin/**` con su propio layout (sin `CopilotKitProvider` ni el chat público). Reutiliza el stack visual existente (Tailwind zinc/slate, `lucide-react`, `framer-motion`).

```
src/app/(admin)/
  layout.tsx                 # shell del backoffice (sidebar + topbar), sin CopilotKit
  admin/
    page.tsx                 # Dashboard / KPIs / embudo
    leads/page.tsx           # Lista de leads
    leads/[id]/page.tsx      # Detalle de lead + journey + conversación
    visitors/page.tsx        # Visitantes (userId, first/last seen, threads)
    conversations/page.tsx   # Lista de conversaciones por thread
    conversations/[id]/page.tsx
    events/page.tsx          # Explorador de eventos crudos
src/components/admin/
  LeadsTable.tsx  LeadScoreBadge.tsx  JourneyTimeline.tsx
  ConversationViewer.tsx  KpiCards.tsx  FunnelChart.tsx  EventsTable.tsx
src/lib/firebase-admin.ts    # Admin SDK (server-only)
src/middleware.ts            # auth del backoffice
```

### 5.2 Páginas

| Ruta | Propósito | Contenido |
| :--- | :--- | :--- |
| `/admin` | Vista general | KPIs (visitantes, conversaciones, leads, `hot`, tasa de conversión), embudo por sección, top intenciones/topics, distribución de tool calls, costo (tokens) |
| `/admin/leads` | Cola comercial | Tabla ordenable por `leadScore`; filtros por `status`/`classification.type`/`interestLevel`/fecha; contacto, resumen, score |
| `/admin/leads/[id]` | Detalle | Contacto, `summary`, `classification`, **desglose del score**, **timeline del journey** (secciones, autos vistos, colores, filtros, test drive), conversaciones asociadas, notas + cambio de `status` |
| `/admin/visitors` | Sesiones anónimas | `userId`, `firstSeen`/`lastSeen`, `threadIds[]`, si fue identificado y con qué lead |
| `/admin/conversations` | Historial | Lista por `threadId` (fecha, msgs, lead asociado); visor con roles y tool calls |
| `/admin/events` | Explorador | Eventos crudos con filtros (tipo, visitante, thread, rango temporal) |

### 5.3 Read APIs (protegidas)

| Método · Ruta | Devuelve |
| :--- | :--- |
| `GET /api/admin/metrics` | Agregados para el dashboard y el embudo |
| `GET /api/admin/leads` | Lista paginada + filtros (`status`, `type`, `minScore`) |
| `GET /api/admin/leads/[id]` | Lead + journey + conversaciones relacionadas |
| `PATCH /api/admin/leads/[id]` | Actualiza `status` y `notes` |
| `GET /api/admin/visitors` · `/[id]` | Visitantes y su detalle |
| `GET /api/admin/conversations` · `/[id]` | Conversaciones y mensajes |
| `GET /api/admin/events` | Eventos (`cpk_events`) filtrados |
| `POST /api/admin/etl/run` | Dispara el ETL (`/api/etl/intelligence`) manualmente |

Todas leen de **Firestore propio** (`cpk_*` / `leads`), no de Intelligence → la UI es rápida y desacoplada.

### 5.4 Seguridad

- `src/middleware.ts` protege `/admin` y `/api/admin/*` con sesión (cookie firmada) + `ADMIN_PASSWORD`; el ETL sigue protegido por `ETL_SECRET`.
- `firebase-admin` solo server-side (read APIs / server components); nunca exponer credenciales al browser.
- Sin indexación: `robots`/metadata `noindex` en el route group.

### 5.5 Flujo de datos

`Firestore (cpk_visitors · cpk_conversations · cpk_events · leads)` → read APIs `/api/admin/*` → server components / client components del backoffice → tablas, badges y `JourneyTimeline`.

### 5.6 Dependencias nuevas

- `firebase-admin` (acceso server-side a Firestore; hoy `web-ia` no lo tiene).
- Gráficos: evaluar `recharts` o un `FunnelChart`/`KpiCards` caseros con `framer-motion` (evitar peso innecesario).

---

## 6. Decisiones (ADR)

| Aspecto | Opción | Razón |
| :--- | :--- | :--- |
| Fuente de verdad | CopilotKit Intelligence (lectura) + Firestore propio (destino) | Intelligence es el store gestionado; el ETL lo porta a base propia para control/scoring/CRM |
| Identidad | `userId` de `identifyUser` (cookie `nv_uid`) | Es el scope que ya usa Intelligence; sin él no se puede leer |
| Journey UI | `/api/telemetry` propio (+ `annotate` opcional) | Evita acoplar el producto al endpoint `annotate` de la plataforma |
| Enumeración | `cpk_visitors` poblado en `identifyUser` | `listThreads` exige `userId` y no hay listado global |
| Calificación | Reusar `analyzeSession` de `ovni-agent` | Ya existe y clasifica `lead/conversation/support` |
| Trigger ETL | Cron batch + listeners realtime | Batch para backfill/idempotencia; realtime para latencia |
| Backoffice | Route group `(admin)` dentro de `web-ia` | Reutiliza stack/estilos; lee de Firestore propio, desacoplado de Intelligence |
| Acceso a datos admin | `firebase-admin` server-side + read APIs | Nunca exponer credenciales/colecciones al browser |
| Auth backoffice | Middleware + `ADMIN_PASSWORD` (cookie firmada) | Superficie interna separada del sitio público |

---

## 7. Variables de entorno

| Var | Uso | Estado |
| :--- | :--- | :--- |
| `CPK_INTELLIGENCE_API_KEY` | Cliente Intelligence (lectura) | Presente en `.env.local`; **verificar prod** |
| `ETL_SECRET` | Auth de `/api/etl/intelligence` | **Nueva** |
| `ADMIN_PASSWORD` | Login/sesión del backoffice | **Nueva** |
| `FIREBASE_*` (Admin SDK) | Acceso server-side a Firestore propio | **Nueva** |
| `GEMINI_API_KEY` | `analyzeSession` (si se porta a web-ia) | En `ovni-agent` |
| `OVNI_AGENT_ID` / `OVNI_CLIENT_ID` | Contexto backend | Ya presentes |

---

## 8. Verificación

```bash
# web-ia
npx tsc --noEmit
npm run lint
npm run build

# smoke ETL (con secret)
curl -X POST http://localhost:3000/api/etl/intelligence -H "x-etl-secret: $ETL_SECRET"
```

Criterio de salida: (a) cada visitante con cookie queda en `cpk_visitors`; (b) el ETL vuelca conversaciones y genera `leads` con clasificación y score; (c) el recorrido UI queda en `cpk_events`; (d) el backoffice `/admin` lista leads/visitantes/conversaciones y muestra el journey; (e) `/admin` y `/api/admin/*` están protegidos; (f) sin regresiones en chat/tool calls.

---

## 9. Riesgos / pendientes

| Item | Estado |
| :--- | :--- |
| `getThreadEvents`/`getThreadState` son `_inspect/` (debug-only) → **no** usar en producto | Evitar en ETL |
| `userId` anónimo hasta que el usuario deje contacto; "promover" a lead identificado luego | Diseño F5 |
| Cookie `nv_uid` es `HttpOnly` → el browser no la lee; resolución server-side | F1/F2 |
| Duplicación de conversaciones si se usa `ovni-agent.history` y `cpk_conversations` | Unificar por `threadId` |
| PII/consentimiento al persistir datos de chat | Revisar F2/F5 |
| PII visible en el backoffice → acceso restringido + auditoría | F7 |
| Sin key de Intelligence → `InMemoryAgentRunner`, nada durable que leer | F0 |
| `firebase-admin` y gráficos agregan peso a `web-ia` | Evaluar en F7 |

---

## 10. Referencias de código

- Runtime / `identifyUser`: `src/lib/copilotkit-runtime.ts`
- Estado y journey UI: `src/context/AgentUIContext.tsx`, `src/components/CopilotIntegration.tsx`
- Cliente Intelligence (tipos): `node_modules/@copilotkit/runtime/dist/v2/runtime/intelligence-platform/client.d.mts`
- Runtime hooks: `node_modules/@copilotkit/runtime/dist/v2/runtime/core/hooks.d.mts`
- Backend historial/analítica: `../ovni-agent/src/nodes/save_history.ts`, `../ovni-agent/src/services/sessionAnalyzer.ts`
- Router AG-UI backend: `../ovni-agent/src/server/routes/copilotkit.ts`
- Estilos/patrones UI a reutilizar: `src/components/CarCatalog.tsx`, `src/components/AgentSidebar.tsx`, `src/app/page.tsx`
