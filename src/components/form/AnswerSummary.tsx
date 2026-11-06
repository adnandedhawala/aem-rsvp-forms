"use client";

import { type Answers, type FieldDef, isFieldVisible } from "@forms/_fields";
import { Card } from "antd";

function display(f: FieldDef, v: unknown): string {
	if (f.type === "checkbox") return v === true ? "Yes" : "No";
	if (Array.isArray(v)) return v.join(", ");
	return String(v);
}

/** Read-only answers for one member or the household. */
export function AnswerSummary({
	title,
	fields,
	data,
}: {
	title: string;
	fields: FieldDef[];
	data: Answers | null;
}) {
	const rows = fields.filter(
		(f) =>
			isFieldVisible(f, data ?? {}) &&
			data?.[f.name] !== undefined &&
			data[f.name] !== "",
	);
	return (
		<Card className="mb-3" title={title} size="small">
			{rows.length === 0 ? (
				<span className="text-zinc-500">No answers</span>
			) : (
				<dl className="m-0">
					{rows.map((f) => (
						<div
							key={f.name}
							className="flex justify-between gap-4 py-1 text-sm"
						>
							<dt className="text-zinc-600">{f.label}</dt>
							<dd className="m-0 text-right font-medium">
								{display(f, data?.[f.name])}
							</dd>
						</div>
					))}
				</dl>
			)}
		</Card>
	);
}
