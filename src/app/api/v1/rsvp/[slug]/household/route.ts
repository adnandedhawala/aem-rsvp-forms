import { requireHousehold } from "@/server/auth/session";
import { json, withRoute } from "@/server/http";
import { formOr404, readPayload } from "@/server/services/householdRoutes";
import { getHousehold, saveHousehold } from "@/server/services/households";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withRoute(async (req, ctx: Ctx) => {
	const { slug } = await ctx.params;
	const form = formOr404(slug);
	const claims = await requireHousehold(req, slug);
	return json(await getHousehold({ form, fileId: claims.fileId }));
});

export const PUT = withRoute(async (req, ctx: Ctx) => {
	const { slug } = await ctx.params;
	const form = formOr404(slug);
	const claims = await requireHousehold(req, slug);
	const payload = await readPayload(req);
	return json(
		await saveHousehold({
			form,
			fileId: claims.fileId,
			payload,
			by: claims.signedInIts,
			via: "household",
		}),
	);
});
