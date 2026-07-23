import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // PGlite instancie un Postgres WASM par suite ; on laisse de la marge.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
