import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

// Pozn.: soubor má příponu `.mts`, aby Vite/Vitest načetl ESM konfiguraci
// i bez `"type": "module"` v package.json (jinak hlásí CJS/ESM varování).
export default defineConfig({
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  test: {
    // Plánovací logika je čistá (bez DOM/prohlížeče).
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
