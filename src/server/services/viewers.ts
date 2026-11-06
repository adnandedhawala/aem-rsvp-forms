import "server-only";
import { HttpError } from "../http";
import { RsvpEntry, User } from "../models";

/**
 * Viewers are rsvp_entry rows with kind "viewer" under rsvp "*" (never a
 * form slug), one per ITS. Every other query filters by rsvp and kind.
 */
const ALL = "*";
const key = (its: string) => ({
	rsvp: ALL,
	kind: "viewer" as const,
	file_id: "-",
	member_id: its,
});

export interface ViewerRow {
	its: string;
	name: string;
	addedBy: string | null;
	addedAt: string;
}

export async function listViewers(): Promise<ViewerRow[]> {
	const rows = await RsvpEntry.find({
		rsvp: ALL,
		kind: "viewer",
		is_removed: false,
	}).lean();
	const users = await User.find({
		itsId: { $in: rows.map((r) => Number(r.member_id)) },
	}).lean();
	const nameOf = new Map(users.map((u) => [String(u.itsId), u.name]));
	return rows
		.map((r) => ({
			its: r.member_id ?? "",
			name: nameOf.get(r.member_id ?? "") ?? "",
			addedBy: r.invited_by,
			addedAt: new Date(r.updatedAt).toISOString(),
		}))
		.sort((a, b) => a.name.localeCompare(b.name) || a.its.localeCompare(b.its));
}

export async function addViewer(its: string, by: string): Promise<void> {
	const id = its.trim();
	const user = /^\d+$/.test(id)
		? await User.findOne({ itsId: Number(id) }).lean()
		: null;
	if (!user) throw new HttpError(404, "No AEM user with this ITS");
	await RsvpEntry.updateOne(
		key(id),
		{
			$set: { is_removed: false, invited_by: by },
			$setOnInsert: { tanzeem_file_no: 0 },
		},
		{ upsert: true },
	);
}

export async function removeViewer(its: string): Promise<void> {
	await RsvpEntry.updateOne(key(its.trim()), { $set: { is_removed: true } });
}

export async function isViewer(its: string): Promise<boolean> {
	return (await RsvpEntry.exists({ ...key(its), is_removed: false })) !== null;
}
