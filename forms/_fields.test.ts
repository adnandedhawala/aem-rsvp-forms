import { describe, expect, it } from "vitest";
import { defineForm, toPublicFields, validateAnswers } from "./_fields";
import sample from "./sample-rsvp";

const base = {
	slug: "x",
	title: "X",
	opensAt: "2026-01-01T00:00:00+05:30",
	closesAt: "2030-01-01T00:00:00+05:30",
};
const text = (name: string) => ({ name, label: name, type: "text" as const });

describe("defineForm", () => {
	it("rejects a duplicate name across household and member fields", () => {
		expect(() =>
			defineForm({
				...base,
				householdFields: [text("x")],
				memberFields: [text("x")],
			}),
		).toThrow('duplicate field name "x"');
	});
	it("rejects a bad slug, a select without options and reversed dates", () => {
		expect(() =>
			defineForm({ ...base, slug: "Bad Slug", memberFields: [text("a")] }),
		).toThrow();
		expect(() =>
			defineForm({
				...base,
				memberFields: [{ name: "a", label: "A", type: "select" }],
			}),
		).toThrow();
		expect(() =>
			defineForm({
				...base,
				opensAt: base.closesAt,
				closesAt: base.opensAt,
				memberFields: [text("a")],
			}),
		).toThrow();
	});
	it("applies defaults", () => {
		const f = defineForm({ ...base, memberFields: [text("a")] });
		expect(f.signIn).toEqual({ its: "either", mustBeInvited: false });
		expect(f.householdFields).toEqual([]);
		expect(f.showMemberInfo).toEqual(["full_name", "age", "gender"]);
	});
});

describe("validateAnswers", () => {
	it("drops hidden fields and unknown keys", () => {
		expect(
			validateAnswers(sample.memberFields, {
				attending: "No",
				days: "All",
				hacker: 1,
			}),
		).toEqual({ ok: true, data: { attending: "No", needs_wheelchair: false } });
	});
	it("requires visible required fields", () => {
		const r = validateAnswers(sample.memberFields, { attending: "Yes" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.days).toBe("Which days? is required");
	});
	it("rejects values outside the options", () => {
		const r = validateAnswers(sample.memberFields, { attending: "Maybe" });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.attending).toBeDefined();
	});
	it("coerces numbers and checks max", () => {
		const ok = validateAnswers(sample.householdFields, { mehmaan_count: "3" });
		expect(ok.ok && ok.data.mehmaan_count).toBe(3);
		expect(
			validateAnswers(sample.householdFields, { mehmaan_count: "25" }).ok,
		).toBe(false);
		expect(validateAnswers(sample.householdFields, {})).toEqual({
			ok: true,
			data: {},
		});
	});
	it("handles multiselect, date and text length", () => {
		const fields = [
			{
				name: "m",
				label: "M",
				type: "multiselect" as const,
				options: ["a", "b"],
				required: true,
			},
			{ name: "d", label: "D", type: "date" as const },
			{ name: "t", label: "T", type: "text" as const, maxLength: 3 },
		];
		expect(validateAnswers(fields, { m: [], d: "2026-01-02" })).toMatchObject({
			ok: false,
		});
		expect(validateAnswers(fields, { m: ["a"], d: "bad" })).toMatchObject({
			ok: false,
		});
		expect(validateAnswers(fields, { m: ["a"], t: "abcd" })).toMatchObject({
			ok: false,
		});
		expect(
			validateAnswers(fields, { m: ["a"], d: "2026-01-02", t: " ab " }),
		).toEqual({
			ok: true,
			data: { m: ["a"], d: "2026-01-02", t: "ab" },
		});
	});
});

describe("toPublicFields", () => {
	it("strips visibleIf and round-trips through JSON", () => {
		const pub = toPublicFields(sample.memberFields);
		expect(pub.some((f) => "visibleIf" in f)).toBe(false);
		expect(JSON.parse(JSON.stringify(pub))).toEqual(pub);
	});
});
