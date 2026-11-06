import "server-only";
import type { FormDef } from "@forms/_fields";
import { formStatus } from "@forms/index";
import type { HouseholdClaims } from "../auth/tokens";
import { HttpError } from "../http";
import { File, RsvpEntry } from "../models";

const MISMATCH = "File number and ITS don't match";

export async function signInHousehold(input: {
	form: FormDef;
	fileNo: number;
	its: string;
	now?: Date;
}): Promise<HouseholdClaims> {
	const { form, fileNo, its } = input;
	if (formStatus(form, input.now) !== "open")
		throw new HttpError(403, "This RSVP is not open");

	const file = await File.findOne({ tanzeem_file_no: fileNo }).lean();
	if (!file) throw new HttpError(401, MISMATCH);

	const invited = await RsvpEntry.find({
		rsvp: form.slug,
		kind: "member",
		file_id: file._id,
		is_removed: false,
	})
		.select("member_id")
		.lean();
	if (invited.length === 0) throw new HttpError(401, MISMATCH);

	const isHof = its === file._id;
	const isMember = (file.member_ids ?? []).includes(its);
	const allowed =
		form.signIn.its === "hof"
			? isHof
			: form.signIn.its === "member"
				? isMember
				: isHof || isMember;
	if (!allowed) throw new HttpError(401, MISMATCH);

	if (form.signIn.mustBeInvited && !invited.some((e) => e.member_id === its)) {
		throw new HttpError(401, MISMATCH);
	}

	return { slug: form.slug, fileId: file._id, fileNo, signedInIts: its };
}
