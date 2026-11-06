import { defineForm, type FormDef } from "@forms/_fields";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	clearDb,
	invite,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { RsvpEntry } from "../models";
import { signInHousehold } from "./households";

const now = new Date("2027-01-01");
const MSG = "File number and ITS don't match";

const formWith = (signIn: FormDef["signIn"]) =>
	defineForm({
		slug: "sample-rsvp",
		title: "Sample",
		opensAt: "2026-01-01T00:00:00+05:30",
		closesAt: "2030-12-31T23:59:59+05:30",
		signIn,
		memberFields: [{ name: "a", label: "A", type: "text" }],
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
	await invite("sample-rsvp", ["10000001", "10000002"]);
});

describe("signInHousehold", () => {
	it("either: any member of the file can sign in", async () => {
		const form = formWith({ its: "either", mustBeInvited: false });
		expect(
			await signInHousehold({ form, fileNo: 101, its: "10000003", now }),
		).toEqual({
			slug: "sample-rsvp",
			fileId: "10000001",
			fileNo: 101,
			signedInIts: "10000003",
		});
	});
	it("hof: only the HOF ITS", async () => {
		const form = formWith({ its: "hof", mustBeInvited: false });
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000002", now }),
		).rejects.toMatchObject({ status: 401 });
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000001", now }),
		).resolves.toBeTruthy();
	});
	it("member + mustBeInvited: the ITS must be invited", async () => {
		const form = formWith({ its: "member", mustBeInvited: true });
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000003", now }),
		).rejects.toMatchObject({ status: 401 });
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000002", now }),
		).resolves.toBeTruthy();
	});
	it("gives one message for every mismatch", async () => {
		const form = formWith({ its: "either", mustBeInvited: false });
		for (const [fileNo, its] of [
			[101, "20000001"],
			[202, "20000001"],
			[999, "10000001"],
		] as const) {
			await expect(
				signInHousehold({ form, fileNo, its, now }),
			).rejects.toMatchObject({
				status: 401,
				message: MSG,
			});
		}
	});
	it("refuses when the RSVP is closed", async () => {
		const form = formWith({ its: "either", mustBeInvited: false });
		await expect(
			signInHousehold({
				form,
				fileNo: 101,
				its: "10000001",
				now: new Date("2031-01-01"),
			}),
		).rejects.toMatchObject({ status: 403, message: "This RSVP is not open" });
	});
	it("refuses when every invitee is removed", async () => {
		await RsvpEntry.updateMany({ rsvp: "sample-rsvp" }, { is_removed: true });
		const form = formWith({ its: "either", mustBeInvited: false });
		await expect(
			signInHousehold({ form, fileNo: 101, its: "10000001", now }),
		).rejects.toMatchObject({ status: 401 });
	});
});
