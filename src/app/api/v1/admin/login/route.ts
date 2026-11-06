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

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Body = z.object({
	identifier: z.string().trim().min(1),
	password: z.string().min(1),
});

export const POST = withRoute(async (req) => {
	const parsed = Body.safeParse(await req.json().catch(() => null));
	if (!parsed.success)
		throw new HttpError(400, "Identifier and password are required");
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
