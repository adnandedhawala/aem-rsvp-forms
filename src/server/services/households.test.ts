import { getForm } from "@forms/index";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	clearDb,
	invite,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { RsvpEntry } from "../models";
import {
	getHousehold,
	getHouseholdByFileNo,
	saveHousehold,
} from "./households";

const form = getForm("sample-rsvp");
if (!form) throw new Error("sample-rsvp missing");
const now = new Date("2027-01-01");
const fileId = "10000001";
const good = {
	household: { mehmaan_count: 2 },
	members: {
		"10000001": { attending: "Yes", days: "All" },
		"10000002": { attending: "No" },
	},
};
const save = (over: Record<string, unknown> = {}) =>
	saveHousehold({
		form,
		fileId,
		payload: good,
		by: "10000001",
		via: "household",
		now,
		...over,
	});

beforeAll(async () => {
	await startTestDb();
});
afterAll(async () => {
	await stopTestDb();
});
beforeEach(async () => {
	await clearDb();
	await seedBasic();
	await invite("sample-rsvp", ["10000001", "10000002", "10000003"]);
	await RsvpEntry.updateOne({ member_id: "10000003" }, { is_removed: true });
});

const datas = async () =>
	(await RsvpEntry.find({ kind: "member" }).lean()).map((e) => [
		e.member_id,
		e.data,
	]);

describe("getHousehold", () => {
	it("returns invited members, HOF first", async () => {
		const v = await getHousehold({ form, fileId });
		expect(v.members.map((m) => m.its)).toEqual(["10000001", "10000002"]);
		expect(v.members[0].data).toBeNull();
		expect(v.household).toEqual({ data: null, submitted_at: null });
		expect(v.hofName).toBe("Hof A");
		expect(v.sector).toBe("Sector One");
	});
});

describe("saveHousehold", () => {
	it("saves members and household", async () => {
		await save();
		const v = await getHousehold({ form, fileId });
		expect(v.members[1].data).toEqual({
			attending: "No",
			needs_wheelchair: false,
		});
		expect(v.household?.data).toEqual({ mehmaan_count: 2 });
		const e = await RsvpEntry.findOne({ member_id: "10000002" }).lean();
		expect(e?.submitted_via).toBe("household");
		expect(await RsvpEntry.countDocuments({ kind: "household" })).toBe(1);
	});
	it("refuses removed, other-file and missing members, saving nothing", async () => {
		const members = good.members;
		await expect(
			save({
				payload: { members: { ...members, "10000003": { attending: "No" } } },
			}),
		).rejects.toMatchObject({
			status: 422,
			message: "Unknown member in submission",
		});
		await expect(
			save({
				payload: { members: { ...members, "20000001": { attending: "No" } } },
			}),
		).rejects.toMatchObject({ status: 422 });
		await expect(
			save({ payload: { members: { "10000001": members["10000001"] } } }),
		).rejects.toMatchObject({ status: 422, message: "Answers missing" });
		expect((await datas()).every(([, d]) => d === null)).toBe(true);
	});
	it("is all-or-nothing when one member is invalid", async () => {
		const err = await save({
			payload: {
				members: {
					"10000001": good.members["10000001"],
					"10000002": { attending: "Yes" },
				},
			},
		}).catch((e) => e);
		expect(err.status).toBe(422);
		expect(err.details.members["10000002"].days).toBeDefined();
		expect((await datas()).every(([, d]) => d === null)).toBe(true);
	});
	it("drops forged keys", async () => {
		await save({
			payload: {
				...good,
				members: {
					...good.members,
					"10000002": { attending: "No", is_admin: true },
				},
			},
		});
		const e = await RsvpEntry.findOne({ member_id: "10000002" }).lean();
		expect(e?.data).not.toHaveProperty("is_admin");
	});
	it("household saves are refused after close, admin saves are not", async () => {
		const late = new Date("2031-01-01");
		await expect(save({ now: late })).rejects.toMatchObject({ status: 403 });
		await save({ now: late, via: "admin", by: "30000001" });
		const e = await RsvpEntry.findOne({ member_id: "10000002" }).lean();
		expect(e).toMatchObject({
			submitted_via: "admin",
			submitted_by_its: "30000001",
		});
	});
	it("overwrites on a second save", async () => {
		await save();
		const later = new Date("2027-01-02");
		const v = await save({
			now: later,
			payload: {
				household: { mehmaan_count: 5 },
				members: {
					"10000001": { attending: "No" },
					"10000002": { attending: "No" },
				},
			},
		});
		expect(v.household?.data).toEqual({ mehmaan_count: 5 });
		expect(await RsvpEntry.countDocuments({ kind: "household" })).toBe(1);
		expect(v.lastSavedAt).toBe(later.toISOString());
	});
});

describe("getHouseholdByFileNo", () => {
	it("404s for no invitees or an unknown file", async () => {
		await expect(
			getHouseholdByFileNo({ form, fileNo: 202 }),
		).rejects.toMatchObject({ status: 404 });
		await expect(
			getHouseholdByFileNo({ form, fileNo: 999 }),
		).rejects.toMatchObject({ status: 404 });
		await expect(
			getHouseholdByFileNo({ form, fileNo: 101 }),
		).resolves.toMatchObject({ fileId });
	});
});
