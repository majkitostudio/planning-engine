import { defineConfig } from "vitest/config";

// Pozn.: soubor má příponu `.mts`, aby Vite/Vitest načetl ESM konfiguraci
// i bez `"type": "module"` v package.json (jinak hlásí CJS/ESM varování).
export default defineConfig({
  test: {
    // Plánovací logika je čistá (bez DOM/prohlížeče).
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
