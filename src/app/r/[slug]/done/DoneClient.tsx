"use client";

import { getForm } from "@forms/index";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnswerSummary } from "@/components/form/AnswerSummary";
import { ApiError, api } from "@/lib/api";
import type { HouseholdView } from "@/server/services/households";

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
						<AnswerSummary
							title="Household"
							fields={form.householdFields}
							data={v.household.data}
						/>
					)}
					{v.members.map((m) => (
						<AnswerSummary
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
