import { existsSync } from "node:fs";
import mongoose from "mongoose";
import { assertDbAllowed } from "../src/server/env";
import { RsvpEntry } from "../src/server/models";

async function main() {
	if (existsSync(".env.local")) process.loadEnvFile(".env.local");
	const prod = process.argv.includes("--prod");
	const dbName = assertDbAllowed({
		dbName: process.env.MONGODB_DBNAME,
		vercelEnv: prod ? "production" : undefined,
	});
	const uri = process.env.MONGODB_URI;
	if (!uri) throw new Error("MONGODB_URI is not set");
	await mongoose.connect(uri, { dbName });
	await RsvpEntry.syncIndexes();
	console.log(`rsvp_entry indexes on ${dbName}:`);
	console.log(await RsvpEntry.listIndexes());
	await mongoose.disconnect();
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
