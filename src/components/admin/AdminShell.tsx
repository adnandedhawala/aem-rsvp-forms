"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Breadcrumb, Button } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { ApiError, api } from "@/lib/api";

export function AdminShell(props: {
	title: string;
	breadcrumbs?: { label: string; href?: string }[];
	actions?: ReactNode;
	children: ReactNode;
}) {
	const router = useRouter();
	const me = useQuery({
		queryKey: ["admin-me"],
		queryFn: () => api<{ itsId: number; name: string }>("/api/v1/admin/verify"),
	});
	const logout = useMutation({
		mutationFn: () => api("/api/v1/admin/logout", { method: "POST" }),
		onSuccess: () => router.replace("/admin/login"),
	});
	const expired = me.error instanceof ApiError && me.error.status === 401;
	useEffect(() => {
		if (expired) router.replace("/admin/login");
	}, [expired, router]);

	return (
		<div className="flex min-h-screen flex-col">
			<header className="flex items-center justify-between bg-slate-800 px-4 py-2 text-white">
				<Link
					prefetch={false}
					href="/admin"
					className="font-semibold text-white"
				>
					AEM RSVP Admin
				</Link>
				<div className="flex items-center gap-3 text-sm">
					{me.data && <span>{me.data.name}</span>}
					<Button
						size="small"
						loading={logout.isPending}
						onClick={() => logout.mutate()}
					>
						Logout
					</Button>
				</div>
			</header>
			<div className="flex flex-1 flex-col gap-3 p-4">
				{props.breadcrumbs && (
					<Breadcrumb
						items={props.breadcrumbs.map((b) => ({
							title: b.href ? (
								<Link prefetch={false} href={b.href}>
									{b.label}
								</Link>
							) : (
								b.label
							),
						}))}
					/>
				)}
				<div className="flex items-center justify-between gap-3">
					<h1 className="m-0 text-xl font-semibold">{props.title}</h1>
					<div>{props.actions}</div>
				</div>
				<div className="flex flex-1 flex-col">{props.children}</div>
			</div>
		</div>
	);
}
