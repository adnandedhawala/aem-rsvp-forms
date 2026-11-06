import "server-only";
import mongoose from "mongoose";
import { getServerEnv } from "./env";

declare global {
	// eslint-disable-next-line no-var
	var __rsvpMongoose: Promise<typeof mongoose> | undefined;
}

export function connectDb(): Promise<typeof mongoose> {
	if (!globalThis.__rsvpMongoose) {
		const { mongoUri, dbName } = getServerEnv();
		mongoose.set("strictQuery", true);
		globalThis.__rsvpMongoose = mongoose
			.connect(mongoUri, { dbName, autoIndex: dbName === "aem-dev" })
			.catch((err) => {
				globalThis.__rsvpMongoose = undefined;
				throw err;
			});
	}
	return globalThis.__rsvpMongoose;
}
