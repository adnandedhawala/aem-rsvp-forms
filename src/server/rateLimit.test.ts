import { expect, it } from "vitest";
import { createRateLimiter } from "./rateLimit";

it("blocks after max hits in the window, then recovers", () => {
	const rl = createRateLimiter({ max: 3, windowMs: 1000 });
	expect([1, 2, 3].map(() => rl.hit("k", 0))).toEqual([true, true, true]);
	expect(rl.hit("k", 0)).toBe(false);
	expect(rl.hit("other", 0)).toBe(true);
	expect(rl.hit("k", 1001)).toBe(true);
});
