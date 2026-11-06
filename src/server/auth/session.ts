import "server-only";
import { HttpError } from "../http";
import { isViewer } from "../services/viewers";
import {
	ADMIN_COOKIE,
	type AdminClaims,
	HOUSEHOLD_COOKIE,
	type HouseholdClaims,
	verifyAdminToken,
	verifyHouseholdToken,
} from "./tokens";

function readCookie(req: Request, name: string): string | undefined {
	const header = req.headers.get("cookie");
	if (!header) return undefined;
	for (const part of header.split(";")) {
		const i = part.indexOf("=");
		if (i > 0 && part.slice(0, i).trim() === name)
			return part.slice(i + 1).trim();
	}
	return undefined;
}

/** An admin, or a viewer who is still on the viewers list. For read routes. */
export async function requireStaff(req: Request): Promise<AdminClaims> {
	const claims = await verifyAdminToken(readCookie(req, ADMIN_COOKIE));
	if (!claims) throw new HttpError(401, "Not signed in");
	// Checked on every request so a removed viewer is locked out straight away
	if (claims.role === "viewer" && !(await isViewer(String(claims.itsId))))
		throw new HttpError(401, "Not signed in");
	return claims;
}

/** Admins only. For every route that changes data. */
export async function requireAdmin(req: Request): Promise<AdminClaims> {
	const claims = await requireStaff(req);
	if (claims.role !== "admin") throw new HttpError(403, "View-only access");
	return claims;
}

export async function requireHousehold(
	req: Request,
	slug: string,
): Promise<HouseholdClaims> {
	const claims = await verifyHouseholdToken(readCookie(req, HOUSEHOLD_COOKIE));
	if (!claims || claims.slug !== slug) {
		throw new HttpError(401, "Session expired, please sign in again");
	}
	return claims;
}
