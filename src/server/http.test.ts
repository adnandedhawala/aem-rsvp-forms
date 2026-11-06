import { describe, expect, it, vi } from "vitest";
import { HttpError, json, withRoute } from "./http";

vi.mock("@/server/db", () => ({ connectDb: vi.fn().mockResolvedValue({}) }));

const noStore = "no-store, no-cache, must-revalidate, max-age=0";

describe("json", () => {
	it("sends the no-store headers", () => {
		const res = json({ a: 1 });
		expect(res.status).toBe(200);
		expect(res.headers.get("cache-control")).toBe(noStore);
		expect(res.headers.get("pragma")).toBe("no-cache");
		expect(res.headers.get("expires")).toBe("0");
	});
});

describe("withRoute", () => {
	it("turns an HttpError into JSON with its status", async () => {
		const res = await withRoute(async () => {
			throw new HttpError(422, "bad", { x: 1 });
		})(new Request("http://x/"), {});
		expect(res.status).toBe(422);
		expect(await res.json()).toEqual({ error: "bad", details: { x: 1 } });
		expect(res.headers.get("cache-control")).toBe(noStore);
	});
	it("hides unexpected errors", async () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		const res = await withRoute(async () => {
			throw new Error("boom");
		})(new Request("http://x/"), {});
		expect(res.status).toBe(500);
		expect(await res.text()).not.toContain("boom");
		spy.mockRestore();
	});
});
