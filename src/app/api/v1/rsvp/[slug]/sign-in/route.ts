import { getForm } from "@forms/index";
import { z } from "zod";
import {
	cookieOptions,
	HOUSEHOLD_COOKIE,
	HOUSEHOLD_MAX_AGE,
	setCookieHeader,
	signHouseholdToken,
} from "@/server/auth/tokens";
import { HttpError, json, withRoute } from "@/server/http";
import { createRateLimiter } from "@/server/rateLimit";
import { signInHousehold } from "@/server/services/households";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const limiter = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });

const Body = z.object({
	fileNo: z.coerce.number().int(),
	its: z.string().trim().min(1),
});

export const POST = withRoute(
	async (req, ctx: { params: Promise<{ slug: string }> }) => {
		const { slug } = await ctx.params;
		const form = getForm(slug);
		if (!form) throw new HttpError(404, "RSVP not found");

		const parsed = Body.safeParse(await req.json().catch(() => null));
		if (!parsed.success)
			throw new HttpError(400, "File number and ITS are required");
		const { fileNo, its } = parsed.data;

		const ip =
			req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
		if (!limiter.hit(`${ip}:${fileNo}`)) {
			throw new HttpError(429, "Too many attempts, please wait 15 minutes");
		}

		const claims = await signInHousehold({ form, fileNo, its });
		const token = await signHouseholdToken(claims);
		return json(
			{ ok: true },
			{
				headers: {
					"Set-Cookie": setCookieHeader(
						HOUSEHOLD_COOKIE,
						token,
						cookieOptions(HOUSEHOLD_MAX_AGE),
					),
				},
			},
		);
	},
);
