import type { PublicFieldDef } from "@forms/_fields";
import type { ResponseRow } from "@/server/services/responses";

export interface SummaryOption {
	option: string;
	Male: number;
	Female: number;
	Total: number;
}
export interface FieldSummary {
	field: string;
	label: string;
	options: SummaryOption[];
}

export function summarise(
	rows: ResponseRow[],
	fields: PublicFieldDef[],
): FieldSummary[] {
	const answered = rows.filter((r) => r.status === "Answered");
	return fields
		.filter((f) => f.type === "radio" || f.type === "select")
		.map((f) => ({
			field: f.name,
			label: f.label,
			options: (f.options ?? []).map((option) => {
				const hits = answered.filter((r) => r.answers[f.name] === option);
				return {
					option,
					Male: hits.filter((r) => r.gender === "Male").length,
					Female: hits.filter((r) => r.gender === "Female").length,
					Total: hits.length,
				};
			}),
		}));
}
