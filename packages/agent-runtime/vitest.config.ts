import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // PGlite (WASM) est lourd : on exécute les fichiers EN SÉRIE, chacun dans son propre fork isolé
    // (détruit après le fichier → WASM libéré entre fichiers). Combiné à l'instance PGlite partagée
    // par fichier (harness), au plus une instance vivante à la fois.
    fileParallelism: false,
  },
});
