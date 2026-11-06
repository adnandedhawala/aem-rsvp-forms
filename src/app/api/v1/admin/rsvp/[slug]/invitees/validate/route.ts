import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { HttpError, json, withRoute } from "@/server/http";
import { formOr404 } from "@/server/services/householdRoutes";
import { validateInviteeRows } from "@/server/services/invitees";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Rows = z.object({
	rows: z.array(
		z.object({ fileNo: z.coerce.string(), its: z.coerce.string() }),
	),
});

export const POST = withRoute(
	async (req, ctx: { params: Promise<{ slug: string }> }) => {
		await requireAdmin(req);
		const { slug } = await ctx.params;
		formOr404(slug);
		const parsed = Rows.safeParse(await req.json().catch(() => null));
		if (!parsed.success) throw new HttpError(400, "Invalid rows");
		return json({ rows: await validateInviteeRows(slug, parsed.data.rows) });
	},
);
