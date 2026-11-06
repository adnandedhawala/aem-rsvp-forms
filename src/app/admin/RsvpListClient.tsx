"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Table, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { AdminShell, useIsAdmin } from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import type { FormStats } from "@/server/services/responses";

const COLOR = { upcoming: "blue", open: "green", closed: "default" } as const;
const fmt = (iso: string) => dayjs(iso).format("DD MMM YYYY, HH:mm");

export function RsvpListClient() {
	const { message, modal } = App.useApp();
	const isAdmin = useIsAdmin();
	const qc = useQueryClient();
	const q = useQuery({
		queryKey: ["admin-rsvps"],
		queryFn: () => api<{ forms: FormStats[] }>("/api/v1/admin/rsvp"),
	});
	const setClosed = useMutation({
		mutationFn: (v: { slug: string; closed: boolean }) =>
			api(`/api/v1/admin/rsvp/${v.slug}/close`, {
				method: "POST",
				body: { closed: v.closed },
			}),
		onSuccess: (_, v) => {
			message.success(v.closed ? "RSVP closed" : "RSVP reopened");
			qc.invalidateQueries({ queryKey: ["admin-rsvps"] });
		},
		onError: (err) => message.error(err.message),
	});
	const confirmToggle = (r: FormStats) => {
		const closed = !r.adminClosed;
		modal.confirm({
			title: closed ? `Close "${r.title}"?` : `Reopen "${r.title}"?`,
			content: closed
				? "Households won't be able to sign in or submit. Admins can still edit responses."
				: "Households can sign in and submit again, if its dates allow.",
			okText: closed ? "Close RSVP" : "Reopen",
			okButtonProps: { danger: closed },
			onOk: () => setClosed.mutateAsync({ slug: r.slug, closed }),
		});
	};
	return (
		<AdminShell title="RSVPs">
			{q.error && <Alert type="error" message={q.error.message} />}
			<Table<FormStats>
				rowKey="slug"
				loading={q.isPending}
				dataSource={q.data?.forms ?? []}
				pagination={false}
				scroll={{ x: true }}
				columns={[
					{ title: "Title", dataIndex: "title" },
					{
						title: "Status",
						dataIndex: "status",
						render: (s: FormStats["status"], r) =>
							r.adminClosed ? (
								<Tooltip
									title={`Closed by admin ${r.adminClosed.by ?? ""} on ${r.adminClosed.at ? fmt(r.adminClosed.at) : ""}`}
								>
									<Tag color={COLOR[s]}>{s} (by admin)</Tag>
								</Tooltip>
							) : (
								<Tag color={COLOR[s]}>{s}</Tag>
							),
					},
					{ title: "Opens", dataIndex: "opensAt", render: fmt },
					{ title: "Closes", dataIndex: "closesAt", render: fmt },
					{
						title: "Invited",
						render: (_, r) =>
							`${r.invitedFiles} files / ${r.invitedMembers} members`,
					},
					{
						title: "Answered",
						render: (_, r) =>
							`${r.answeredFiles} files / ${r.answeredMembers} members`,
					},
					{
						title: "Actions",
						render: (_, r) => (
							<span className="flex gap-3">
								<Link prefetch={false} href={`/admin/r/${r.slug}/invitees`}>
									Invitees
								</Link>
								<Link prefetch={false} href={`/admin/r/${r.slug}/responses`}>
									Responses
								</Link>
								{isAdmin && (
									<Button
										size="small"
										danger={!r.adminClosed}
										onClick={() => confirmToggle(r)}
									>
										{r.adminClosed ? "Reopen" : "Close"}
									</Button>
								)}
							</span>
						),
					},
				]}
			/>
		</AdminShell>
	);
}
