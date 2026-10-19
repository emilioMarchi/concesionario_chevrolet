import { randomUUID } from 'node:crypto';

/**
 * `crypto.randomUUID()` del global solo existe en runtimes con WebCrypto (Node
 * 19+/edge). En Node 18 el global `crypto` directamente no está definido, así que
 * usamos `node:crypto`, que sí está disponible en todos los runtimes Node que nos
 * interesan (Vercel y el servicio standalone del VPS).
 */
export function uuid(): string {
  return randomUUID();
}
