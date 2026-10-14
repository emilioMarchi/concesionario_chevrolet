import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CopilotKit v2 necesita la public API key en el cliente (provider). Como la
  // variable es `COPILOT_API_KEY` (sin prefijo NEXT_PUBLIC_), la exponemos al
  // bundle vía `env`. Es una clave pública por diseño.
  env: {
    COPILOT_API_KEY: process.env.COPILOT_API_KEY ?? "",
  },
};

export default nextConfig;
