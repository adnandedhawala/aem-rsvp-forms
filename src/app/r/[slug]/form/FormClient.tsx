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
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
			<Link
				prefetch={false}
				href={`/r/${slug}`}
				className="self-start text-sm font-medium text-zinc-600"
			>
				← Back
			</Link>
			<div className="flex justify-center">
				<Logo />
			</div>
			{form && (
				<section className="flex flex-col gap-2">
					<h1 className="m-0 text-xl font-semibold">{form.title}</h1>
					{form.description && (
						<p className="m-0 whitespace-pre-line text-zinc-600">
							{form.description}
						</p>
					)}
				</section>
			)}
			{view.isPending && <p className="text-zinc-600">Loading…</p>}
			{view.error && !expired && (
				<Alert type="error" message={view.error.message} />
			)}
			{v && (
				<>
					<header className="rounded-lg bg-zinc-50 p-3 text-sm">
						<div className="font-semibold">
							File {v.fileNo} · {v.hofName}
						</div>
						{(v.sector || v.subsector) && (
							<div className="text-zinc-600">
								{[v.sector, v.subsector].filter(Boolean).join(" · ")}
							</div>
						)}
						{v.lastSavedAt && (
							<div className="text-zinc-500">
								Last saved {formatDate(v.lastSavedAt)}
							</div>
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
	);
}
