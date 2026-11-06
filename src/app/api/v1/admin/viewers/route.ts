import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { HttpError, json, withRoute } from "@/server/http";
import {
	addViewer,
	listViewers,
	removeViewer,
} from "@/server/services/viewers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const Body = z.object({
	its: z
		.string()
		.trim()
		.regex(/^\d{8}$/),
});

async function readIts(req: Request): Promise<string> {
	const parsed = Body.safeParse(await req.json().catch(() => null));
	if (!parsed.success) throw new HttpError(400, "ITS must be 8 digits");
	return parsed.data.its;
}

export const GET = withRoute(async (req) => {
	await requireAdmin(req);
	return json({ viewers: await listViewers() });
});

export const POST = withRoute(async (req) => {
	const admin = await requireAdmin(req);
	await addViewer(await readIts(req), String(admin.itsId));
	return json({ viewers: await listViewers() });
});

export const DELETE = withRoute(async (req) => {
	await requireAdmin(req);
	await removeViewer(await readIts(req));
	return json({ viewers: await listViewers() });
});
