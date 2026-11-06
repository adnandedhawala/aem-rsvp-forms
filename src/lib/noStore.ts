// The one definition of the no-store headers. Plain module (no server-only import)
// so proxy.ts, http.ts and next.config.ts can all share it.
export const NO_STORE_HEADERS = {
	"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
	Pragma: "no-cache",
	Expires: "0",
};
