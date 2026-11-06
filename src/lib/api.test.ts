import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
	it("always sends no-store", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(new Response(JSON.stringify({ ok: true })));
		vi.stubGlobal("fetch", fetchMock);
		await api("/x");
		const init = fetchMock.mock.calls[0][1];
		expect(init.cache).toBe("no-store");
		expect(init.headers["Cache-Control"]).toBe("no-cache");
	});
	it("throws ApiError with the server's message and details", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(JSON.stringify({ error: "bad", details: { a: 1 } }), {
						status: 422,
					}),
				),
		);
		const err = await api("/x").catch((e) => e);
		expect(err).toBeInstanceOf(ApiError);
		expect(err).toMatchObject({
			status: 422,
			message: "bad",
			details: { a: 1 },
		});
	});
});
