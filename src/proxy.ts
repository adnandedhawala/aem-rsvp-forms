import { type NextRequest, NextResponse } from "next/server";

const NO_STORE = {
	"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	Pragma: "no-cache",
	Expires: "0",
};

export async function proxy(_req: NextRequest): Promise<NextResponse> {
	const res = NextResponse.next();
	for (const [k, v] of Object.entries(NO_STORE)) res.headers.set(k, v);
	return res;
}

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
