import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	clearDb,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { loginAdmin } from "./adminLogin";
import { requireAdmin, requireHousehold } from "./session";
import {
	signAdminToken,
	signHouseholdToken,
	verifyAdminToken,
	verifyHouseholdToken,
} from "./tokens";

beforeAll(async () => {
	vi.stubEnv("JWT_SECRET", "s".repeat(40));
	vi.stubEnv("MONGODB_URI", "mongodb://localhost/x");
	vi.stubEnv("MONGODB_DBNAME", "aem-dev");
	await startTestDb();
});
beforeEach(async () => {
	await clearDb();
	await seedBasic();
});
afterAll(async () => {
	await stopTestDb();
	vi.unstubAllEnvs();
});

const hh = {
	slug: "rsvp-a",
	fileId: "10000001",
	fileNo: 101,
	signedInIts: "10000001",
};
const reqWith = (cookie?: string) =>
	new Request("http://x/", { headers: cookie ? { cookie } : {} });

describe("loginAdmin", () => {
	it("accepts an ITS or a case-insensitive email", async () => {
		const expected = { itsId: 30000001, name: "Admin One" };
		expect(
			await loginAdmin({ identifier: "30000001", password: "secret" }),
		).toEqual(expected);
		expect(
			await loginAdmin({ identifier: "ADMIN@test.local", password: "secret" }),
		).toEqual(expected);
	});
	it("rejects bad passwords, unknown users and non-admins", async () => {
		await expect(
			loginAdmin({ identifier: "30000001", password: "no" }),
		).rejects.toMatchObject({
			status: 401,
		});
		await expect(
			loginAdmin({ identifier: "39999999", password: "secret" }),
		).rejects.toMatchObject({ status: 401 });
		await expect(
			loginAdmin({ identifier: "30000002", password: "secret" }),
		).rejects.toMatchObject({ status: 403 });
	});
});

describe("tokens", () => {
	it("round-trips admin claims and keeps audiences apart", async () => {
		const c = { itsId: 30000001, name: "Admin One" };
		expect(await verifyAdminToken(await signAdminToken(c))).toEqual(c);
		expect(await verifyAdminToken(await signHouseholdToken(hh))).toBeNull();
		expect(await verifyHouseholdToken(await signAdminToken(c))).toBeNull();
		expect(await verifyAdminToken("garbage")).toBeNull();
		expect(await verifyAdminToken(undefined)).toBeNull();
	});
});

describe("sessions", () => {
	it("requireHousehold checks the slug", async () => {
		const req = reqWith(`rsvp_household=${await signHouseholdToken(hh)}`);
		await expect(requireHousehold(req, "rsvp-b")).rejects.toMatchObject({
			status: 401,
		});
		await expect(requireHousehold(req, "rsvp-a")).resolves.toEqual(hh);
	});
	it("requireAdmin needs a cookie", async () => {
		await expect(requireAdmin(reqWith())).rejects.toMatchObject({
			status: 401,
		});
		const c = { itsId: 1, name: "A" };
		const req = reqWith(`other=1; rsvp_admin=${await signAdminToken(c)}`);
		await expect(requireAdmin(req)).resolves.toEqual(c);
	});
});
