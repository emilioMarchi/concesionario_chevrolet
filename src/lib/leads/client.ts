'use client';

// Cliente de telemetría de recorrido UI. Acumula eventos y los envía en lote a
// `/api/telemetry`, que es quien resuelve la identidad (cookie `nv_uid`).
export interface UIEventInput {
  type: string;
  name?: string;
  payload?: unknown;
}

const FLUSH_INTERVAL_MS = 3000;
const MAX_BATCH = 20;

let queue: (UIEventInput & { id: string; ts: string })[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function scheduleFlush() {
  if (timer || typeof window === 'undefined') return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_INTERVAL_MS);
}

export async function flush(): Promise<void> {
  if (!queue.length || typeof window === 'undefined') return;
  const batch = queue;
  queue = [];
  try {
    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // Si falla, descartamos el lote (telemetría best-effort).
  }
}

export function trackUIAction(input: UIEventInput): void {
  if (typeof window === 'undefined') return;
  queue.push({ ...input, id: makeId(), ts: new Date().toISOString() });
  if (queue.length >= MAX_BATCH) {
    void flush();
  } else {
    scheduleFlush();
  }
}
