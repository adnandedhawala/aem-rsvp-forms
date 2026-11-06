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
import { getAdminClose, rsvpStatus, setAdminClose } from "./control";
import { getHousehold, saveHousehold, signInHousehold } from "./households";
import { getFormStats } from "./responses";

const form = getForm("sample-rsvp");
if (!form) throw new Error("sample-rsvp missing");
const now = new Date("2027-01-01");
const payload = {
	household: { mehmaan_count: 1 },
	members: {
		"10000001": { attending: "No" },
		"10000002": { attending: "No" },
	},
};

beforeAll(async () => {
	await startTestDb();
});
afterAll(async () => {
	await stopTestDb();
});
beforeEach(async () => {
	await clearDb();
	await seedBasic();
	await invite("sample-rsvp", ["10000001", "10000002"]);
});

describe("admin close switch", () => {
	it("is not closed when there is no control row", async () => {
		expect(await getAdminClose("sample-rsvp")).toEqual({
			closed: false,
			by: null,
			at: null,
		});
	});

	it("stores one control row with who closed it", async () => {
		await setAdminClose("sample-rsvp", true, "30000001");
		await setAdminClose("sample-rsvp", true, "30000001");
		const c = await getAdminClose("sample-rsvp");
		expect(c).toMatchObject({ closed: true, by: "30000001" });
		expect(typeof c.at).toBe("string");
		expect(
			await RsvpEntry.countDocuments({ rsvp: "sample-rsvp", kind: "control" }),
		).toBe(1);
	});

	it("combines the switch with the dates", async () => {
		expect(await rsvpStatus(form, now)).toBe("open");
		await setAdminClose("sample-rsvp", true, "30000001");
		expect(await rsvpStatus(form, now)).toBe("closed");
		expect(await rsvpStatus(form, new Date("2025-06-01"))).toBe("upcoming");
		await setAdminClose("sample-rsvp", false, "30000001");
		expect(await rsvpStatus(form, now)).toBe("open");
		expect(await rsvpStatus(form, new Date("2031-01-01"))).toBe("closed");
	});

	it("refuses household sign-in and submit, but lets admins save", async () => {
		await setAdminClose("sample-rsvp", true, "30000001");
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000001", now }),
		).rejects.toMatchObject({ status: 403 });
		await expect(
			saveHousehold({
				form,
				fileId: "10000001",
				payload,
				by: "10000001",
				via: "household",
				now,
			}),
		).rejects.toMatchObject({ status: 403, message: "This RSVP is closed" });
		const saved = await saveHousehold({
			form,
			fileId: "10000001",
			payload,
			by: "30000001",
			via: "admin",
			now,
		});
		expect(saved.members[0].data).toEqual({
			attending: "No",
			needs_wheelchair: false,
		});
	});

	it("reports the status on the household view", async () => {
		expect((await getHousehold({ form, fileId: "10000001" })).status).toBe(
			"open",
		);
		await setAdminClose("sample-rsvp", true, "30000001");
		expect((await getHousehold({ form, fileId: "10000001" })).status).toBe(
			"closed",
		);
	});

	it("shows in the stats without counting as an invitee", async () => {
		await setAdminClose("sample-rsvp", true, "30000001");
		const s = await getFormStats(form);
		expect(s.status).toBe("closed");
		expect(s.adminClosed?.by).toBe("30000001");
		expect(s.invitedMembers).toBe(2);
		expect(s.invitedFiles).toBe(1);
	});
});
