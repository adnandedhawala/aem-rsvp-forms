import * as XLSX from "xlsx";
import type { InviteeRowInput } from "@/server/services/invitees";

const norm = (h: string) => h.toLowerCase().replace(/[\s_.]/g, "");
const FILE_KEYS = ["fileno", "filenumber", "tanzeemfileno"];
const ITS_KEYS = ["its", "itsid"];

export function parseInviteeSheet(data: ArrayBuffer): InviteeRowInput[] {
	const wb = XLSX.read(data, { type: "array" });
	const sheet = wb.Sheets[wb.SheetNames[0]];
	const rows = sheet
		? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
		: [];
	const headers = Object.keys(rows[0] ?? {});
	const fileKey = headers.find((h) => FILE_KEYS.includes(norm(h)));
	const itsKey = headers.find((h) => ITS_KEYS.includes(norm(h)));
	if (!fileKey || !itsKey)
		throw new Error("Sheet needs File No and ITS columns");
	return rows
		.map((r) => ({
			fileNo: String(r[fileKey]).trim(),
			its: String(r[itsKey]).trim(),
		}))
		.filter((r) => r.fileNo !== "" || r.its !== "");
}
