"use client";

import { type Answers, type FieldDef, isFieldVisible } from "@forms/_fields";
import { Card } from "antd";
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
	return (
		<Card
			id={id}
			data-testid={id}
			className="mb-4"
			title={title}
			extra={subtitle}
		>
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
		</Card>
	);
}
