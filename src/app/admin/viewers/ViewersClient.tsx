"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Input, Space, Table } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { api } from "@/lib/api";
import type { ViewerRow } from "@/server/services/viewers";

type Viewers = { viewers: ViewerRow[] };

export function ViewersClient() {
	const { message, modal } = App.useApp();
	const qc = useQueryClient();
	const [its, setIts] = useState("");
	const q = useQuery({
		queryKey: ["admin-viewers"],
		queryFn: () => api<Viewers>("/api/v1/admin/viewers"),
	});
	const done = (data: Viewers) => qc.setQueryData(["admin-viewers"], data);
	const add = useMutation({
		mutationFn: (v: string) =>
			api<Viewers>("/api/v1/admin/viewers", {
				method: "POST",
				body: { its: v },
			}),
		onSuccess: (data) => {
			done(data);
			setIts("");
			message.success("Viewer added");
		},
		onError: (err) => message.error(err.message),
	});
	const remove = useMutation({
		mutationFn: (v: string) =>
			api<Viewers>("/api/v1/admin/viewers", {
				method: "DELETE",
				body: { its: v },
			}),
		onSuccess: (data) => {
			done(data);
			message.success("Viewer removed");
		},
		onError: (err) => message.error(err.message),
	});

	return (
		<AdminShell
			title="Viewers"
			breadcrumbs={[{ label: "RSVPs", href: "/admin" }, { label: "Viewers" }]}
		>
			<p className="mt-0 text-zinc-600">
				Viewers sign in on the admin login with their AEM ITS or email and
				password. They can see and download every RSVP&apos;s invitees and
				responses, but can&apos;t change anything.
			</p>
			{q.error && <Alert type="error" message={q.error.message} />}
			<Space className="mb-3">
				<Input
					aria-label="Viewer ITS"
					placeholder="ITS (8 digits)"
					value={its}
					maxLength={8}
					style={{ width: 180 }}
					onChange={(e) => setIts(e.target.value.trim())}
					onPressEnter={() => /^\d{8}$/.test(its) && add.mutate(its)}
				/>
				<Button
					type="primary"
					disabled={!/^\d{8}$/.test(its)}
					loading={add.isPending}
					onClick={() => add.mutate(its)}
				>
					Add viewer
				</Button>
			</Space>
			<Table<ViewerRow>
				rowKey="its"
				loading={q.isPending}
				dataSource={q.data?.viewers ?? []}
				pagination={false}
				scroll={{ x: true }}
				columns={[
					{ title: "ITS", dataIndex: "its" },
					{ title: "Name", dataIndex: "name" },
					{ title: "Added by", dataIndex: "addedBy" },
					{
						title: "Added on",
						dataIndex: "addedAt",
						render: (d: string) => dayjs(d).format("DD MMM YYYY, HH:mm"),
					},
					{
						title: "",
						render: (_, r) => (
							<Button
								size="small"
								danger
								onClick={() =>
									modal.confirm({
										title: `Remove ${r.name || r.its} as a viewer?`,
										content: "They lose access on their next page load.",
										okText: "Remove",
										okButtonProps: { danger: true },
										onOk: () => remove.mutateAsync(r.its),
									})
								}
							>
								Remove
							</Button>
						),
					},
				]}
			/>
		</AdminShell>
	);
}
