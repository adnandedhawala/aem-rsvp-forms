import "server-only";
import { z } from "zod";
import { HttpError } from "../http";
import {
	File,
	filesWithMembers,
	Member,
	memberIdsOf,
	RsvpEntry,
} from "../models";

const MAX_ROWS = 5000;

/** Request body for validate/add: rows of file no + ITS (numbers are accepted and stringified). */
export const InviteeRowsSchema = z.object({
	rows: z.array(
		z.object({ fileNo: z.coerce.string(), its: z.coerce.string() }),
	),
});

export interface InviteeRowInput {
	fileNo: string;
	its: string;
}

export interface InviteeRowResult extends InviteeRowInput {
	ok: boolean;
	error?: string;
	full_name?: string;
	age?: number;
	gender?: string;
	hofName?: string;
	sector?: string;
	subsector?: string;
	alreadyInvited?: boolean;
}

export interface InviteeListRow {
	its: string;
	fileNo: number;
	full_name: string;
	hofName: string;
	sector: string | null;
	subsector: string | null;
	answered: boolean;
	createdAt: string;
}

function cleanRows(rows: InviteeRowInput[]): InviteeRowInput[] {
	if (rows.length > MAX_ROWS)
		throw new HttpError(400, `At most ${MAX_ROWS} rows at a time`);
	return rows
		.map((r) => ({
			fileNo: String(r.fileNo ?? "").trim(),
			its: String(r.its ?? "").trim(),
		}))
		.filter((r) => r.fileNo !== "" || r.its !== "");
}

/**
 * Rows with an ITS but no file no get the file no of the one file whose
 * member_ids holds that ITS. Rows matching no file or several files keep the
 * empty file no and are reported by validateInviteeRows.
 */
async function fillFileNos(
	rows: InviteeRowInput[],
): Promise<(InviteeRowInput & { lookup?: string })[]> {
	const need = [
		...new Set(
			rows
				.filter((r) => r.fileNo === "" && /^\d{8}$/.test(r.its))
				.map((r) => r.its),
		),
	];
	if (need.length === 0) return rows;
	const files = await filesWithMembers(need);
	const fileNosByIts = new Map<string, number[]>();
	for (const f of files) {
		if (f.tanzeem_file_no == null) continue;
		for (const id of memberIdsOf(f)) {
			fileNosByIts.set(id, [
				...(fileNosByIts.get(id) ?? []),
				f.tanzeem_file_no,
			]);
		}
	}
	return rows.map((r) => {
		if (r.fileNo !== "" || !/^\d{8}$/.test(r.its)) return r;
		const found = fileNosByIts.get(r.its) ?? [];
		if (found.length === 1) return { ...r, fileNo: String(found[0]) };
		return {
			...r,
			lookup:
				found.length === 0
					? "ITS is not in any file"
					: "ITS is in more than one file",
		};
	});
}

export async function validateInviteeRows(
	slug: string,
	rawRows: InviteeRowInput[],
): Promise<InviteeRowResult[]> {
	const rows = await fillFileNos(cleanRows(rawRows));
	const fileNos = [
		...new Set(
			rows.filter((r) => /^\d+$/.test(r.fileNo)).map((r) => Number(r.fileNo)),
		),
	];
	const itsList = [
		...new Set(rows.filter((r) => /^\d{8}$/.test(r.its)).map((r) => r.its)),
	];
	const [files, members, entries] = await Promise.all([
		File.find({ tanzeem_file_no: { $in: fileNos } }).lean(),
		Member.find({ _id: { $in: itsList } }).lean(),
		RsvpEntry.find({
			rsvp: slug,
			kind: "member",
			member_id: { $in: itsList },
			is_removed: false,
		})
			.select("member_id")
			.lean(),
	]);
	const fileByNo = new Map(files.map((f) => [f.tanzeem_file_no, f]));
	const memberById = new Map(members.map((m) => [m._id, m]));
	const invited = new Set(entries.map((e) => e.member_id));
	const seen = new Set<string>();

	return rows.map(({ lookup, ...r }): InviteeRowResult => {
		const fail = (error: string): InviteeRowResult => ({
			...r,
			ok: false,
			error,
		});
		if (lookup) return fail(lookup);
		if (r.fileNo === "" && !/^\d{8}$/.test(r.its))
			return fail("ITS must be 8 digits");
		if (!/^\d+$/.test(r.fileNo)) return fail("File no must be a number");
		if (!/^\d{8}$/.test(r.its)) return fail("ITS must be 8 digits");
		const file = fileByNo.get(Number(r.fileNo));
		if (!file) return fail("File not found");
		const member = memberById.get(r.its);
		if (!member) return fail("ITS not found");
		if (!memberIdsOf(file).includes(r.its))
			return fail("ITS is not in this file");
		if (seen.has(r.its)) return fail("Duplicate row");
		seen.add(r.its);
		return {
			...r,
			ok: true,
			full_name: member.full_name,
			age: member.age,
			gender: member.gender,
			hofName: file.hof_name,
			sector: file.sub_sector?.sector?.name,
			subsector: file.sub_sector?.name,
			alreadyInvited: invited.has(r.its),
		};
	});
}

export async function addInvitees(
	slug: string,
	rawRows: InviteeRowInput[],
	adminIts: string,
): Promise<{ added: number; restored: number; unchanged: number }> {
	const results = await validateInviteeRows(slug, rawRows);
	if (results.some((r) => !r.ok))
		throw new HttpError(422, "Some rows have errors", results);

	const itsList = results.map((r) => r.its);
	const files = await File.find({
		tanzeem_file_no: { $in: results.map((r) => Number(r.fileNo)) },
	}).lean();
	const fileByNo = new Map(files.map((f) => [f.tanzeem_file_no, f]));
	const existing = await RsvpEntry.find({
		rsvp: slug,
		kind: "member",
		member_id: { $in: itsList },
	})
		.select("member_id is_removed")
		.lean();
	const existingById = new Map(existing.map((e) => [e.member_id, e]));

	let added = 0;
	let restored = 0;
	let unchanged = 0;
	const toInsert = [];
	const toRestore: string[] = [];
	for (const r of results) {
		const e = existingById.get(r.its);
		if (!e) {
			const file = fileByNo.get(Number(r.fileNo));
			if (!file) continue;
			toInsert.push({
				rsvp: slug,
				kind: "member" as const,
				file_id: file._id,
				tanzeem_file_no: Number(r.fileNo),
				member_id: r.its,
				invited_by: adminIts,
			});
			added++;
		} else if (e.is_removed) {
			toRestore.push(r.its);
			restored++;
		} else {
			unchanged++;
		}
	}
	if (toRestore.length) {
		await RsvpEntry.updateMany(
			{ rsvp: slug, kind: "member", member_id: { $in: toRestore } },
			{ $set: { is_removed: false } },
		);
	}
	if (toInsert.length) {
		try {
			await RsvpEntry.insertMany(toInsert, { ordered: false });
		} catch (err) {
			// Another admin added some of these at the same moment: those are "unchanged"
			const writeErrors = (err as { writeErrors?: { code?: number }[] })
				.writeErrors;
			if (!writeErrors?.length || writeErrors.some((w) => w.code !== 11000))
				throw err;
			added -= writeErrors.length;
			unchanged += writeErrors.length;
		}
	}
	return { added, restored, unchanged };
}

export async function removeInvitees(
	slug: string,
	memberIds: string[],
): Promise<{ removed: number; hadAnswers: number }> {
	const filter = {
		rsvp: slug,
		kind: "member" as const,
		member_id: { $in: memberIds },
		is_removed: false,
	};
	const hadAnswers = await RsvpEntry.countDocuments({
		...filter,
		data: { $ne: null },
	});
	const res = await RsvpEntry.updateMany(filter, {
		$set: { is_removed: true },
	});
	return { removed: res.modifiedCount, hadAnswers };
}

export async function listInvitees(slug: string): Promise<InviteeListRow[]> {
	const entries = await RsvpEntry.find({
		rsvp: slug,
		kind: "member",
		is_removed: false,
	}).lean();
	const [files, members] = await Promise.all([
		File.find({
			_id: { $in: [...new Set(entries.map((e) => e.file_id))] },
		}).lean(),
		Member.find({ _id: { $in: entries.map((e) => e.member_id) } }).lean(),
	]);
	const fileById = new Map(files.map((f) => [f._id, f]));
	const memberById = new Map(members.map((m) => [m._id, m]));
	// A member is the HOF when their ITS is also the file id
	const hofIds = new Set(
		entries.filter((e) => e.file_id === e.member_id).map((e) => e.member_id),
	);

	return entries
		.map((e): InviteeListRow => {
			const file = fileById.get(e.file_id);
			const its = e.member_id as string;
			return {
				its,
				fileNo: e.tanzeem_file_no,
				full_name: memberById.get(its)?.full_name ?? its,
				hofName: file?.hof_name ?? "",
				sector: file?.sub_sector?.sector?.name ?? null,
				subsector: file?.sub_sector?.name ?? null,
				answered: e.data !== null && e.data !== undefined,
				createdAt: new Date(e.createdAt).toISOString(),
			};
		})
		.sort((a, b) => {
			if (a.fileNo !== b.fileNo) return a.fileNo - b.fileNo;
			const aHof = hofIds.has(a.its);
			const bHof = hofIds.has(b.its);
			if (aHof !== bHof) return aHof ? -1 : 1;
			return a.its.localeCompare(b.its);
		});
}
