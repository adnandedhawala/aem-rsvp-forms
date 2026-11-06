import "server-only";
import { HttpError } from "../http";
import { User } from "../models";
import type { AdminClaims } from "./tokens";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function loginAdmin(input: {
	identifier: string;
	password: string;
}): Promise<AdminClaims> {
	const id = input.identifier.trim();
	const user = /^\d+$/.test(id)
		? await User.findOne({ itsId: Number(id) }).lean()
		: await User.findOne({
				email: new RegExp(`^${escapeRegex(id)}$`, "i"),
			}).lean();
	if (!user || user.password !== input.password)
		throw new HttpError(401, "Invalid credentials");
	if (!user.userRole?.includes("Admin" as never))
		throw new HttpError(403, "Not an admin");
	return { itsId: user.itsId, name: user.name };
}
