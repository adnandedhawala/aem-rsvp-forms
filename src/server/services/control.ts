import "server-only";
import type { FormDef } from "@forms/_fields";
import { type FormStatus, formStatus } from "@forms/index";
import { RsvpEntry } from "../models";

/**
 * The admin close switch is one rsvp_entry row per RSVP with kind "control".
 * Every other query filters by kind, so it never counts as an invitee.
 */
const key = (slug: string) => ({
	rsvp: slug,
	kind: "control" as const,
	file_id: "-",
	member_id: null,
});

export interface AdminClose {
	closed: boolean;
	by: string | null;
	at: string | null;
}

export async function getAdminClose(slug: string): Promise<AdminClose> {
	const row = await RsvpEntry.findOne(key(slug)).lean();
	if (!row) return { closed: false, by: null, at: null };
	return {
		closed: (row.data as { closed?: boolean } | null)?.closed === true,
		by: row.invited_by,
		at: new Date(row.updatedAt).toISOString(),
	};
}

export async function setAdminClose(
	slug: string,
	closed: boolean,
	by: string,
): Promise<void> {
	await RsvpEntry.updateOne(
		key(slug),
		{
			$set: { data: { closed }, invited_by: by },
			$setOnInsert: { tanzeem_file_no: 0, is_removed: false },
		},
		{ upsert: true },
	);
}

/** The dates decide the status, and an admin close turns "open" into "closed". */
export async function rsvpStatus(
	form: FormDef,
	now: Date = new Date(),
): Promise<FormStatus> {
	const status = formStatus(form, now);
	if (status !== "open") return status;
	return (await getAdminClose(form.slug)).closed ? "closed" : "open";
}
