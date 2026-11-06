import { getForm } from "@forms/index";
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
	invite,
	seedBasic,
	startTestDb,
	stopTestDb,
} from "../../../tests/helpers/db";
import { loginAdmin } from "../auth/adminLogin";
import { requireAdmin, requireStaff } from "../auth/session";
import { signAdminToken, verifyAdminToken } from "../auth/tokens";
import { getFormStats } from "./responses";
import { addViewer, isViewer, listViewers, removeViewer } from "./viewers";

const form = getForm("sample-rsvp");
if (!form) throw new Error("sample-rsvp missing");
const reqWith = (token: string) =>
	new Request("http://x/", { headers: { cookie: `rsvp_admin=${token}` } });
const viewer = { itsId: 30000003, name: "Viewer One", role: "viewer" as const };

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

describe("viewers", () => {
	it("adds, lists, removes and restores a viewer", async () => {
		await addViewer("30000003", "30000001");
		const list = await listViewers();
		expect(list).toHaveLength(1);
		expect(list[0]).toMatchObject({
			its: "30000003",
			name: "Viewer One",
			addedBy: "30000001",
		});
		expect(typeof list[0].addedAt).toBe("string");
		expect(await isViewer("30000003")).toBe(true);

		await removeViewer("30000003");
		expect(await isViewer("30000003")).toBe(false);
		expect(await listViewers()).toEqual([]);

		await addViewer("30000003", "30000001");
		expect(await listViewers()).toHaveLength(1);
	});

	it("refuses an ITS with no AEM user", async () => {
		await expect(addViewer("99999999", "30000001")).rejects.toMatchObject({
			status: 404,
			message: "No AEM user with this ITS",
		});
	});

	it("signs viewers in with the viewer role", async () => {
		await expect(
			loginAdmin({ identifier: "30000003", password: "secret" }),
		).rejects.toMatchObject({ status: 403, message: "Not an admin" });
		await addViewer("30000003", "30000001");
		expect(
			await loginAdmin({ identifier: "viewer@test.local", password: "secret" }),
		).toEqual(viewer);
		await addViewer("30000001", "30000001");
		expect(
			(await loginAdmin({ identifier: "30000001", password: "secret" })).role,
		).toBe("admin");
	});

	it("lets viewers read but not write, until removed", async () => {
		await addViewer("30000003", "30000001");
		const req = reqWith(await signAdminToken(viewer));
		await expect(requireStaff(req)).resolves.toEqual(viewer);
		await expect(requireAdmin(req)).rejects.toMatchObject({
			status: 403,
			message: "View-only access",
		});
		await removeViewer("30000003");
		await expect(requireStaff(req)).rejects.toMatchObject({ status: 401 });
	});

	it("reads a token without a role as admin", async () => {
		const old = await signAdminToken({ itsId: 1, name: "A" } as never);
		expect(await verifyAdminToken(old)).toEqual({
			itsId: 1,
			name: "A",
			role: "admin",
		});
	});

	it("doesn't count viewers as invitees", async () => {
		await invite("sample-rsvp", ["10000001"]);
		await addViewer("30000003", "30000001");
		const s = await getFormStats(form);
		expect(s.invitedMembers).toBe(1);
		expect(s.invitedFiles).toBe(1);
	});
});
