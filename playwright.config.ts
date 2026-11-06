import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	fullyParallel: false,
	workers: 1,
	reporter: "list",
	use: { baseURL: "http://localhost:3100" },
	projects: [
		{
			name: "nostore",
			testMatch: /noStore\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "mobile",
			testMatch: /household\.spec\.ts/,
			use: { ...devices["Pixel 7"] },
		},
		{
			name: "desktop",
			testMatch: /admin\.spec\.ts/,
			use: { ...devices["Desktop Chrome"] },
			dependencies: ["mobile"],
		},
	],
});
