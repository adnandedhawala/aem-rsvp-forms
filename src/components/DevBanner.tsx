import { getServerEnv } from "@/server/env";

export function DevBanner() {
	if (!getServerEnv().isDevDb) return null;
	return (
		<div className="sticky top-0 z-50 bg-amber-400 px-3 py-1 text-center text-xs font-semibold text-black">
			DEV DATA (aem-dev)
		</div>
	);
}
