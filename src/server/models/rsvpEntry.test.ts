import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
	clearDb,
	invite,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { File, RsvpEntry, User } from ".";

beforeAll(async () => {
	await startTestDb();
});
afterEach(clearDb);
afterAll(stopTestDb);

const base = {
	rsvp: "r1",
	kind: "member" as const,
	file_id: "10000001",
	tanzeem_file_no: 101,
};

describe("rsvp_entry indexes", () => {
	it("rejects a duplicate member entry", async () => {
		await RsvpEntry.create({ ...base, member_id: "10000002" });
		await expect(
			RsvpEntry.create({ ...base, member_id: "10000002" }),
		).rejects.toMatchObject({
			code: 11000,
		});
	});
	it("accepts the same member under two rsvps", async () => {
		await RsvpEntry.create({ ...base, member_id: "10000002" });
		await expect(
			RsvpEntry.create({ ...base, rsvp: "r2", member_id: "10000002" }),
		).resolves.toBeTruthy();
	});
	it("rejects two household entries for one file", async () => {
		const h = { ...base, kind: "household" as const, member_id: null };
		await RsvpEntry.create(h);
		await expect(RsvpEntry.create(h)).rejects.toMatchObject({ code: 11000 });
	});
});

describe("test helpers", () => {
	it("seedBasic inserts the fixtures", async () => {
		await seedBasic();
		const file = await File.findOne({ tanzeem_file_no: 101 }).lean();
		expect(file?.member_ids?.length).toBe(3);
		expect(file?.sub_sector?.sector.name).toBe("Sector One");
		const admin = await User.findOne({ itsId: 30000001 }).lean();
		expect(admin?.userRole).toContain("Admin");
	});
	it("invite creates a member entry from the member's file", async () => {
		await seedBasic();
		await invite("sample-rsvp", ["10000002"]);
		const e = await RsvpEntry.findOne({ rsvp: "sample-rsvp" }).lean();
		expect(e).toMatchObject({
			file_id: "10000001",
			tanzeem_file_no: 101,
			data: null,
			is_removed: false,
		});
	});
});
