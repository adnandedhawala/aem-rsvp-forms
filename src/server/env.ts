import "server-only";

export type DbName = "aem-dev" | "aem-prod";

export function assertDbAllowed(input: {
	dbName: string | undefined;
	vercelEnv: string | undefined;
}): DbName {
	const { dbName, vercelEnv } = input;
	if (dbName !== "aem-dev" && dbName !== "aem-prod") {
		throw new Error(
			`MONGODB_DBNAME must be aem-dev or aem-prod (got ${dbName ?? "nothing"})`,
		);
	}
	if (dbName === "aem-prod" && vercelEnv !== "production") {
		throw new Error("aem-prod is allowed only on Vercel production");
	}
	return dbName;
}

export function getServerEnv(): {
	mongoUri: string;
	dbName: DbName;
	jwtSecret: Uint8Array;
	isDevDb: boolean;
} {
	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) throw new Error("MONGODB_URI is not set");
	const dbName = assertDbAllowed({
		dbName: process.env.MONGODB_DBNAME,
		vercelEnv: process.env.VERCEL_ENV || undefined,
	});
	const secret = process.env.JWT_SECRET;
	if (!secret || secret.length < 32)
		throw new Error("JWT_SECRET must be at least 32 characters");
	return {
		mongoUri,
		dbName,
		jwtSecret: new TextEncoder().encode(secret),
		isDevDb: dbName === "aem-dev",
	};
}
