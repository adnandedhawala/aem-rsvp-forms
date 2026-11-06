import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { HttpError, json, withRoute } from "@/server/http";
import { formOr404 } from "@/server/routeHelpers";
import {
	getAdminClose,
	rsvpStatus,
	setAdminClose,
} from "@/server/services/control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Body = z.object({ closed: z.boolean() });

export const POST = withRoute(
	async (req, ctx: { params: Promise<{ slug: string }> }) => {
		const admin = await requireAdmin(req);
		const { slug } = await ctx.params;
		const form = formOr404(slug);
		const parsed = Body.safeParse(await req.json().catch(() => null));
		if (!parsed.success) throw new HttpError(400, "Invalid body");
		await setAdminClose(slug, parsed.data.closed, String(admin.itsId));
		const close = await getAdminClose(slug);
		return json({
			status: await rsvpStatus(form),
			adminClosed: close.closed ? { by: close.by, at: close.at } : null,
		});
	},
);
