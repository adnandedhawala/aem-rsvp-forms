import { describe, expect, it } from "vitest";
import { formStatus, getForm } from "./index";

describe("registry", () => {
	it("finds forms by slug", () => {
		expect(getForm("sample-rsvp")).toBeDefined();
		expect(getForm("nope")).toBeUndefined();
	});
	it("computes status from the dates", () => {
		const form = getForm("sample-rsvp");
		if (!form) throw new Error("missing");
		expect(formStatus(form, new Date("2025-06-01"))).toBe("upcoming");
		expect(formStatus(form, new Date("2027-01-01"))).toBe("open");
		expect(formStatus(form, new Date("2031-01-01"))).toBe("closed");
	});
});
