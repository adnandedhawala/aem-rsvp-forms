import type { NextConfig } from "next";
import { NO_STORE_HEADERS } from "./src/lib/noStore";

const noStore = Object.entries(NO_STORE_HEADERS).map(([key, value]) => ({
	key,
	value,
}));

const nextConfig: NextConfig = {
	// Next.js rejects static: 0 (minimum is 30). Every page is dynamic and links use
	// prefetch={false}, so this client router cache never applies; do not enable prefetch.
	experimental: { staleTimes: { dynamic: 0, static: 30 } },
	async headers() {
		return [{ source: "/:path*", headers: noStore }];
	},
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};

export default nextConfig;
