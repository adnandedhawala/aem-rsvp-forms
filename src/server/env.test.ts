import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDbAllowed, getServerEnv } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("assertDbAllowed", () => {
	it("allows aem-dev anywhere", () => {
		expect(assertDbAllowed({ dbName: "aem-dev", vercelEnv: undefined })).toBe(
			"aem-dev",
		);
		expect(
			assertDbAllowed({ dbName: "aem-dev", vercelEnv: "production" }),
		).toBe("aem-dev");
	});
	it("allows aem-prod only on Vercel production", () => {
		expect(
			assertDbAllowed({ dbName: "aem-prod", vercelEnv: "production" }),
		).toBe("aem-prod");
		expect(() =>
			assertDbAllowed({ dbName: "aem-prod", vercelEnv: "preview" }),
		).toThrow(/aem-prod.*only.*production/i);
		expect(() =>
			assertDbAllowed({ dbName: "aem-prod", vercelEnv: undefined }),
		).toThrow();
	});
	it("rejects unknown or missing names", () => {
		expect(() =>
			assertDbAllowed({ dbName: "am-prod", vercelEnv: "production" }),
		).toThrow(/must be aem-dev or aem-prod/);
		expect(() =>
			assertDbAllowed({ dbName: undefined, vercelEnv: undefined }),
		).toThrow();
	});
});

describe("getServerEnv", () => {
	const valid = () => {
		vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
		vi.stubEnv("MONGODB_DBNAME", "aem-dev");
		vi.stubEnv("JWT_SECRET", "x".repeat(32));
		vi.stubEnv("VERCEL_ENV", "");
	};
	it("returns values for a valid dev setup", () => {
		valid();
		const env = getServerEnv();
		expect(env.isDevDb).toBe(true);
		expect(env.dbName).toBe("aem-dev");
		expect(env.jwtSecret).toBeInstanceOf(Uint8Array);
	});
	it("rejects a short JWT_SECRET", () => {
		valid();
		vi.stubEnv("JWT_SECRET", "short");
		expect(() => getServerEnv()).toThrow(/JWT_SECRET/);
	});
	it("rejects a missing MONGODB_URI", () => {
		valid();
		vi.stubEnv("MONGODB_URI", "");
		expect(() => getServerEnv()).toThrow(/MONGODB_URI/);
	});
});
