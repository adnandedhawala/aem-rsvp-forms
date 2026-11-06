"use client";

import { getForm } from "@forms/index";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnswerSummary } from "@/components/form/AnswerSummary";
import { IntroCard, PublicPage } from "@/components/PublicPage";
import { ApiError, api } from "@/lib/api";
import { formatDate } from "@/lib/format";
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
		<PublicPage>
			<Link
				prefetch={false}
				href={`/r/${slug}`}
				className="self-start text-sm font-medium text-slate-600"
			>
				← Back
			</Link>
			<IntroCard title={form?.title} description={form?.description}>
				{view.isPending && <p className="m-0 text-slate-600">Loading…</p>}
				{view.error && !expired && (
					<Alert type="error" message={view.error.message} />
				)}
				{v && (
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 ring-1 ring-inset ring-green-200">
							<svg
								aria-hidden="true"
								viewBox="0 0 20 20"
								className="h-6 w-6 shrink-0 text-green-600"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
									clipRule="evenodd"
								/>
							</svg>
							<p className="m-0 text-[15px] font-semibold text-green-800">
								Thank you, your answers are saved
							</p>
						</div>
						<div>
							<p className="m-0 text-sm text-slate-500">File {v.fileNo}</p>
							<p className="m-0 text-base font-semibold leading-snug text-slate-900">
								{v.hofName}
							</p>
							{v.lastSavedAt && (
								<p className="m-0 text-sm text-slate-500">
									Saved {formatDate(v.lastSavedAt)}
								</p>
							)}
						</div>
					</div>
				)}
			</IntroCard>
			{v && form && (
				<>
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
							className="mt-2 flex h-[52px] items-center justify-center rounded-xl bg-white text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-300"
							style={{ color: "#1e293b", background: "#fff" }}
						>
							Edit answers
						</Link>
					)}
				</>
			)}
		</PublicPage>
	);
}
