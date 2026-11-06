import path from "node:path";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	resolve: {
		alias: { "server-only": path.resolve(__dirname, "tests/helpers/empty.ts") },
	},
	test: {
		environment: "node",
		setupFiles: ["vitest.setup.ts"],
		include: ["src/**/*.test.{ts,tsx}", "forms/**/*.test.ts"],
		testTimeout: 30000,
		hookTimeout: 120000,
	},
});
