export function createRateLimiter(opts: { max: number; windowMs: number }) {
	const hits = new Map<string, number[]>();
	const SWEEP_AT = 1000;
	return {
		/** Returns false once `key` has been over `max` hits within the window. */
		hit(key: string, now: number = Date.now()): boolean {
			// Only rescan every key when the map has grown large
			if (hits.size > SWEEP_AT) {
				for (const [k, times] of hits) {
					if (times.every((t) => now - t >= opts.windowMs)) hits.delete(k);
				}
			}
			const times = (hits.get(key) ?? []).filter(
				(t) => now - t < opts.windowMs,
			);
			if (times.length >= opts.max) {
				hits.set(key, times);
				return false;
			}
			times.push(now);
			hits.set(key, times);
			return true;
		},
	};
}
