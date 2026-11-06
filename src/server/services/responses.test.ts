import { getForm } from "@forms/index";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	clearDb,
	invite,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { saveHousehold } from "./households";
import { removeInvitees } from "./invitees";
import { getFormStats, listResponses } from "./responses";

const form = getForm("sample-rsvp");
if (!form) throw new Error("sample-rsvp missing");

beforeAll(async () => {
	await startTestDb();
});
afterAll(async () => {
	await stopTestDb();
});
beforeEach(async () => {
	await clearDb();
	await seedBasic();
	await invite("sample-rsvp", ["10000001", "10000002", "20000001"]);
	await saveHousehold({
		form,
		fileId: "10000001",
		payload: {
			household: { mehmaan_count: 2 },
			members: {
				"10000001": { attending: "Yes", days: "All" },
				"10000002": { attending: "No" },
			},
		},
		by: "10000001",
		via: "household",
		now: new Date("2027-01-01"),
	});
});

describe("listResponses", () => {
	it("joins members, files and answers", async () => {
		const rows = await listResponses(form);
		expect(rows.map((r) => r.its)).toEqual([
			"10000001",
			"10000002",
			"20000001",
		]);
		expect(rows[0]).toMatchObject({
			status: "Answered",
			submitted_via: "household",
		});
		expect(rows[0].answers.days).toBe("All");
		expect(rows[0].household.mehmaan_count).toBe(2);
		expect(rows[1].household.mehmaan_count).toBe(2);
		expect(rows[2]).toMatchObject({
			status: "Pending",
			answers: {},
			household: {},
		});
	});
	it("hides removed invitees", async () => {
		await removeInvitees("sample-rsvp", ["20000001"]);
		expect(await listResponses(form)).toHaveLength(2);
	});
});

describe("getFormStats", () => {
	it("counts invited and answered", async () => {
		expect(await getFormStats(form)).toMatchObject({
			invitedMembers: 3,
			invitedFiles: 2,
			answeredMembers: 2,
			answeredFiles: 1,
			status: "open",
		});
	});
});
