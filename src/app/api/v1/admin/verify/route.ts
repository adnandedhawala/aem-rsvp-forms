import { requireAdmin } from "@/server/auth/session";
import { json, withRoute } from "@/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withRoute(async (req) => json(await requireAdmin(req)));
