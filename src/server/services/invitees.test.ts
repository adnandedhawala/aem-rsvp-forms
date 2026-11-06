import { getForm } from "@forms/index";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	clearDb,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { File, RsvpEntry } from "../models";
import { saveHousehold } from "./households";
import {
	addInvitees,
	listInvitees,
	removeInvitees,
	validateInviteeRows,
} from "./invitees";

const slug = "sample-rsvp";
const form = getForm(slug);
if (!form) throw new Error("sample-rsvp missing");
const row = (fileNo: string, its: string) => ({ fileNo, its });

beforeAll(async () => {
	await startTestDb();
});
afterAll(async () => {
	await stopTestDb();
});
beforeEach(async () => {
	await clearDb();
	await seedBasic();
});

const answer = (members: string[]) =>
	saveHousehold({
		form,
		fileId: "10000001",
		payload: {
			household: { mehmaan_count: 1 },
			members: Object.fromEntries(members.map((m) => [m, { attending: "No" }])),
		},
		by: "10000001",
		via: "household",
		now: new Date("2027-01-01"),
	});

describe("validateInviteeRows", () => {
	it("applies the row rules in order", async () => {
		const res = await validateInviteeRows(slug, [
			row("101", "10000002"),
			row("101", "20000001"),
			row("999", "10000001"),
			row("101", "1234"),
			row(" 101 ", "10000002 "),
			row("", ""),
			row("10a", "10000001"),
		]);
		expect(res.map((r) => r.error ?? "ok")).toEqual([
			"ok",
			"ITS is not in this file",
			"File not found",
			"ITS must be 8 digits",
			"Duplicate row",
			"File no must be a number",
		]);
		expect(res[0]).toMatchObject({
			ok: true,
			hofName: "Hof A",
			sector: "Sector One",
		});
		expect(res[0].full_name).toBeTruthy();
	});
	it("fills the file no from the ITS when it is left empty", async () => {
		const res = await validateInviteeRows(slug, [
			row("", "20000002"),
			row("", "99999999"),
			row("", "123"),
		]);
		expect(res[0]).toMatchObject({ ok: true, fileNo: "202" });
		expect(res.slice(1).map((r) => r.error)).toEqual([
			"ITS is not in any file",
			"ITS must be 8 digits",
		]);
	});
	it("refuses to guess when an ITS is in more than one file", async () => {
		await File.collection.insertOne({
			_id: "x1",
			tanzeem_file_no: 303,
			member_ids: [20000002],
		} as never);
		const [r] = await validateInviteeRows(slug, [row("", "20000002")]);
		expect(r).toMatchObject({
			ok: false,
			error: "ITS is in more than one file",
		});
	});
	it("adds ITS-only rows under the file found", async () => {
		await addInvitees(slug, [row("", "20000002")], "30000001");
		const e = await RsvpEntry.findOne({ member_id: "20000002" }).lean();
		expect(e).toMatchObject({ tanzeem_file_no: 202, file_id: "20000001" });
	});
	it("flags rows already invited", async () => {
		await addInvitees(slug, [row("101", "10000002")], "30000001");
		const [r] = await validateInviteeRows(slug, [row("101", "10000002")]);
		expect(r).toMatchObject({ ok: true, alreadyInvited: true });
	});
});

describe("addInvitees", () => {
	it("writes nothing when any row is bad", async () => {
		await expect(
			addInvitees(
				slug,
				[row("101", "10000002"), row("999", "10000001")],
				"30000001",
			),
		).rejects.toMatchObject({ status: 422 });
		expect(await RsvpEntry.countDocuments()).toBe(0);
	});
	it("merges: restores removed members with their answers", async () => {
		await addInvitees(
			slug,
			[row("101", "10000001"), row("101", "10000002")],
			"30000001",
		);
		await answer(["10000001", "10000002"]);
		await removeInvitees(slug, ["10000002"]);
		const res = await addInvitees(
			slug,
			[row("101", "10000001"), row("101", "10000002"), row("101", "10000003")],
			"30000001",
		);
		expect(res).toEqual({ added: 1, restored: 1, unchanged: 1 });
		const e = await RsvpEntry.findOne({ member_id: "10000002" }).lean();
		expect(e?.is_removed).toBe(false);
		expect(e?.data).toEqual({ attending: "No", needs_wheelchair: false });
	});
});

describe("concurrent adds", () => {
	it("do not fail or double-insert when two admins add the same rows", async () => {
		const rows = [row("101", "10000001"), row("101", "10000002")];
		const [a, b] = await Promise.all([
			addInvitees(slug, rows, "30000001"),
			addInvitees(slug, rows, "30000002"),
		]);
		expect(a.added + b.added).toBe(2);
		expect(await RsvpEntry.countDocuments({ kind: "member" })).toBe(2);
	});
});

describe("removeInvitees and listInvitees", () => {
	it("soft removes and reports answers", async () => {
		await addInvitees(
			slug,
			[row("101", "10000001"), row("101", "10000002")],
			"30000001",
		);
		await answer(["10000001", "10000002"]);
		expect(await removeInvitees(slug, ["10000001"])).toEqual({
			removed: 1,
			hadAnswers: 1,
		});
		const list = await listInvitees(slug);
		expect(list.map((r) => r.its)).toEqual(["10000002"]);
	});
	it("sorts by file no with the HOF first and marks answered", async () => {
		await addInvitees(
			slug,
			[
				row("202", "20000002"),
				row("101", "10000003"),
				row("101", "10000001"),
				row("202", "20000001"),
			],
			"30000001",
		);
		await RsvpEntry.updateOne(
			{ member_id: "10000003" },
			{ data: { attending: "No" } },
		);
		const list = await listInvitees(slug);
		expect(list.map((r) => r.its)).toEqual([
			"10000001",
			"10000003",
			"20000001",
			"20000002",
		]);
		expect(list.map((r) => r.answered)).toEqual([false, true, false, false]);
		expect(list[0]).toMatchObject({
			fileNo: 101,
			hofName: "Hof A",
			sector: "Sector One",
		});
	});
});
