import { listForms } from "@forms/index";
import { requireStaff } from "@/server/auth/session";
import { json, withRoute } from "@/server/http";
import { getFormStats } from "@/server/services/responses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withRoute(async (req) => {
	await requireStaff(req);
	return json({ forms: await Promise.all(listForms().map(getFormStats)) });
});
