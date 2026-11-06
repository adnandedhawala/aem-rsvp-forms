import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { getServerEnv } from "../env";

export const ADMIN_COOKIE = "rsvp_admin";
export const HOUSEHOLD_COOKIE = "rsvp_household";
export const ADMIN_MAX_AGE = 12 * 60 * 60;
export const HOUSEHOLD_MAX_AGE = 30 * 60;

export type AdminClaims = { itsId: number; name: string };
export type HouseholdClaims = {
	slug: string;
	fileId: string;
	fileNo: number;
	signedInIts: string;
};

async function sign(
	claims: object,
	aud: string,
	maxAge: number,
): Promise<string> {
	return new SignJWT({ ...claims })
		.setProtectedHeader({ alg: "HS256" })
		.setAudience(aud)
		.setIssuedAt()
		.setExpirationTime(`${maxAge}s`)
		.sign(getServerEnv().jwtSecret);
}

async function verify(token: string | undefined, aud: string) {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, getServerEnv().jwtSecret, {
			audience: aud,
			algorithms: ["HS256"],
		});
		return payload;
	} catch {
		return null;
	}
}

export const signAdminToken = (c: AdminClaims) =>
	sign(c, "admin", ADMIN_MAX_AGE);
export const signHouseholdToken = (c: HouseholdClaims) =>
	sign(c, "household", HOUSEHOLD_MAX_AGE);

export async function verifyAdminToken(
	token?: string,
): Promise<AdminClaims | null> {
	const p = await verify(token, "admin");
	if (!p || typeof p.itsId !== "number" || typeof p.name !== "string")
		return null;
	return { itsId: p.itsId, name: p.name };
}

export async function verifyHouseholdToken(
	token?: string,
): Promise<HouseholdClaims | null> {
	const p = await verify(token, "household");
	if (
		!p ||
		typeof p.slug !== "string" ||
		typeof p.fileId !== "string" ||
		typeof p.fileNo !== "number" ||
		typeof p.signedInIts !== "string"
	) {
		return null;
	}
	return {
		slug: p.slug,
		fileId: p.fileId,
		fileNo: p.fileNo,
		signedInIts: p.signedInIts,
	};
}

export function cookieOptions(maxAgeSeconds: number) {
	return {
		httpOnly: true,
		sameSite: "lax" as const,
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: maxAgeSeconds,
	};
}

/** Builds a Set-Cookie header value. Use maxAge 0 with an empty value to clear. */
export function setCookieHeader(
	name: string,
	value: string,
	opts: ReturnType<typeof cookieOptions>,
): string {
	return [
		`${name}=${value}`,
		`Path=${opts.path}`,
		`Max-Age=${opts.maxAge}`,
		"HttpOnly",
		"SameSite=Lax",
		opts.secure ? "Secure" : "",
	]
		.filter(Boolean)
		.join("; ");
}
