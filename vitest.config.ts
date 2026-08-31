import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/tests/**/*.unit.spec.ts", "tests/**/*.unit.spec.ts"],
  },
});
