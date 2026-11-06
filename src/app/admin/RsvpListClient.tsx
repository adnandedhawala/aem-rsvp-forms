"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Table, Tag } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import type { FormStats } from "@/server/services/responses";

const COLOR = { upcoming: "blue", open: "green", closed: "default" } as const;
const fmt = (iso: string) => dayjs(iso).format("DD MMM YYYY, HH:mm");

export function RsvpListClient() {
	const q = useQuery({
		queryKey: ["admin-rsvps"],
		queryFn: () => api<{ forms: FormStats[] }>("/api/v1/admin/rsvp"),
	});
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
						render: (s: FormStats["status"]) => <Tag color={COLOR[s]}>{s}</Tag>,
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
							</span>
						),
					},
				]}
			/>
		</AdminShell>
	);
}
