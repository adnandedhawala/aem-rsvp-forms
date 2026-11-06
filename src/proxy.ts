import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./server/auth/tokens";

const NO_STORE = {
	"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	Pragma: "no-cache",
	Expires: "0",
};

function withNoStore(res: NextResponse): NextResponse {
	for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
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
