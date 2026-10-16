export const ADMIN_COOKIE = 'nv_admin';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Token de sesión del backoffice derivado de `ADMIN_PASSWORD`. Se guarda en una
 * cookie HttpOnly en lugar de la contraseña en claro. Compatible con Edge
 * (Web Crypto) para poder validarse desde `middleware.ts`.
 */
export async function computeAdminToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const data = new TextEncoder().encode(`nv-admin::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export async function isValidAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await computeAdminToken();
  return expected !== null && value === expected;
}
