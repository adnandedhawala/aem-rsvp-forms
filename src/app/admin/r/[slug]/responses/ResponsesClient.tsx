"use client";

import type { PublicFieldDef } from "@forms/_fields";
import { getForm } from "@forms/index";
import { useQuery } from "@tanstack/react-query";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { Alert, Button, Card, Input, Space, Switch, Table } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataGrid } from "@/components/admin/DataGrid";
import { api } from "@/lib/api";
import { summarise } from "@/lib/summary";
import type { ResponseRow } from "@/server/services/responses";

interface Payload {
	fields: { household: PublicFieldDef[]; member: PublicFieldDef[] };
	rows: ResponseRow[];
}

function show(v: unknown): string {
	if (v === undefined || v === null) return "";
	if (typeof v === "boolean") return v ? "Yes" : "No";
	if (Array.isArray(v)) return v.join(", ");
	return String(v);
}
const when = (iso: string | null) =>
	iso ? dayjs(iso).format("DD MMM YYYY, HH:mm") : "";

export function ResponsesClient({ slug }: { slug: string }) {
	const title = getForm(slug)?.title ?? slug;
	const q = useQuery({
		queryKey: ["responses", slug],
		queryFn: () => api<Payload>(`/api/v1/admin/rsvp/${slug}/responses`),
	});
	const [gridApi, setGridApi] = useState<GridApi<ResponseRow> | null>(null);
	const [search, setSearch] = useState("");
	const [perFile, setPerFile] = useState(false);

	const rows = q.data?.rows ?? [];
	const fields = q.data?.fields;

	const cols = useMemo<ColDef<ResponseRow>[]>(() => {
		if (!fields) return [];
		return [
			{
				headerName: "File No",
				field: "fileNo",
				pinned: "left",
				width: 110,
				rowGroup: perFile,
				hide: perFile,
			},
			{ headerName: "HOF", field: "hofName", pinned: "left" },
			{ headerName: "ITS", field: "its", pinned: "left", width: 120 },
			{ headerName: "Name", field: "full_name", pinned: "left" },
			{ headerName: "Age", field: "age", width: 80 },
			{ headerName: "Gender", field: "gender", width: 100 },
			{ headerName: "Sector", field: "sector", filter: "agSetColumnFilter" },
			{
				headerName: "Sub-sector",
				field: "subsector",
				filter: "agSetColumnFilter",
			},
			{
				headerName: "Status",
				field: "status",
				filter: "agSetColumnFilter",
				width: 110,
			},
			...fields.member.map(
				(f): ColDef<ResponseRow> => ({
					colId: `m_${f.name}`,
					headerName: f.label,
					valueGetter: (p) => show(p.data?.answers[f.name]),
				}),
			),
			...fields.household.map(
				(f): ColDef<ResponseRow> => ({
					colId: `h_${f.name}`,
					headerName: `Household: ${f.label}`,
					valueGetter: (p) => show(p.data?.household[f.name]),
				}),
			),
			{
				headerName: "Submitted at",
				valueGetter: (p) => when(p.data?.submitted_at ?? null),
			},
			{
				headerName: "Updated at",
				valueGetter: (p) => when(p.data?.updated_at ?? null),
			},
			{ headerName: "By ITS", field: "submitted_by_its" },
			{ headerName: "Via", field: "submitted_via", width: 100 },
			{
				headerName: "",
				colId: "open",
				width: 120,
				sortable: false,
				filter: false,
				cellRenderer: (p: { data?: ResponseRow }) =>
					p.data ? (
						<Link
							prefetch={false}
							href={`/admin/r/${slug}/household/${p.data.fileNo}`}
						>
							Open form
						</Link>
					) : null,
			},
		];
	}, [fields, perFile, slug]);

	const summary = fields ? summarise(rows, fields.member) : [];
	const answeredMembers = rows.filter((r) => r.status === "Answered").length;
	const files = new Set(rows.map((r) => r.fileNo));
	const answeredFiles = new Set(
		rows.filter((r) => r.status === "Answered").map((r) => r.fileNo),
	);

	return (
		<AdminShell
			title={`Responses: ${title}`}
			breadcrumbs={[{ label: "RSVPs", href: "/admin" }, { label: title }]}
		>
			{q.error && <Alert type="error" message={q.error.message} />}
			<p className="m-0 mb-2 text-sm">
				Answered {answeredMembers} of {rows.length} members ·{" "}
				{answeredFiles.size} of {files.size} files
			</p>
			<div className="mb-3 flex flex-wrap gap-3">
				{summary.map((s) => (
					<Card key={s.field} size="small" title={s.label}>
						<Table
							size="small"
							pagination={false}
							rowKey="option"
							dataSource={s.options}
							columns={[
								{ title: "Option", dataIndex: "option" },
								{ title: "Male", dataIndex: "Male" },
								{ title: "Female", dataIndex: "Female" },
								{ title: "Total", dataIndex: "Total" },
							]}
						/>
					</Card>
				))}
			</div>
			<Space wrap className="mb-2">
				<Input.Search
					allowClear
					placeholder="Search"
					style={{ width: 240 }}
					onChange={(e) => setSearch(e.target.value)}
				/>
				<span>
					Per file <Switch checked={perFile} onChange={setPerFile} />
				</span>
				<Button
					onClick={() =>
						gridApi?.exportDataAsExcel({ fileName: `${slug}-responses.xlsx` })
					}
				>
					Download Excel
				</Button>
			</Space>
			<div style={{ height: 600 }}>
				<DataGrid<ResponseRow>
					rowData={rows}
					columnDefs={cols}
					loading={q.isPending}
					quickFilterText={search}
					groupDefaultExpanded={-1}
					defaultColDef={{ sortable: true, filter: true, resizable: true }}
					getRowId={(p) => p.data.its}
					onGridReady={(e: GridReadyEvent<ResponseRow>) => setGridApi(e.api)}
				/>
			</div>
		</AdminShell>
	);
}
