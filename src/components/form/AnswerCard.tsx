"use client";

import { type Answers, type FieldDef, isFieldVisible } from "@forms/_fields";
import { FieldInput } from "./FieldInput";

export function AnswerCard(props: {
	id: string;
	title: string;
	subtitle?: string;
	fields: FieldDef[];
	values: Answers;
	errors?: Record<string, string>;
	onChange: (name: string, v: unknown) => void;
}) {
	const { id, title, subtitle, fields, values, errors, onChange } = props;
	const hasError = !!errors && Object.keys(errors).length > 0;
	return (
		<section
			id={id}
			data-testid={id}
			className={`scroll-mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ${
				hasError ? "ring-red-300" : "ring-slate-200"
			}`}
		>
			<header className="mb-3">
				<h2 className="m-0 text-base font-semibold leading-snug text-slate-900">
					{title}
				</h2>
				{subtitle && (
					<p className="m-0 mt-0.5 text-sm text-slate-500">{subtitle}</p>
				)}
			</header>
			<div className="flex flex-col gap-4">
				{fields
					.filter((f) => isFieldVisible(f, values))
					.map((f) => (
						<FieldInput
							key={f.name}
							field={f}
							value={values[f.name]}
							error={errors?.[f.name]}
							onChange={(v) => onChange(f.name, v)}
						/>
					))}
			</div>
		</section>
	);
}
