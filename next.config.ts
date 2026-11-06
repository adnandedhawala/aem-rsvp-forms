import type { NextConfig } from "next";

// Same values as NO_STORE_HEADERS in src/server/http.ts (that file is server-only,
// so it can't be imported here).
const noStore = [
	{
		key: "Cache-Control",
		value: "no-store, no-cache, must-revalidate, max-age=0",
	},
	{ key: "Pragma", value: "no-cache" },
	{ key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
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
