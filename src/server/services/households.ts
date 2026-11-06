import "server-only";
import { type Answers, type FormDef, validateAnswers } from "@forms/_fields";
import type { FormStatus } from "@forms/index";
import mongoose from "mongoose";
import type { HouseholdClaims } from "../auth/tokens";
import { HttpError } from "../http";
import { File, Member, memberIdsOf, RsvpEntry } from "../models";
import { rsvpStatus } from "./control";

const MISMATCH = "File number and ITS don't match";

export async function signInHousehold(input: {
	form: FormDef;
	fileNo: number;
	its: string;
	now?: Date;
}): Promise<HouseholdClaims> {
	const { form, fileNo, its } = input;
	if ((await rsvpStatus(form, input.now)) !== "open")
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
	const isMember = memberIdsOf(file).includes(its);
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

export interface HouseholdMember {
	its: string;
	full_name: string;
	age?: number;
	gender?: string;
	mobile?: string;
	hof_fm_type?: string;
	data: Answers | null;
	submitted_at: string | null;
}

export interface HouseholdView {
	slug: string;
	fileId: string;
	fileNo: number;
	hofName: string;
	sector: string | null;
	subsector: string | null;
	household: { data: Answers | null; submitted_at: string | null } | null;
	members: HouseholdMember[];
	lastSavedAt: string | null;
	status: FormStatus;
}

export interface HouseholdPayload {
	household?: Answers;
	members: Record<string, Answers>;
}

const iso = (d: Date | null | undefined) =>
	d ? new Date(d).toISOString() : null;

export async function getHousehold(input: {
	form: FormDef;
	fileId: string;
}): Promise<HouseholdView> {
	const { form, fileId } = input;
	const file = await File.findById(fileId).lean();
	if (!file) throw new HttpError(404, "File not found");

	const entries = await RsvpEntry.find({
		rsvp: form.slug,
		file_id: fileId,
	}).lean();
	const invited = new Map(
		entries
			.filter((e) => e.kind === "member" && !e.is_removed)
			.map((e) => [e.member_id, e]),
	);
	const order = [
		file._id,
		...memberIdsOf(file).filter((id) => id !== file._id),
	].filter((id) => invited.has(id));
	const people = await Member.find({ _id: { $in: order } }).lean();
	const byId = new Map(people.map((p) => [p._id, p]));

	const members: HouseholdMember[] = order.map((its) => {
		const p = byId.get(its);
		const e = invited.get(its);
		return {
			its,
			full_name: p?.full_name ?? its,
			age: p?.age,
			gender: p?.gender,
			mobile: p?.mobile,
			hof_fm_type: p?.hof_fm_type,
			data: (e?.data as Answers | null) ?? null,
			submitted_at: iso(e?.submitted_at),
		};
	});

	const hh = entries.find((e) => e.kind === "household");
	const times = entries
		.map((e) => e.submitted_at)
		.filter((t): t is Date => !!t);
	const last = times.length
		? new Date(Math.max(...times.map((t) => new Date(t).getTime())))
		: null;

	return {
		slug: form.slug,
		fileId,
		fileNo: file.tanzeem_file_no ?? 0,
		hofName: file.hof_name ?? "",
		sector: file.sub_sector?.sector?.name ?? null,
		subsector: file.sub_sector?.name ?? null,
		household: form.householdFields.length
			? {
					data: (hh?.data as Answers | null) ?? null,
					submitted_at: iso(hh?.submitted_at),
				}
			: null,
		members,
		lastSavedAt: iso(last),
		status: await rsvpStatus(form),
	};
}

export async function getHouseholdByFileNo(input: {
	form: FormDef;
	fileNo: number;
}): Promise<HouseholdView> {
	const file = await File.findOne({ tanzeem_file_no: input.fileNo }).lean();
	if (!file) throw new HttpError(404, "File not found");
	const view = await getHousehold({ form: input.form, fileId: file._id });
	if (view.members.length === 0)
		throw new HttpError(404, "No one from this file is invited");
	return view;
}

export async function saveHousehold(input: {
	form: FormDef;
	fileId: string;
	payload: HouseholdPayload;
	by: string;
	via: "household" | "admin";
	now?: Date;
}): Promise<HouseholdView> {
	const { form, fileId, payload, by, via } = input;
	const now = input.now ?? new Date();
	if (via === "household" && (await rsvpStatus(form, now)) !== "open") {
		throw new HttpError(403, "This RSVP is closed");
	}

	const invitedEntries = await RsvpEntry.find({
		rsvp: form.slug,
		kind: "member",
		file_id: fileId,
		is_removed: false,
	})
		.select("member_id tanzeem_file_no")
		.lean();
	const invitedIds = invitedEntries.map((e) => e.member_id as string);
	const fileNo = invitedEntries[0]?.tanzeem_file_no;
	if (invitedIds.length === 0 || fileNo === undefined) {
		throw new HttpError(404, "No one from this file is invited");
	}

	const submitted = Object.keys(payload.members);
	const extra = submitted.filter((id) => !invitedIds.includes(id));
	if (extra.length) {
		throw new HttpError(422, "Unknown member in submission", {
			members: Object.fromEntries(
				extra.map((id) => [id, { _form: "Not invited" }]),
			),
		});
	}
	const missing = invitedIds.filter((id) => !submitted.includes(id));
	if (missing.length) {
		throw new HttpError(422, "Answers missing", {
			members: Object.fromEntries(
				missing.map((id) => [id, { _form: "Answers missing" }]),
			),
		});
	}

	const memberData: Record<string, Answers> = {};
	const memberErrors: Record<string, Record<string, string>> = {};
	for (const id of invitedIds) {
		const r = validateAnswers(form.memberFields, payload.members[id]);
		if (r.ok) memberData[id] = r.data;
		else memberErrors[id] = r.errors;
	}
	let householdData: Answers | null = null;
	let householdErrors: Record<string, string> | undefined;
	if (form.householdFields.length) {
		const r = validateAnswers(form.householdFields, payload.household ?? {});
		if (r.ok) householdData = r.data;
		else householdErrors = r.errors;
	}
	if (Object.keys(memberErrors).length || householdErrors) {
		throw new HttpError(422, "Please fix the highlighted fields", {
			...(householdErrors ? { household: householdErrors } : {}),
			members: memberErrors,
		});
	}

	const stamp = { submitted_by_its: by, submitted_via: via, submitted_at: now };
	const session = await mongoose.startSession();
	try {
		await session.withTransaction(async () => {
			for (const id of invitedIds) {
				await RsvpEntry.updateOne(
					{ rsvp: form.slug, kind: "member", file_id: fileId, member_id: id },
					{ $set: { data: memberData[id], ...stamp } },
					{ session },
				);
			}
			if (form.householdFields.length) {
				await RsvpEntry.updateOne(
					{
						rsvp: form.slug,
						kind: "household",
						file_id: fileId,
						member_id: null,
					},
					{
						$set: { data: householdData, ...stamp },
						$setOnInsert: {
							tanzeem_file_no: fileNo,
							invited_by: null,
							is_removed: false,
						},
					},
					{ upsert: true, session },
				);
			}
		});
	} finally {
		await session.endSession();
	}

	return getHousehold({ form, fileId });
}
