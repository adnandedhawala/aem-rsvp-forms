export function createRateLimiter(opts: { max: number; windowMs: number }) {
	const hits = new Map<string, number[]>();
	return {
		/** Returns false once `key` has been over `max` hits within the window. */
		hit(key: string, now: number = Date.now()): boolean {
			for (const [k, times] of hits) {
				const live = times.filter((t) => now - t < opts.windowMs);
				if (live.length) hits.set(k, live);
				else hits.delete(k);
			}
			const times = hits.get(key) ?? [];
			if (times.length >= opts.max) return false;
			times.push(now);
			hits.set(key, times);
			return true;
		},
	};
}
