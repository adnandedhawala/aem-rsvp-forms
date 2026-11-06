import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseInviteeSheet } from "./inviteeSheet";

function book(
	rows: unknown[][],
	bookType: "xlsx" | "csv" = "xlsx",
): ArrayBuffer {
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
	const out = XLSX.write(wb, { type: "array", bookType });
	return out instanceof ArrayBuffer ? out : (out.buffer as ArrayBuffer);
}

const body = [
	[101, 10000001],
	["", ""],
	[" 101 ", "10000002 "],
];
const expected = [
	{ fileNo: "101", its: "10000001" },
	{ fileNo: "101", its: "10000002" },
];

describe("parseInviteeSheet", () => {
	it("reads File No / ITS and drops empty rows", () => {
		expect(parseInviteeSheet(book([["File No", "ITS"], ...body]))).toEqual(
			expected,
		);
	});
	it("matches headers loosely", () => {
		expect(parseInviteeSheet(book([["file_no", "its_id"], ...body]))).toEqual(
			expected,
		);
		expect(
			parseInviteeSheet(book([["Tanzeem File No.", "ITS"], ...body])),
		).toEqual(expected);
	});
	it("throws when a column is missing", () => {
		expect(() => parseInviteeSheet(book([["Name", "ITS"], ...body]))).toThrow(
			"Sheet needs File No and ITS columns",
		);
	});
	it("reads CSV", () => {
		expect(
			parseInviteeSheet(book([["File No", "ITS"], ...body], "csv")),
		).toEqual(expected);
	});
});
