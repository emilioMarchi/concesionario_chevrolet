import 'server-only';
import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Acceso server-side a Firestore propio. Solo se inicializa si hay credenciales:
//   - FIREBASE_SERVICE_ACCOUNT: JSON del service account (inline), o
//   - GOOGLE_APPLICATION_CREDENTIALS: path al JSON.
// Si no hay ninguna, `getDb()` devuelve `null` y el store degrada a memoria.
let app: App | null = null;
let resolved = false;

function resolveApp(): App | null {
  if (resolved) return app;
  resolved = true;
  try {
    if (getApps().length) {
      app = getApps()[0]!;
      return app;
    }
    const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inline) {
      app = initializeApp({ credential: cert(JSON.parse(inline)) });
      return app;
    }
    const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (path) {
      const json = JSON.parse(readFileSync(path, 'utf8'));
      app = initializeApp({ credential: cert(json) });
      return app;
    }
  } catch (error) {
    console.warn('[firebase-admin] no se pudo inicializar; se usa store en memoria:', error);
    app = null;
  }
  return app;
}

let settingsApplied = false;

export function getDb(): Firestore | null {
  const instance = resolveApp();
  if (!instance) return null;
  try {
    const db = getFirestore(instance);
    // `settings()` solo puede aplicarse una vez antes de la primera operación.
    // Tras un HMR el flag se resetea pero la instancia persiste, así que toleramos
    // el "already initialized" para no degradar a memoria sin motivo.
    if (!settingsApplied) {
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch {
        // otra carga (HMR) ya lo aplicó
      }
      settingsApplied = true;
    }
    return db;
  } catch (error) {
    console.warn('[firebase-admin] getFirestore falló; se usa store en memoria:', error);
    return null;
  }
}
