import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { proxy } from "./proxy";

it("puts no-store on every response", async () => {
	const res = await proxy(new NextRequest("http://x/r/sample-rsvp"));
	expect(res.headers.get("cache-control")).toBe(
		"no-store, no-cache, must-revalidate, max-age=0",
	);
});
