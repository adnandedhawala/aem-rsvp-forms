import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { signAdminToken } from "./server/auth/tokens";

const noStore = "no-store, no-cache, must-revalidate, max-age=0";

beforeAll(() => {
	vi.stubEnv("JWT_SECRET", "s".repeat(40));
	vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
	vi.stubEnv("MONGODB_DBNAME", "aem-dev");
});

describe("proxy", () => {
	it("puts no-store on every response", async () => {
		const res = await proxy(new NextRequest("http://x/r/sample-rsvp"));
		expect(res.headers.get("cache-control")).toBe(noStore);
	});
	it("redirects /admin without a cookie", async () => {
		const res = await proxy(new NextRequest("http://x/admin"));
		expect(res.status).toBe(307);
		expect(
			new URL(res.headers.get("location") ?? "").pathname +
				new URL(res.headers.get("location") ?? "").search,
		).toBe("/admin/login?next=%2Fadmin");
		expect(res.headers.get("cache-control")).toBe(noStore);
	});
	it("lets /admin/login through", async () => {
		const res = await proxy(new NextRequest("http://x/admin/login"));
		expect(res.status).toBe(200);
	});
	it("lets /admin through with a valid admin cookie", async () => {
		const token = await signAdminToken({ itsId: 1, name: "A", role: "admin" });
		const res = await proxy(
			new NextRequest("http://x/admin", {
				headers: { cookie: `rsvp_admin=${token}` },
			}),
		);
		expect(res.status).toBe(200);
	});
});
