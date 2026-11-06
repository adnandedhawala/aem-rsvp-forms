import { requireAdmin, requireStaff } from "@/server/auth/session";
import { HttpError, json, withRoute } from "@/server/http";
import { formOr404, readPayload } from "@/server/routeHelpers";
import {
	getHouseholdByFileNo,
	saveHousehold,
} from "@/server/services/households";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ slug: string; fileNo: string }> };

function parseFileNo(raw: string): number {
	const n = Number(raw);
	if (!Number.isInteger(n)) throw new HttpError(400, "Invalid file number");
	return n;
}

export const GET = withRoute(async (req, ctx: Ctx) => {
	await requireStaff(req);
	const { slug, fileNo } = await ctx.params;
	const form = formOr404(slug);
	return json(
		await getHouseholdByFileNo({ form, fileNo: parseFileNo(fileNo) }),
	);
});

export const PUT = withRoute(async (req, ctx: Ctx) => {
	const admin = await requireAdmin(req);
	const { slug, fileNo } = await ctx.params;
	const form = formOr404(slug);
	const view = await getHouseholdByFileNo({
		form,
		fileNo: parseFileNo(fileNo),
	});
	const payload = await readPayload(req);
	return json(
		await saveHousehold({
			form,
			fileId: view.fileId,
			payload,
			by: String(admin.itsId),
			via: "admin",
		}),
	);
});
