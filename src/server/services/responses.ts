import "server-only";
import type { Answers, FormDef } from "@forms/_fields";
import { type FormStatus, formStatus } from "@forms/index";
import { File, Member, RsvpEntry } from "../models";
import { getAdminClose } from "./control";

export interface ResponseRow {
	fileNo: number;
	mobile: string | null;
	sector: string | null;
	subsector: string | null;
	its: string;
	full_name: string;
	age?: number;
	gender?: string;
	status: "Pending" | "Answered";
	answers: Answers;
	household: Answers;
	submitted_at: string | null;
	updated_at: string | null;
	submitted_by_its: string | null;
	submitted_via: "household" | "admin" | null;
}

export interface FormStats {
	slug: string;
	title: string;
	status: FormStatus;
	opensAt: string;
	closesAt: string;
	invitedMembers: number;
	invitedFiles: number;
	answeredMembers: number;
	answeredFiles: number;
	/** Set while an admin has closed this RSVP. */
	adminClosed: { by: string | null; at: string | null } | null;
}

const iso = (d: Date | null | undefined) =>
	d ? new Date(d).toISOString() : null;
const hasData = (d: unknown) => d !== null && d !== undefined;

export async function listResponses(form: FormDef): Promise<ResponseRow[]> {
	const entries = await RsvpEntry.find({
		rsvp: form.slug,
		is_removed: false,
	}).lean();
	const memberEntries = entries.filter((e) => e.kind === "member");
	const householdByFile = new Map(
		entries.filter((e) => e.kind === "household").map((e) => [e.file_id, e]),
	);
	const [files, members] = await Promise.all([
		File.find({
			_id: { $in: [...new Set(memberEntries.map((e) => e.file_id))] },
		}).lean(),
		Member.find({ _id: { $in: memberEntries.map((e) => e.member_id) } }).lean(),
	]);
	const fileById = new Map(files.map((f) => [f._id, f]));
	const memberById = new Map(members.map((m) => [m._id, m]));

	return memberEntries
		.map((e) => {
			const its = e.member_id as string;
			const file = fileById.get(e.file_id);
			const member = memberById.get(its);
			const answered = hasData(e.data);
			const row: ResponseRow = {
				fileNo: e.tanzeem_file_no,
				sector: file?.sub_sector?.sector?.name ?? null,
				subsector: file?.sub_sector?.name ?? null,
				its,
				full_name: member?.full_name ?? its,
				mobile: member?.mobile?.trim() || null,
				age: member?.age,
				gender: member?.gender,
				status: answered ? "Answered" : "Pending",
				answers: (e.data as Answers | null) ?? {},
				household:
					(householdByFile.get(e.file_id)?.data as Answers | null) ?? {},
				submitted_at: iso(e.submitted_at),
				updated_at: answered ? iso(e.updatedAt) : null,
				submitted_by_its: e.submitted_by_its,
				submitted_via: e.submitted_via,
			};
			return { row, isHof: e.file_id === its };
		})
		.sort((a, b) =>
			a.row.fileNo !== b.row.fileNo
				? a.row.fileNo - b.row.fileNo
				: a.isHof !== b.isHof
					? a.isHof
						? -1
						: 1
					: a.row.its.localeCompare(b.row.its),
		)
		.map((x) => x.row);
}

export async function getFormStats(form: FormDef): Promise<FormStats> {
	const entries = await RsvpEntry.find({
		rsvp: form.slug,
		kind: "member",
		is_removed: false,
	})
		.select("file_id data")
		.lean();
	const close = await getAdminClose(form.slug);
	const byDate = formStatus(form);
	const answered = entries.filter((e) => hasData(e.data));
	return {
		slug: form.slug,
		title: form.title,
		status: byDate === "open" && close.closed ? "closed" : byDate,
		opensAt: form.opensAt,
		closesAt: form.closesAt,
		invitedMembers: entries.length,
		invitedFiles: new Set(entries.map((e) => e.file_id)).size,
		answeredMembers: answered.length,
		answeredFiles: new Set(answered.map((e) => e.file_id)).size,
		adminClosed: close.closed ? { by: close.by, at: close.at } : null,
	};
}
