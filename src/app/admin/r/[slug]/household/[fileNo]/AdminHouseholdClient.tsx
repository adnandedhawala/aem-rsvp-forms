"use client";

import { getForm } from "@forms/index";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { HouseholdForm } from "@/components/form/HouseholdForm";
import { ApiError, api } from "@/lib/api";
import type {
	HouseholdPayload,
	HouseholdView,
} from "@/server/services/households";

type ServerErrors = {
	household?: Record<string, string>;
	members?: Record<string, Record<string, string>>;
};

export function AdminHouseholdClient({
	slug,
	fileNo,
}: {
	slug: string;
	fileNo: string;
}) {
	const router = useRouter();
	const { message } = App.useApp();
	const title = getForm(slug)?.title ?? slug;
	const path = `/api/v1/admin/rsvp/${slug}/household/${fileNo}`;
	const view = useQuery({
		queryKey: ["admin-household", slug, fileNo],
		queryFn: () => api<HouseholdView>(path),
	});
	const [serverErrors, setServerErrors] = useState<ServerErrors>();

	const save = useMutation({
		mutationFn: (payload: HouseholdPayload) =>
			api<HouseholdView>(path, { method: "PUT", body: payload }),
		onSuccess: () => {
			message.success("Saved");
			router.push(`/admin/r/${slug}/responses`);
		},
		onError: (err) => {
			message.error(err.message);
			if (err instanceof ApiError && err.status === 422) {
				setServerErrors((err.details ?? {}) as ServerErrors);
			}
		},
	});

	const v = view.data;
	return (
		<AdminShell
			title={v ? `File ${v.fileNo}: ${v.hofName}` : `File ${fileNo}`}
			breadcrumbs={[
				{ label: "RSVPs", href: "/admin" },
				{ label: title },
				{ label: "Responses", href: `/admin/r/${slug}/responses` },
			]}
		>
			<div className="mx-auto w-full max-w-md">
				{view.error && (
					<Alert
						type="error"
						message={view.error.message}
						description={
							<Link prefetch={false} href={`/admin/r/${slug}/responses`}>
								Back to responses
							</Link>
						}
					/>
				)}
				{v && (
					<HouseholdForm
						formSlug={slug}
						view={v}
						mode="admin"
						submitting={save.isPending}
						serverErrors={serverErrors}
						onSubmit={(p) => {
							setServerErrors(undefined);
							save.mutate(p);
						}}
					/>
				)}
			</div>
		</AdminShell>
	);
}
