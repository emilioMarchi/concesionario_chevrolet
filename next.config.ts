import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
