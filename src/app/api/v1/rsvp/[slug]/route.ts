import { formStatus, getForm } from "@forms/index";
import { HttpError, json, withRoute } from "@/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withRoute(
	async (_req, ctx: { params: Promise<{ slug: string }> }) => {
		const { slug } = await ctx.params;
		const form = getForm(slug);
		if (!form) throw new HttpError(404, "RSVP not found");
		return json({
			slug: form.slug,
			title: form.title,
			description: form.description,
			opensAt: form.opensAt,
			closesAt: form.closesAt,
			status: formStatus(form),
			signInIts: form.signIn.its,
		});
	},
);
