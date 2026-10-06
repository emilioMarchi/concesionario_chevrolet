# Plan de Proyecto: Web Interactiva Controlada por Agente IA (Voz / Chat)

> **Estado**: Fase 2 Completada / Fase 2.5 Bloques 0 OK / **Fase 2.6 Planificada (Rediseño SPA & Catálogo)** / Fase 3 en espera  
> **Caso de Estudio**: Concesionaria de Vehículos Interactiva (NovaMotors)  
> **Orquestador**: `ovni-agent` (LangGraph + router AG-UI *hand-rolled*, a reemplazar)  
> ⚠️ La Fase 3 (Voz) está **bloqueada** hasta completar la Fase 2.5: hoy el agente no puede
> emitir tool calls, que es la premisa de todo el protocolo Agente↔UI.

---

## 1. Visión del Proyecto y Desafío Principal

El propósito principal es establecer **un protocolo de interacción Agente $\leftrightarrow$ UI** donde el usuario interactúe con el agente (vía texto o voz) y el agente actúe como el "orquestador" de la interfaz.

### Prototipo de Validación: Web de Concesionaria de Vehículos (NovaMotors)
- **Filtrar y mostrar modelos**: SUV, Sedán, Eléctricos, rango de precio.
- **Controlar el showroom / Galería visual**: Cambiar color del auto con animaciones en vivo (`Framer Motion`).
- **Guiar la prueba de manejo / Cotización**: Completar el formulario de prueba de manejo interactivamente.
- **Navegar por las secciones**: Showroom, Financiamiento, Contacto, Ficha Técnica.

---

## 2. Arquitectura del Protocolo Agente-UI

```mermaid
flowchart TD
    U[Usuario (Voz / Chat)] <--> CK[CopilotKit UI / Popup]
    
    subgraph Frontend [web-ia (Next.js)]
        CK <--> CR[CopilotRuntime API (/api/copilotkit)]
        LK[LangGraphAgent / RunHandler<br/>(ejecuta handlers en el browser)]
        US[AgentUIContext / State Manager]
        AR[CopilotActions Handlers & Framer Motion]
        UI[Componentes Visibles / Showroom]
    end

    subgraph Backend [ovni-agent (Express + LangGraph)]
        LGP[LangGraph Platform API<br/>(threads · runs/stream · assistants)]
        LG[Grafo LangGraph / Agente Eva]
    end

    CR <-->|LangGraph Platform Protocol (SSE)| LGP
    LGP <-->|graph.stream streamMode:events| LG
    LGP -- "1. RunAgentInput.tools (JSON Schema)" --> LG
    LK -- "2. runAgentStream: messages + tools" --> CR
    LK -- "3. Tool Call (toolCallId = tool_call.id)" --> AR
    AR -- "4. Dispatch UI State" --> US
    US -- "5. Re-render & Animaciones" --> UI
    AR -- "6. ToolMessage → follow-up run" --> LK
```

> **Reparto de responsabilidades (verificado en el código):**
> - **Backend = decide.** El LLM elige qué tool llamar y con qué argumentos.
> - **Browser = ejecuta.** `RunHandler.processAgentResult` (`@copilotkit/core`) corre el
>   `handler` registrado por `useCopilotAction` y arma el `ToolMessage`.
> - **Browser = conduce el loop.** Tras el `ToolMessage` dispara un *follow-up run*.
> - **Runtime = relay.** `@copilotkit/react-core` nunca envía el `handler`; sólo su
>   schema (`name`/`description`/`parameters`) viaja al modelo.
>
> Por eso el schema de las tools debe llegar intacto desde `useCopilotAction` hasta
> `bindTools()`: si se pierde en el camino, el modelo nunca puede pedir una acción.

---

## 3. Estado de Avance y Fases del Proyecto

### ✅ Fase 1: Especificación del Protocolo y Prototipo Base (COMPLETADO)
- [x] Crear estructura base del proyecto (Next.js 16 + TypeScript + Tailwind CSS).
- [x] Definir el esquema de tipos del protocolo Agente-UI (`src/types/agent-protocol.ts`).
- [x] Construir el Showroom de la Concesionaria con visor de vehículos y cambio de color animado (`framer-motion`).
- [x] Crear el formulario interactivo asistido para pruebas de manejo.

### ✅ Fase 2: Integración CopilotKit $\leftrightarrow$ `ovni-agent` via AG-UI (COMPLETADO *con defectos*)
- [x] Instalar y configurar `@copilotkit/react-core`, `@copilotkit/react-ui` y `@copilotkit/runtime`.
- [x] Declarar las **CopilotActions** (`navigateToSection`, `selectCarModel`, `changeCarColor`, `filterCatalog`, `openTestDriveForm`) y la exposición del estado (`useCopilotReadable`).
- [x] Crear el **Router AG-UI en `ovni-agent`** (`src/server/routes/copilotkit.ts`) con soporte para `/info`, `/threads` y `/threads/:id/runs/stream` (sin alterar el código existente).
- [x] Conectar `LangGraphHttpAgent` en `web-ia/src/app/api/copilotkit/route.ts` apuntando a `http://localhost:8080/copilotkit`.
- [x] Verificar compilación y comunicación de punta a punta entre frontend y backend.

> **Nota de auditoría (2026-10-05).** "Comunicación de punta a punta" se verificó a nivel de
> transporte HTTP: el backend emite `RUN_STARTED` → `TEXT_MESSAGE_*` → `RUN_FINISHED`
> correctamente. Lo que **no** funciona es la capa semántica:
>
> | # | Defecto | Ubicación | Efecto |
> | :-: | :--- | :--- | :--- |
> | 1 | `useCopilotChat()` no expone `visibleMessages` en el runtime, pero el `.d.mts` lo tipa como required | `AgentWidget.tsx:13-14` | `messages = []` siempre. **Los mensajes nunca se pintan.** Fallo 100% silencioso (TS no lo detecta). |
> | 2 | `msg.isTextMessage()` no existe en los mensajes AG-UI (son objetos planos `{id, role, content}`) | `AgentWidget.tsx:58` | Todos los mensajes se filtran a `null`. |
> | 3 | `AgentWidget` es `fixed bottom-6 right-6 w-96 z-50` | `AgentWidget.tsx` vs `react-ui/index.css:84` | El panel tapa por completo al launcher `.copilotKitButton` (`z-index: 30`). El `CopilotPopup` oficial no se puede abrir. |
> | 4 | `POST /` usa `randomUUID()` como `thread_id` y sólo reenvía el último mensaje de usuario | `ovni-agent/.../copilotkit.ts:70-75` | Chat **stateless**: el `FirestoreCheckpointer` nunca acumula historial. |
> | 5 | `req.body.tools` se descarta; `bindTools()` sólo recibe tools internas de OVNI | `copilotkit.ts:74`, `nodes/model.ts:62,74,99,102,125` | **El LLM nunca ve las CopilotActions.** El agente no puede controlar la UI. Contradice el diseño objetivo de este documento. |
> | 6 | `streamMode: "updates"`; sólo se reenvía `chunk.agent?.messages` | `copilotkit.ts:127-171` | Se pierden `tool_calls`, `STATE_SNAPSHOT`, `STEP_STARTED`, `MESSAGES_SNAPSHOT`. |
> | 7 | El filtro de precio retorna antes de evaluar `maxPrice` | `DealershipShowroom.tsx:12-17` | Código muerto: el filtro de precio nunca aplica. |
> | 8 | El botón "Cerrar" del modal despacha `FILL_TEST_DRIVE name=''` | `DealershipShowroom.tsx:183` | No existe la acción `CLOSE_TEST_DRIVE` en `agent-protocol.ts:35-42` → el modal no se puede cerrar. |
> | 9 | `runtimeUrl="/api/copilotkit"` sin `useSingleEndpoint` | `page.tsx:89` | Funciona por auto-detect (`GET /info` → modo REST). Frágil. |
> | 10 | `route.ts` y `[...copilotkit]/route.ts` están duplicados literalmente | `web-ia/src/app/api/copilotkit/` | Los `as any` sobre `LangGraphHttpAgent` ocultan que `HttpAgentConfig` exige `url`. |

---

### 🚧 Fase 2.5: Migración a LangGraph Platform Protocol — *Client-Side Tool Injection real* (EN CURSO)

**Objetivo.** Que el LLM de `ovni-agent` pueda emitir tool calls que ejecuten las
CopilotActions del navegador, y que el chat tenga memoria real (threads + checkpoints).

**Por qué migrar y no parchear.** El router actual emite eventos AG-UI a mano. Eso obliga a
reinventar `handleSingleEvent` de `@ag-ui/langgraph`, que ya resuelve: acumulación de deltas
de `TOOL_CALL_ARGS`, orden de `TEXT_MESSAGE_START` vs. el primer tool call, mapeo de
interrupts, `STATE_SNAPSHOT`, y el bug `#2014` (no re-anunciar un tool call en un resume
HITL, porque `emittedToolCallStartIds` se resetea en cada run). Migrar delega todo eso a
código upstream testeado, y además **borra** código propio.

**Diferencia de protocolo clave.** El decoder SSE del SDK lee el campo **`event:`** como
clave de *stream mode* (`@langchain/langgraph-sdk/dist/utils/sse.js:88`). El formato de
LangGraph Platform es:

```
event: <metadata|events|values|updates|end|error>
data:  <json>

```

El router actual emite `data:` pelado con eventos AG-UI dentro — incompatible.

#### Fase 2.5 — Bloque 0: Desbloqueo de render (frontend) — ✅ COMPLETADO

Sin esto no hay forma de observar nada mientras se migra el transporte. B **no** arregla
estos tres defectos: son bugs de render, no de protocolo.

- [x] **0.1** `AgentWidget.tsx` — **causa raíz más profunda de la que se sospechaba**: no es sólo que `visibleMessages` no venga. `useCopilotChat` declara
  ```ts
  type UseCopilotChatReturn = Omit<UseCopilotChatReturn$1, "messages" | "sendMessage" | ...>;
  ```
  (`react-core/dist/index.d.mts:303`). El tipo **oculta** `messages`/`sendMessage` y **expone**
  `visibleMessages`, que el runtime nunca devuelve. Ambas caras del tipo están mal, y por eso
  `tsc` no marcaba nada. Solución: `useCopilotChatInternal()`, que sí está tipado con la forma
  real (`UseCopilotChatReturn$1`), no exige `publicApiKey` y es el mismo hook que consume el
  `CopilotPopup` oficial. *(Descartado: `useCopilotChatHeadless_c`, que sí expone `messages`
  pero está gateado por CopilotKit Cloud y pediría `publicApiKey` → banner de error.)*
- [x] **0.2** `AgentWidget.tsx` — eliminado `msg.isTextMessage()`; los mensajes AG-UI son objetos planos. Se agrega `toText()` porque `content` puede ser `string` **o** `ContentPart[]` (multimodal). Se filtra por `role` (`user`/`assistant`) para no pintar `tool`/`reasoning`/`activity`.
- [x] **0.3** `AgentWidget` movido a `bottom-6 left-6 z-40`. Deja libre el launcher oficial `.copilotKitButton` (`bottom/right 1rem`, `z-index 30`) y ambos UIs coexisten.
- [x] **0.4** Defectos 7–10: filtro de precio (condiciones AND), `CLOSE_TEST_DRIVE` agregada a `agent-protocol.ts` + reducer + botón "Cerrar", `useSingleEndpoint` en `page.tsx`, y rutas deduplicadas en `src/lib/copilotkit-runtime.ts` (los `as any` eliminados: `name` no existe en `HttpAgentConfig`; el agente se indexa por la clave del mapa `agents`).

**Verificación:** `tsc --noEmit` limpio · `lint` 0 errores / 1 warning (el de `<img>`, intencional por URLs remotas) · `next build` OK · smoke HTTP devuelve la cadena AG-UI completa con respuesta real de Eva.

> ⚠️ **Pendiente de validación visual (no automatizable sin navegador headless):** confirmar en el navegador que (a) los mensajes ahora se pintan en el widget izquierdo y (b) el `CopilotPopup` se abre sin solapamiento.

#### Fase 2.5 — Bloque 1: Superficie HTTP en `ovni-agent`

Buen noticia: **las rutas ya existen** en `src/server/routes/copilotkit.ts` (`/threads`,
`/threads/:id`, `/threads/:id/runs/stream`, `/threads/:id/runs`) pero son *stubs huecos*
— devuelven `values: {}` fabricated y no tocan el checkpointer. El trabajo es hacerlas
reales, no escribirlas desde cero.

- [ ] **1.1** `GET /info` → agregar metadata de capacidades real (dejará de devolver `{"version":"1"}` hardcodeado).
- [ ] **1.2** `POST /threads` → crear el thread persistido vía `FirestoreCheckpointer` (hoy fabricate un UUID).
- [ ] **1.3** `GET /threads/:id` → devolver `values` reales desde el checkpointer (hoy siempre `{}`).
- [ ] **1.4** `GET /threads/:id/state` → **endpoint nuevo**. Requerido por `LangGraphAgent.getCheckpointByMessage()`; sin él no hay resume ni HITL.
- [ ] **1.5** `GET /assistants/:graphId` → **endpoint nuevo**. Debe incluir `graph.input_schema` / `output_schema` / `state_schema` para que `getSchemaKeys()` y `getCapabilities()` funcionen. Se puede derivar de `graph.getGraph().toJSON()`.
- [ ] **1.6** `POST /threads/:id/runs/:runId/cancel` → **endpoint nuevo**, requerido por `abortRun()`.
- [ ] **1.7** Exponer `FirestoreCheckpointer` por HTTP con el shape de Platform (`GET /threads/:id/state?checkpoint_id=`).

#### Fase 2.5 — Bloque 2: Streaming LangGraph real

- [ ] **2.1** Cambiar `graph.stream(input, { streamMode: "updates" })` por `streamMode: ["events", "values"]`. **Requisito estricto**: `LangGraphAgent.handleSingleEvent` sólo se activa si ve eventos `on_chat_model_stream` (`eventsStreamActive`); con `updates` el modelo nunca anuncia tool calls.
- [ ] **2.2** Emitir SSE con campo `event:` (`metadata` → `events` → `values` → `end`), no AG-UI crudo.
- [ ] **2.3** Reenviar el historial completo de `input.messages` al grafo, no sólo el último mensaje de usuario (defecto 4). Usar `thread_id` del body, no `randomUUID()`.
- [ ] **2.4** Propagar `interrupt()` del grafo como evento `on_interrupt` para habilitar HITL en el futuro.

#### Fase 2.5 — Bloque 3: Inyección de las CopilotActions (el objetivo real)

- [ ] **3.1** Recibir `input.tools` (formato AG-UI: `{type:"function", name, description, parameters}`) en `runs/stream`.
- [ ] **3.2** Convertir de JSON Schema a herramientas LangChain y combinarlas con las tools internas de OVNI Studio (`src/tools/index.js`).
- [ ] **3.3** `bindTools([...ovniTools, ...clientTools])` en `nodes/model.ts`. **Este es el punto que hoy rompe todo**: sin esto el modelo no puede pedir jamás `navigateToSection` ni `changeCarColor`.
- [ ] **3.4** Verificar el round-trip completo: `toolCallId` emitido = `tool_call.id` de LangChain, para que el `ToolMessage` que arma el browser coincida con lo que espera el `toolsCondition` del grafo.
- [ ] **3.5** Confirmar que el `conditional edge toolsCondition` enruta al nodo correcto cuando la tool es frontend (no debe intentar ejecutarla server-side).

#### Fase 2.5 — Bloque 4: Cutover

- [ ] **4.1** Agregar `@langchain/langgraph-sdk` a `ovni-agent/package.json` (ya está instalado transitivamente vía `@ag-ui/langgraph` en `web-ia`; fijar versión explícita para no depender de eso).
- [ ] **4.2** En `web-ia/src/app/api/copilotkit/route.ts`, reemplazar `LangGraphHttpAgent` por `LangGraphAgent({ deploymentUrl, graphId })`. Eliminar el shim REST→envelope y los `as any`.
- [ ] **4.3** Bajar `useSingleEndpoint` explícito y unificar `route.ts` (defecto 10).
- [ ] **4.4** **Borrar** la emisión AG-UI hand-rolled de `ovni-agent` (~170 líneas).
- [ ] **4.5** Verificación end-to-end: pedirle a Eva "mostrame el SUV rojo" y confirmar que el showroom cambia de color.

**Criterio de salida de la Fase 2.5:** (a) el chat muestra historial y recuerda turnos previos; (b) una CopilotAction invocada por el modelo cambia la UI; (c) no queda emisión de eventos AG-UI a mano en `ovni-agent`.

---

### 🎨 Fase 2.6: Evolución UI/UX SPA Profesional, Sobria y Extensión del Catálogo (NUEVA)

**Objetivo.** Elevar el diseño visual de NovaMotors a un nivel *premium*, sobrio y sin scroll (Single Page Application pura con layout 100vh viewport-bound). Ampliar el catálogo a 6+ vehículos categorizados e incorporar un panel de filtros avanzado (categoría, rango de precio, tipo de motor/combustible) operable tanto de forma manual como por el Agente de IA.

#### Bloque 1: Arquitectura Layout SPA Estricto (Sin Scroll)
- [ ] **1.1** Reestructurar el contenedor principal a `h-screen overflow-hidden flex flex-col` con paleta de colores sobria y oscura (Slate/Zinc ultra-premium, acentos índigo/oro sutiles).
- [ ] **1.2** Rediseñar el Header/Navbar con pestañas compactas y estado de sesión/moneda.
- [ ] **1.3** Incorporar nuevas secciones al enum `UISection`: `'home' | 'showroom' | 'models' | 'finance' | 'contact'`.
- [ ] **1.4** Crear vistas compactas adaptadas al layout viewport-bound para las secciones 'finance' (Calculadora de Financiación / Cuotas) y 'models' (Comparador/Grilla sin scroll con paginación o pestañas).

#### Bloque 2: Extensión del Catálogo de Vehículos
- [ ] **2.1** Expandir `src/data/cars.ts` con más variedad de modelos y categorías:
  - *Apex Horizon SUV* (SUV - $42,000)
  - *Volt GT Electric* (Electric - $55,000)
  - *Luxe Prestige Sedan* (Sedan - $38,000)
  - *CyberTrack EV* (Pickup / Electric - $68,000)
  - *Starlight Cabriolet* (Deportivo - $72,000)
  - *Urban Pulse Hybrid* (Híbrido / Compacto - $29,000)
- [ ] **2.2** Actualizar los tipos `Car` en `src/types/agent-protocol.ts` para incluir parámetros avanzados de filtrado: `transmission`, `fuelType`, `year`, `featured`.

#### Bloque 3: Panel de Filtros Avanzados y Catálogo Integrado (Controlable por el Agente)
- [ ] **3.1** Extender el estado `filters` en `AgentUIContext` y `UIState`: `category`, `minPrice`, `maxPrice`, `fuelType`, `searchQuery`.
- [ ] **3.2** Crear la nueva Vista de Catálogo de Vehículos (`src/components/CarCatalog.tsx`) adaptada al layout SPA sin scroll:
  - Barra superior de filtrado dinámico: Búsqueda libre por texto, Chips de Categoría, Slider de Precio y Filtro de Motorización.
  - Grilla interactiva de autos filtrados en tiempo real con transiciones en `framer-motion`.
  - Tarjetas sobrias con información técnica clave y acciones directas: *"Inspeccionar en Showroom"* y *"Agendar Prueba"*.
- [ ] **3.3** Actualizar `CopilotIntegration.tsx`:
  - Extender `useCopilotReadable` enviando el catálogo completo extendido, resultados filtrados y filtros activos.
  - Extender `filterCatalog` action en `useCopilotAction` para aceptar `category`, `maxPrice`, `fuelType`, `searchQuery`.
  - Al ejecutar `filterCatalog`, el agente puede navegar automáticamente a la vista de Catálogo (`'models'`) o filtrar en vivo si el usuario ya está allí.
- [ ] **3.4** Crear la acción `setPriceRange` para ajustar límites de presupuesto por conversación con el agente.

#### Bloque 4: Refinamiento Estético & Animaciones
- [ ] **3.5** Rediseñar las fichas técnicas y visores de autos con micro-interacciones sutiles en `framer-motion`.
- [ ] **3.6** Integrar feedback visual en la UI cuando el agente ejecuta una herramienta (indicador glowing *"Filtrado por Asistente IA"*).

---

### ⏳ Fase 3: Interacción por Voz y Sincronía Multimodal (BLOQUEADA por Fase 2.5)
- [ ] Integrar WebRTC / OpenAI Realtime API o Web Speech API en el widget de CopilotKit.
- [ ] Sincronizar la narración de voz con la ejecución de cambios visuales en el Showroom.
- [ ] Agregar indicadores de voz en pantalla (ondas de audio al hablar/escuchar).

> La sincronización voz→acción depende de que las tool calls funcionen (Bloque 3).
> Hoy `nodes/textToSpeech.ts` narra, pero la acción visual nunca se dispara.

### 📋 Fase 4: Pruebas, Refinamiento y Despliegue
- [ ] Realizar pruebas de latencia y experiencia de usuario.
- [ ] Documentar la guía de desarrollo para extender nuevos componentes "Agent-Ready".

---

## 4. Registro de Decisión Técnica (ADR)

| Aspecto | Opción Seleccionada | Razón |
| :--- | :--- | :--- |
| **Framework Frontend** | React / Next.js (TypeScript) | Soporte para hooks nativos (`useCopilotAction`, `useCopilotReadable`) y animaciones en tiempo real. |
| **Protocolo Agente-UI** | CopilotKit AG-UI Standard | Client-Side Tool Injection: las herramientas de UI se declaran en el cliente sin contaminar el grafo del backend. |
| **Orquestador Backend** | `ovni-agent` (LangGraph + Express) | Servidor en puerto 8080. Se agregó el router `/copilotkit` como capa adaptadora aislada. |
| ~~**Conector Runtime**~~ | ~~`LangGraphHttpAgent`~~ | **Reemplazado** en Fase 2.5: el agente HTTP habla AG-UI crudo, lo que obliga a emitir eventos a mano. |
| **Conector Runtime (Fase 2.5)** | `LangGraphAgent` (`@ag-ui/langgraph`) sobre **LangGraph Platform Protocol** | Delega la traducción AG-UI a código upstream testeado (`handleSingleEvent`), gana tool calls / checkpoints / interrupts / `STATE_SNAPSHOT` sin escribir AG-UI a mano, y borra ~170 líneas de router propio. |
| **Transporte** | SSE con campo `event:` por stream mode | Formato nativo de LangGraph Platform; es lo que parsea `@langchain/langgraph-sdk/dist/utils/sse.js:88`. AG-UI crudo (`data:` pelado) queda como formato interno del runtime. |
| **Ciclo de vida de Tools** | Ejecución en el browser, loop dirigido por el cliente | `useFrontendTool` sólo registra el schema; el `handler` nunca sale del navegador. `RunHandler.processAgentResult` lo ejecuta y dispara el follow-up run. Por eso el backend debe **anunciar** la tool call, no ejecutarla. |

---

## 5. Instrucciones para Continuar el Desarrollo

Para retomar el trabajo en la siguiente sesión:

1. **Servidor Backend**:
   ```bash
   cd D:\Emi\apps\ovni-agent
   npm run dev
   ```
2. **Servidor Frontend**:
   ```bash
   cd D:\Emi\apps\web-ia
   npm run dev
   ```
3. Abrir `http://localhost:3000`.
4. **Próximo paso: Fase 2.5, Bloque 1** (superficie HTTP en `ovni-agent`).
   El Bloque 0 (render) ya está hecho y verificado; lo que sigue es el backend.

### Notas de verificación (2026-10-05)

- Ambos servidores levantados y respondiendo: frontend `:3000`, backend `:8080`.
- `npx tsc --noEmit` pasa limpio en `web-ia`. Ojo: los defectos 1 y 2 **no** los detecta,
  porque el `.d.mts` de `react-core` declara `visibleMessages` como required aunque el
  runtime nunca lo devuelva.
- `npm run lint`: 9 errores y 6 warnings (`no-explicit-any`, `jsx-no-comment-textnodes`,
  variables sin usar, `<img>`). A limpiar en el Bloque 0.
- Sin navegador headless (Playwright/Puppeteer) instalado: los defectos 1–3 se probaron por
  lectura de código, no visualmente. El defecto 3 **requiere** confirmación manual en el
  navegador.
- `@langchain/langgraph-sdk` ya está presente en el árbol de `web-ia` (transitivo de
  `@ag-ui/langgraph`); hay que declararlo explícitamente en `ovni-agent/package.json`.
