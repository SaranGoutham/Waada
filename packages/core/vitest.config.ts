import { defineConfig } from "vitest/config";

// `vitest run` → unit tests only. `vitest run --mode live` → only *.live.test.ts (real services).
export default defineConfig(({ mode }) => ({
  test: {
    include: mode === "live" ? ["test/**/*.live.test.ts"] : ["test/**/*.test.ts"],
    exclude: mode === "live" ? [] : ["test/**/*.live.test.ts"],
  },
}));
