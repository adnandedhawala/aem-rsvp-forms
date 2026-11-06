"use client";

import { type Answers, type FieldDef, isFieldVisible } from "@forms/_fields";
import { getForm } from "@forms/index";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError, api } from "@/lib/api";
import type { HouseholdView } from "@/server/services/households";

function display(f: FieldDef, v: unknown): string {
	if (f.type === "checkbox") return v === true ? "Yes" : "No";
	if (Array.isArray(v)) return v.join(", ");
	return String(v);
}

function Summary({
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

export function DoneClient({ slug }: { slug: string }) {
	const router = useRouter();
	const form = getForm(slug);
	const view = useQuery({
		queryKey: ["household", slug],
		queryFn: () => api<HouseholdView>(`/api/v1/rsvp/${slug}/household`),
	});
	const expired = view.error instanceof ApiError && view.error.status === 401;
	useEffect(() => {
		if (expired) router.replace(`/r/${slug}`);
	}, [expired, router, slug]);

	const v = view.data;
	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
			{view.isPending && <p className="text-zinc-600">Loading…</p>}
			{view.error && !expired && (
				<Alert type="error" message={view.error.message} />
			)}
			{v && form && (
				<>
					<Alert
						type="success"
						showIcon
						message="Thank you, your answers are saved"
					/>
					{v.household && form.householdFields.length > 0 && (
						<Summary
							title="Household"
							fields={form.householdFields}
							data={v.household.data}
						/>
					)}
					{v.members.map((m) => (
						<Summary
							key={m.its}
							title={m.full_name}
							fields={form.memberFields}
							data={m.data}
						/>
					))}
					{v.status === "open" && (
						<Link
							prefetch={false}
							href={`/r/${slug}/form`}
							className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 font-medium"
						>
							Edit answers
						</Link>
					)}
				</>
			)}
		</main>
	);
}
