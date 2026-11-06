"use client";

import { getForm } from "@forms/index";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HouseholdForm } from "@/components/form/HouseholdForm";
import { Logo } from "@/components/Logo";
import { ApiError, api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type {
	HouseholdPayload,
	HouseholdView,
} from "@/server/services/households";

type ServerErrors = {
	household?: Record<string, string>;
	members?: Record<string, Record<string, string>>;
};

export function FormClient({ slug }: { slug: string }) {
	const router = useRouter();
	const form = getForm(slug);
	const view = useQuery({
		queryKey: ["household", slug],
		queryFn: () => api<HouseholdView>(`/api/v1/rsvp/${slug}/household`),
	});
	const [serverErrors, setServerErrors] = useState<ServerErrors>();
	const [topError, setTopError] = useState<string>();

	const expired = view.error instanceof ApiError && view.error.status === 401;
	useEffect(() => {
		if (expired) router.replace(`/r/${slug}`);
	}, [expired, router, slug]);

	const save = useMutation({
		mutationFn: (payload: HouseholdPayload) =>
			api<HouseholdView>(`/api/v1/rsvp/${slug}/household`, {
				method: "PUT",
				body: payload,
			}),
		onSuccess: () => router.push(`/r/${slug}/done`),
		onError: (err) => {
			if (!(err instanceof ApiError))
				return setTopError("Something went wrong");
			if (err.status === 401) return router.replace(`/r/${slug}`);
			if (err.status === 403) return setTopError("This RSVP is closed");
			setTopError(err.message);
			if (err.status === 422)
				setServerErrors((err.details ?? {}) as ServerErrors);
		},
	});

	const v = view.data;
	return (
		<div className="flex-1 bg-[#f4f6f9]">
			<main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-3 pb-8">
				<div className="flex items-center justify-between">
					<Link
						prefetch={false}
						href={`/r/${slug}`}
						className="text-sm font-medium text-slate-600"
					>
						← Back
					</Link>
					<Logo size={48} />
					<span className="w-10" aria-hidden="true" />
				</div>
				{form && (
					<section className="flex flex-col gap-2">
						<h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
							{form.title}
						</h1>
						{form.description && (
							<div className="flex flex-col gap-2 text-[15px] leading-relaxed text-slate-600">
								{form.description.split(/\n\s*\n/).map((para) => (
									<p key={para} className="m-0 whitespace-pre-line">
										{para}
									</p>
								))}
							</div>
						)}
					</section>
				)}
				{view.isPending && <p className="text-slate-600">Loading…</p>}
				{view.error && !expired && (
					<Alert type="error" message={view.error.message} />
				)}
				{v && (
					<>
						<header className="border-t border-slate-200 pt-4">
							<p className="m-0 text-sm text-slate-500">File {v.fileNo}</p>
							<p className="m-0 text-base font-semibold leading-snug text-slate-900">
								{v.hofName}
							</p>
							{(v.sector || v.subsector) && (
								<p className="m-0 text-sm text-slate-500">
									{[v.sector, v.subsector].filter(Boolean).join(", ")}
								</p>
							)}
							{v.lastSavedAt && (
								<p className="m-0 mt-1 text-sm text-slate-500">
									Last saved {formatDate(v.lastSavedAt)}
								</p>
							)}
						</header>
						{topError && <Alert type="error" message={topError} />}
						<HouseholdForm
							formSlug={slug}
							view={v}
							mode="household"
							submitting={save.isPending}
							serverErrors={serverErrors}
							onSubmit={(p) => {
								setTopError(undefined);
								setServerErrors(undefined);
								save.mutate(p);
							}}
						/>
					</>
				)}
			</main>
		</div>
	);
}
