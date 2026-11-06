import { z } from "zod";

export type FieldType =
	| "text"
	| "textarea"
	| "number"
	| "radio"
	| "select"
	| "multiselect"
	| "checkbox"
	| "date";

export type Answers = Record<string, unknown>;

export interface FieldDef {
	name: string;
	label: string;
	type: FieldType;
	required?: boolean;
	options?: string[];
	min?: number;
	max?: number;
	maxLength?: number;
	placeholder?: string;
	help?: string;
	visibleIf?: (values: Answers) => boolean;
}

export type MemberInfoKey =
	| "full_name"
	| "age"
	| "gender"
	| "mobile"
	| "hof_fm_type";
export type SignInIts = "hof" | "member" | "either";

export interface FormInput {
	slug: string;
	title: string;
	description?: string;
	opensAt: string;
	closesAt: string;
	signIn?: { its?: SignInIts; mustBeInvited?: boolean };
	householdFields?: FieldDef[];
	memberFields: FieldDef[];
	showMemberInfo?: MemberInfoKey[];
}

export interface FormDef {
	slug: string;
	title: string;
	description?: string;
	opensAt: string;
	closesAt: string;
	opensAtDate: Date;
	closesAtDate: Date;
	signIn: { its: SignInIts; mustBeInvited: boolean };
	householdFields: FieldDef[];
	memberFields: FieldDef[];
	showMemberInfo: MemberInfoKey[];
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME = /^[a-z][a-z0-9_]*$/;

export function defineForm(input: FormInput): FormDef {
	if (!SLUG.test(input.slug)) throw new Error(`bad slug "${input.slug}"`);
	const opensAtDate = new Date(input.opensAt);
	const closesAtDate = new Date(input.closesAt);
	if (Number.isNaN(opensAtDate.getTime()))
		throw new Error(`bad opensAt "${input.opensAt}"`);
	if (Number.isNaN(closesAtDate.getTime()))
		throw new Error(`bad closesAt "${input.closesAt}"`);
	if (opensAtDate >= closesAtDate)
		throw new Error("opensAt must be before closesAt");

	const householdFields = input.householdFields ?? [];
	const seen = new Set<string>();
	for (const f of [...householdFields, ...input.memberFields]) {
		if (!NAME.test(f.name)) throw new Error(`bad field name "${f.name}"`);
		if (seen.has(f.name)) throw new Error(`duplicate field name "${f.name}"`);
		seen.add(f.name);
		if (
			["radio", "select", "multiselect"].includes(f.type) &&
			!f.options?.length
		) {
			throw new Error(`field "${f.name}" needs options`);
		}
	}

	return {
		slug: input.slug,
		title: input.title,
		description: input.description,
		opensAt: input.opensAt,
		closesAt: input.closesAt,
		opensAtDate,
		closesAtDate,
		signIn: {
			its: input.signIn?.its ?? "either",
			mustBeInvited: input.signIn?.mustBeInvited ?? false,
		},
		householdFields,
		memberFields: input.memberFields,
		showMemberInfo: input.showMemberInfo ?? ["full_name", "age", "gender"],
	};
}

export function isFieldVisible(field: FieldDef, values: Answers): boolean {
	return field.visibleIf ? field.visibleIf(values) : true;
}

export type ValidationResult =
	| { ok: true; data: Answers }
	| { ok: false; errors: Record<string, string> };

function isMissing(field: FieldDef, v: unknown): boolean {
	if (v === undefined || v === null || v === "") return true;
	if (typeof v === "string" && v.trim() === "") return true;
	return field.type === "multiselect" && Array.isArray(v) && v.length === 0;
}

function schemaFor(field: FieldDef): z.ZodType {
	const label = field.label;
	switch (field.type) {
		case "text":
		case "textarea": {
			let s = z.string().trim();
			if (field.maxLength) s = s.max(field.maxLength, `${label} is too long`);
			return s;
		}
		case "number": {
			const notNumber = `${label} must be a number`;
			let n = z.number({ error: notNumber });
			if (field.min !== undefined)
				n = n.min(field.min, `${label} must be at least ${field.min}`);
			if (field.max !== undefined)
				n = n.max(field.max, `${label} must be at most ${field.max}`);
			// Accept only numbers or non-blank numeric strings; never booleans or arrays
			return z
				.union([z.number(), z.string().trim().min(1)], { error: notNumber })
				.pipe(z.coerce.number({ error: notNumber }))
				.pipe(n);
		}
		case "radio":
		case "select":
			return z.enum(field.options as [string, ...string[]], {
				error: `${label} is not valid`,
			});
		case "multiselect":
			return z.array(z.enum(field.options as [string, ...string[]]), {
				error: `${label} is not valid`,
			});
		case "checkbox":
			return z.boolean({ error: `${label} is not valid` });
		case "date":
			return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a date`);
	}
}

export function validateAnswers(
	fields: FieldDef[],
	raw: Answers,
): ValidationResult {
	const data: Answers = {};
	const errors: Record<string, string> = {};
	for (const field of fields) {
		if (!isFieldVisible(field, raw)) continue;
		const value = raw[field.name];
		if (field.type === "checkbox") {
			const r = schemaFor(field).safeParse(
				value === undefined || value === null ? false : value,
			);
			if (!r.success) errors[field.name] = r.error.issues[0].message;
			else if (field.required && r.data !== true) {
				errors[field.name] = `${field.label} is required`;
			} else data[field.name] = r.data;
			continue;
		}
		if (isMissing(field, value)) {
			if (field.required) errors[field.name] = `${field.label} is required`;
			continue;
		}
		const r = schemaFor(field).safeParse(value);
		if (r.success) data[field.name] = r.data;
		else errors[field.name] = r.error.issues[0].message;
	}
	return Object.keys(errors).length
		? { ok: false, errors }
		: { ok: true, data };
}

export type PublicFieldDef = Omit<FieldDef, "visibleIf">;

export function toPublicFields(fields: FieldDef[]): PublicFieldDef[] {
	return fields.map(({ visibleIf: _visibleIf, ...rest }) => rest);
}
