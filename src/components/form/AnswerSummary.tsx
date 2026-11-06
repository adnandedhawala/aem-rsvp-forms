"use client";

import { type Answers, type FieldDef, isFieldVisible } from "@forms/_fields";
import { cardClass } from "@/components/PublicPage";

function display(f: FieldDef, v: unknown): string {
	if (f.type === "checkbox") return v === true ? "Yes" : "No";
	if (Array.isArray(v)) return v.join(", ");
	return String(v);
}

// Yes/No answers keep the colours of the buttons they were picked with.
const valueTone: Record<string, string> = {
	Yes: "bg-blue-600 text-white",
	No: "bg-red-600 text-white",
};

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
		<section className={cardClass}>
			<h2 className="m-0 mb-3 text-base font-semibold leading-snug text-slate-900">
				{title}
			</h2>
			{rows.length === 0 ? (
				<p className="m-0 text-sm text-slate-500">No answers</p>
			) : (
				<dl className="m-0 flex flex-col gap-3">
					{rows.map((f) => {
						const text = display(f, data?.[f.name]);
						const tone = f.type === "checkbox" ? undefined : valueTone[text];
						return (
							<div key={f.name} className="flex flex-col gap-1">
								<dt className="text-sm text-slate-500">{f.label}</dt>
								<dd className="m-0">
									{tone ? (
										<span
											className={`inline-flex rounded-lg px-3 py-1 text-sm font-semibold ${tone}`}
										>
											{text}
										</span>
									) : (
										<span className="text-[15px] font-medium text-slate-900">
											{text}
										</span>
									)}
								</dd>
							</div>
						);
					})}
				</dl>
			)}
		</section>
	);
}
