import { toPublicFields } from "@forms/_fields";
import sample from "@forms/sample-rsvp";
import { describe, expect, it } from "vitest";
import type { ResponseRow } from "@/server/services/responses";
import { summarise } from "./summary";

const row = (
	status: "Answered" | "Pending",
	gender: string | undefined,
	answers: Record<string, unknown>,
): ResponseRow => ({
	fileNo: 101,
	hofName: "",
	sector: null,
	subsector: null,
	its: "1",
	full_name: "x",
	gender,
	status,
	answers,
	household: {},
	submitted_at: null,
	updated_at: null,
	submitted_by_its: null,
	submitted_via: null,
});

describe("summarise", () => {
	const rows = [
		row("Answered", "Male", { attending: "Yes" }),
		row("Answered", "Male", { attending: "Yes" }),
		row("Answered", "Female", { attending: "No" }),
		row("Answered", undefined, { attending: "Yes" }),
		row("Pending", "Male", {}),
	];
	const out = summarise(rows, toPublicFields(sample.memberFields));

	it("covers radio and select fields in order", () => {
		expect(out.map((o) => o.field)).toEqual(["attending", "days"]);
	});
	it("counts per option and gender, answered rows only", () => {
		const att = out[0].options;
		expect(att.find((o) => o.option === "Yes")).toMatchObject({
			Male: 2,
			Female: 0,
			Total: 3,
		});
		expect(att.find((o) => o.option === "No")).toMatchObject({
			Male: 0,
			Female: 1,
			Total: 1,
		});
	});
});
