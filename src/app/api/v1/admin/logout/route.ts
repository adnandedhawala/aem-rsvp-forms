import {
	ADMIN_COOKIE,
	cookieOptions,
	setCookieHeader,
} from "@/server/auth/tokens";
import { json, withRoute } from "@/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = withRoute(async () =>
	json(
		{ ok: true },
		{
			headers: {
				"Set-Cookie": setCookieHeader(ADMIN_COOKIE, "", cookieOptions(0)),
			},
		},
	),
);
