import { type NextRequest, NextResponse } from "next/server";
import { NO_STORE_HEADERS } from "./lib/noStore";
import { ADMIN_COOKIE, verifyAdminToken } from "./server/auth/tokens";

function withNoStore(res: NextResponse): NextResponse {
	for (const [k, v] of Object.entries(NO_STORE_HEADERS)) res.headers.set(k, v);
	return res;
}

export async function proxy(req: NextRequest): Promise<NextResponse> {
	const { pathname } = req.nextUrl;
	const guarded =
		(pathname === "/admin" || pathname.startsWith("/admin/")) &&
		pathname !== "/admin/login" &&
		!pathname.startsWith("/admin/login/");
	if (guarded) {
		const claims = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
		if (!claims) {
			const url = req.nextUrl.clone();
			url.pathname = "/admin/login";
			url.search = `?next=${encodeURIComponent(pathname)}`;
			return withNoStore(NextResponse.redirect(url, 307));
		}
	}
	return withNoStore(NextResponse.next());
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
