import { defineConfig } from "vitest/config";

// Root `npm test` runs the engine tests and the web app tests.
export default defineConfig({ test: { include: ["test/**/*.test.ts", "web/test/**/*.test.ts"] } });
