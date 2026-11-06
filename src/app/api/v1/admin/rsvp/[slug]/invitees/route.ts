import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { HttpError, json, withRoute } from "@/server/http";
import { formOr404 } from "@/server/services/householdRoutes";
import {
	addInvitees,
	listInvitees,
	removeInvitees,
} from "@/server/services/invitees";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ slug: string }> };

const Rows = z.object({
	rows: z.array(
		z.object({ fileNo: z.coerce.string(), its: z.coerce.string() }),
	),
});
const Ids = z.object({ memberIds: z.array(z.string()) });

export const GET = withRoute(async (req, ctx: Ctx) => {
	await requireAdmin(req);
	const { slug } = await ctx.params;
	formOr404(slug);
	return json({ rows: await listInvitees(slug) });
});

export const POST = withRoute(async (req, ctx: Ctx) => {
	const admin = await requireAdmin(req);
	const { slug } = await ctx.params;
	formOr404(slug);
	const parsed = Rows.safeParse(await req.json().catch(() => null));
	if (!parsed.success) throw new HttpError(400, "Invalid rows");
	return json(await addInvitees(slug, parsed.data.rows, String(admin.itsId)));
});

export const DELETE = withRoute(async (req, ctx: Ctx) => {
	await requireAdmin(req);
	const { slug } = await ctx.params;
	formOr404(slug);
	const parsed = Ids.safeParse(await req.json().catch(() => null));
	if (!parsed.success) throw new HttpError(400, "Invalid member ids");
	return json(await removeInvitees(slug, parsed.data.memberIds));
});
