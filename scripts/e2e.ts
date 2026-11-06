import { spawn, spawnSync } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { invite, seedBasic, startTestDb } from "../tests/helpers/db";

const PORT = 3100;

async function waitForHealth(timeoutMs: number): Promise<void> {
	const end = Date.now() + timeoutMs;
	while (Date.now() < end) {
		try {
			const res = await fetch(`http://localhost:${PORT}/api/v1/health`);
			if (res.ok) return;
		} catch {
			// not up yet
		}
		await new Promise((r) => setTimeout(r, 500));
	}
	throw new Error("Server did not become healthy in time");
}

async function main(): Promise<number> {
	const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
	let server: ReturnType<typeof spawn> | undefined;
	try {
		const uri = repl.getUri();
		await startTestDb({ uri });
		await seedBasic();
		await invite("sample-rsvp", ["10000001", "10000002"]);
		await mongoose.disconnect();

		const env = {
			...process.env,
			MONGODB_URI: uri,
			MONGODB_DBNAME: "aem-dev",
			JWT_SECRET: "e2e-secret-e2e-secret-e2e-secret-1",
		};
		const build = spawnSync("npx", ["next", "build"], {
			stdio: "inherit",
			env,
		});
		if (build.status !== 0) return build.status ?? 1;

		server = spawn("npx", ["next", "start", "-p", String(PORT)], {
			stdio: "inherit",
			env,
		});
		await waitForHealth(60_000);

		const pw = spawnSync("npx", ["playwright", "test"], {
			stdio: "inherit",
			env,
		});
		return pw.status ?? 1;
	} finally {
		server?.kill();
		await repl.stop();
	}
}

main().then(
	(code) => process.exit(code),
	(err) => {
		console.error(err);
		process.exit(1);
	},
);
