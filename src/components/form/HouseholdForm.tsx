"use client";

import { type Answers, validateAnswers } from "@forms/_fields";
import { getForm } from "@forms/index";
import { Button, Tag } from "antd";
import { useState } from "react";
import type {
	HouseholdPayload,
	HouseholdView,
} from "@/server/services/households";
import { AnswerCard } from "./AnswerCard";

type Errors = Record<string, Record<string, string>>;

export function HouseholdForm(props: {
	formSlug: string;
	view: HouseholdView;
	mode: "household" | "admin";
	submitting: boolean;
	serverErrors?: { household?: Record<string, string>; members?: Errors };
	onSubmit: (p: HouseholdPayload) => void;
}) {
	const { formSlug, view, mode, submitting, serverErrors, onSubmit } = props;
	const form = getForm(formSlug);
	const [values, setValues] = useState<Record<string, Answers>>(() => ({
		household: view.household?.data ?? {},
		...Object.fromEntries(view.members.map((m) => [m.its, m.data ?? {}])),
	}));
	const [clientErrors, setClientErrors] = useState<Errors>({});

	if (!form) return null;
	const hasHousehold = form.householdFields.length > 0;
	const errorsFor = (key: string): Record<string, string> | undefined =>
		clientErrors[key] ??
		(key === "household"
			? serverErrors?.household
			: serverErrors?.members?.[key]);

	const setField = (key: string, name: string, v: unknown) =>
		setValues((s) => ({ ...s, [key]: { ...s[key], [name]: v } }));

	const handleSubmit = () => {
		const errors: Errors = {};
		const members: Record<string, Answers> = {};
		let household: Answers | undefined;
		if (hasHousehold) {
			const r = validateAnswers(form.householdFields, values.household ?? {});
			if (r.ok) household = r.data;
			else errors.household = r.errors;
		}
		for (const m of view.members) {
			const r = validateAnswers(form.memberFields, values[m.its] ?? {});
			if (r.ok) members[m.its] = r.data;
			else errors[m.its] = r.errors;
		}
		setClientErrors(errors);
		const firstKey = (hasHousehold ? ["household"] : [])
			.concat(view.members.map((m) => m.its))
			.find((k) => errors[k]);
		if (firstKey) {
			document
				.getElementById(`card-${firstKey}`)
				?.scrollIntoView({ behavior: "smooth" });
			return;
		}
		onSubmit({ ...(hasHousehold ? { household } : {}), members });
	};

	return (
		<div>
			{mode === "admin" && (
				<Tag color="gold" className="mb-4">
					Editing as admin
				</Tag>
			)}
			{hasHousehold && (
				<AnswerCard
					id="card-household"
					title="Household"
					fields={form.householdFields}
					values={values.household ?? {}}
					errors={errorsFor("household")}
					onChange={(name, v) => setField("household", name, v)}
				/>
			)}
			{view.members.map((m) => {
				const info = form.showMemberInfo
					.filter((k) => k !== "full_name")
					.map((k) => m[k])
					.filter((v) => v !== undefined && v !== null && v !== "")
					.join(" · ");
				return (
					<AnswerCard
						key={m.its}
						id={`card-${m.its}`}
						title={m.full_name}
						subtitle={info || undefined}
						fields={form.memberFields}
						values={values[m.its] ?? {}}
						errors={errorsFor(m.its)}
						onChange={(name, v) => setField(m.its, name, v)}
					/>
				);
			})}
			<Button
				type="primary"
				size="large"
				block
				loading={submitting}
				onClick={handleSubmit}
			>
				Submit
			</Button>
		</div>
	);
}
