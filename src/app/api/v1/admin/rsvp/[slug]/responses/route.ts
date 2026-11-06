import { toPublicFields } from "@forms/_fields";
import { requireAdmin } from "@/server/auth/session";
import { json, withRoute } from "@/server/http";
import { formOr404 } from "@/server/routeHelpers";
import { listResponses } from "@/server/services/responses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withRoute(
	async (req, ctx: { params: Promise<{ slug: string }> }) => {
		await requireAdmin(req);
		const { slug } = await ctx.params;
		const form = formOr404(slug);
		return json({
			fields: {
				household: toPublicFields(form.householdFields),
				member: toPublicFields(form.memberFields),
			},
			rows: await listResponses(form),
		});
	},
);
