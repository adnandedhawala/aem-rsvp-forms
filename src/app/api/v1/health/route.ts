import { getServerEnv } from "@/server/env";
import { json, withRoute } from "@/server/http";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withRoute(async () =>
	json({ ok: true, db: getServerEnv().dbName }),
);
