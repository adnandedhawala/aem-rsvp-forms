import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}", "forms/**/*.test.ts"],
		testTimeout: 30000,
		hookTimeout: 120000,
	},
});
