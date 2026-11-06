export function formatDate(iso: string): string {
	return new Date(iso).toLocaleString("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone: "Asia/Kolkata",
	});
}
