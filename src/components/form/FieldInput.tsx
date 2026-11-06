"use client";

import type { FieldDef } from "@forms/_fields";
import { Checkbox, DatePicker, Input, InputNumber, Radio, Select } from "antd";
import dayjs from "dayjs";

export function FieldInput(props: {
	field: FieldDef;
	value: unknown;
	onChange: (v: unknown) => void;
	error?: string;
}) {
	const { field, value, onChange, error } = props;
	const options = (field.options ?? []).map((o) => ({ label: o, value: o }));
	const status = error ? "error" : undefined;

	let control: React.ReactNode;
	switch (field.type) {
		case "text":
			control = (
				<Input
					status={status}
					maxLength={field.maxLength}
					placeholder={field.placeholder}
					value={(value as string) ?? ""}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
			break;
		case "textarea":
			control = (
				<Input.TextArea
					status={status}
					maxLength={field.maxLength}
					placeholder={field.placeholder}
					value={(value as string) ?? ""}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
			break;
		case "number":
			control = (
				<InputNumber
					status={status}
					min={field.min}
					max={field.max}
					placeholder={field.placeholder}
					value={
						value === undefined || value === null || value === ""
							? null
							: Number(value)
					}
					onChange={(v) => onChange(v)}
				/>
			);
			break;
		case "radio":
			control = (
				<Radio.Group
					optionType="button"
					options={options}
					value={value ?? null}
					onChange={(e) => onChange(e.target.value)}
				/>
			);
			break;
		case "select":
			control = (
				<Select
					status={status}
					className="w-full"
					options={options}
					placeholder={field.placeholder}
					value={(value as string | undefined) ?? undefined}
					onChange={(v) => onChange(v)}
				/>
			);
			break;
		case "multiselect":
			control = (
				<Select
					status={status}
					mode="multiple"
					className="w-full"
					options={options}
					placeholder={field.placeholder}
					value={(value as string[] | undefined) ?? []}
					onChange={(v) => onChange(v)}
				/>
			);
			break;
		case "checkbox":
			control = (
				<Checkbox
					checked={value === true}
					onChange={(e) => onChange(e.target.checked)}
				>
					{field.label}
				</Checkbox>
			);
			break;
		case "date":
			control = (
				<DatePicker
					status={status}
					className="w-full"
					value={typeof value === "string" && value ? dayjs(value) : null}
					onChange={(d) => onChange(d ? d.format("YYYY-MM-DD") : undefined)}
				/>
			);
			break;
	}

	return (
		<div className="mb-4">
			{field.type !== "checkbox" && (
				<div className="mb-1 text-sm font-medium">
					{field.label}
					{field.required && <span className="text-red-600"> *</span>}
				</div>
			)}
			{control}
			{field.help && (
				<div className="mt-1 text-xs text-zinc-500">{field.help}</div>
			)}
			{error && <div className="mt-1 text-xs text-red-600">{error}</div>}
		</div>
	);
}
