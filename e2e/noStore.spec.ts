import { expect, test } from "@playwright/test";

const pages = [
	"/",
	"/r/sample-rsvp",
	"/r/sample-rsvp/form",
	"/r/sample-rsvp/done",
	"/admin/login",
	"/admin",
	"/admin/r/sample-rsvp/invitees",
	"/admin/r/sample-rsvp/responses",
];
const apis = [
	"/api/v1/health",
	"/api/v1/rsvp/sample-rsvp",
	"/api/v1/rsvp/sample-rsvp/household",
	"/api/v1/admin/rsvp",
	"/api/v1/admin/rsvp/sample-rsvp/responses",
	"/api/v1/admin/rsvp/sample-rsvp/invitees",
];

test("every page and API route is no-store", async ({ request }) => {
	for (const path of [...pages, ...apis]) {
		const res = await request.get(path, { maxRedirects: 0 });
		expect(res.headers()["cache-control"], path).toContain("no-store");
	}
});

test("admin routes are no-store when signed in", async ({ request }) => {
	const login = await request.post("/api/v1/admin/login", {
		data: { identifier: "30000001", password: "secret" },
	});
	expect(login.status()).toBe(200);
	for (const path of [...pages, ...apis].filter((p) => p.includes("admin"))) {
		const res = await request.get(path, { maxRedirects: 0 });
		expect(res.status(), path).toBeLessThan(400);
		expect(res.headers()["cache-control"], path).toContain("no-store");
	}
});

test("RSC requests are no-store", async ({ request }) => {
	const res = await request.get("/r/sample-rsvp", { headers: { RSC: "1" } });
	expect(res.headers()["cache-control"]).toContain("no-store");
});
