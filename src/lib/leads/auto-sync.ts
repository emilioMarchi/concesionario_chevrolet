import 'server-only';

// Auto-sync: agenda un ETL diferido por visitante. Se apoya en debounce para no
// recalificar en cada acción de UI ni en cada evento del thread.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const DEFAULT_DELAY_MS = 8000;

function disabled(): boolean {
  return process.env.AUTO_SYNC_DISABLED === 'true';
}

/**
 * Programa una sincronización (ETL) para `userId` tras un periodo de calma.
 * Llamadas repetidas reinician el temporizador (debounce).
 */
export function scheduleSync(userId: string, delayMs = DEFAULT_DELAY_MS): void {
  if (!userId || disabled()) return;

  const existing = pending.get(userId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pending.delete(userId);
    void (async () => {
      try {
        // Import dinámico para evitar ciclos con el runtime.
        const { runEtl } = await import('./etl');
        await runEtl(userId);
      } catch (error) {
        console.warn(`[auto-sync] fallo el sync de ${userId}:`, error);
      }
    })();
  }, delayMs);
  // No bloquear el proceso por el temporizador (dev/long-running).
  if (typeof timer.unref === 'function') timer.unref();
  pending.set(userId, timer);
}

/**
 * Cancela todos los syncs diferidos pendientes. Se usa al resetear los datos
 * para que un ETL agendado no vuelva a poblar visitantes/leads con datos viejos.
 */
export function cancelAllScheduledSync(): void {
  for (const timer of pending.values()) clearTimeout(timer);
  pending.clear();
}
