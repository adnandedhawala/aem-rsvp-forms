import { z } from "zod";
import { loginAdmin } from "@/server/auth/adminLogin";
import {
	ADMIN_COOKIE,
	ADMIN_MAX_AGE,
	cookieOptions,
	setCookieHeader,
	signAdminToken,
} from "@/server/auth/tokens";
import { HttpError, json, withRoute } from "@/server/http";
import { createRateLimiter } from "@/server/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW_MS = 15 * 60 * 1000;
const perAccount = createRateLimiter({ max: 10, windowMs: WINDOW_MS });
const perIp = createRateLimiter({ max: 30, windowMs: WINDOW_MS });

const Body = z.object({
	identifier: z.string().trim().min(1),
	password: z.string().min(1),
});

export const POST = withRoute(async (req) => {
	const parsed = Body.safeParse(await req.json().catch(() => null));
	if (!parsed.success)
		throw new HttpError(400, "Identifier and password are required");
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	const account = parsed.data.identifier.toLowerCase();
	if (!perIp.hit(ip) || !perAccount.hit(`${ip}:${account}`)) {
		throw new HttpError(429, "Too many attempts, please wait 15 minutes");
	}
	const claims = await loginAdmin(parsed.data);
	const token = await signAdminToken(claims);
	return json(claims, {
		headers: {
			"Set-Cookie": setCookieHeader(
				ADMIN_COOKIE,
				token,
				cookieOptions(ADMIN_MAX_AGE),
			),
		},
	});
});
