import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy en el VPS: se empaqueta `.next/standalone` con sólo las dependencias
  // trazadas, y `next start` sirve el front + API en el mismo proceso. Así la app
  // y el runtime de CopilotKit quedan same-origin (sin CORS ni cookies cross-site).
  output: "standalone",
  // CopilotKit v2 necesita la public API key en el cliente (provider). Como la
  // variable es `COPILOT_API_KEY` (sin prefijo NEXT_PUBLIC_), la exponemos al
  // bundle vía `env`. Es una clave pública por diseño.
  env: {
    COPILOT_API_KEY: process.env.COPILOT_API_KEY ?? "",
    // El backend (ovni-agent) emite `organization_id`/`project_id` en los eventos
    // AG-UI que el cliente no reconoce; el stripper avisa por consola en dev. Es
    // metadata benigna ya removida, así que silenciamos ese ruido. Si aparece un
    // warning de transformación real, quitá esta línea para volver a verlo.
    SUPPRESS_TRANSFORMATION_WARNINGS: "true",
  },
  // firebase-admin usa require dinámico de módulos nativos; lo dejamos externo al
  // bundle del servidor para evitar warnings/errores de webpack.
  serverExternalPackages: ["firebase-admin"],
  // OJO: el build DEBE usar webpack (`next build --webpack`). Turbopack (default
  // en Next 16) tiene un bug con serverExternalPackages: genera un
  // `require('pino-<hash>')` interno que no existe en el standalone del VPS
  // ("Failed to load external module pino-28069d5257187539"). Con webpack el
  // trazado de fs es correcto.
  // Refuerzo: forzamos la copia completa de firebase-admin (y su árbol) al
  // standalone, porque el trace por sí solo dejaba sólo 18/248 archivos.
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/firebase-admin/**/*",
      "./node_modules/google-gax/**/*",
      "./node_modules/google-auth-library/**/*",
      "./node_modules/gcp-metadata/**/*",
      "./node_modules/@google-cloud/**/*",
      "./node_modules/@grpc/**/*",
      "./node_modules/proto3-json-serializer/**/*",
      "./node_modules/protobufjs/**/*",
    ],
  },
};

export default nextConfig;
