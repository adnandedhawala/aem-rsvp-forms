"use client";

import { getForm } from "@forms/index";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { App, Button, Input, Space, Upload } from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { DataGrid } from "@/components/admin/DataGrid";
import { ApiError, api } from "@/lib/api";
import { parseInviteeSheet } from "@/lib/inviteeSheet";
import type {
	InviteeListRow,
	InviteeRowResult,
} from "@/server/services/invitees";

interface GridRow {
	id: string;
	fileNo: string;
	its: string;
	check?: InviteeRowResult;
}

const blank = (): GridRow => ({ id: crypto.randomUUID(), fileNo: "", its: "" });
const blanks = (n: number) => Array.from({ length: n }, blank);

function statusOf(row: GridRow): string {
	if (!row.check) {
		const fileNo = row.fileNo.trim();
		const its = row.its.trim();
		if (fileNo && !its) return "Enter ITS";
		return its ? "Checking…" : "";
	}
	if (!row.check.ok) return row.check.error ?? "Error";
	return row.check.alreadyInvited ? "Already invited" : "OK";
}

export function InviteesClient({ slug }: { slug: string }) {
	const { message, modal } = App.useApp();
	const qc = useQueryClient();
	const form = getForm(slug);
	const title = form?.title ?? slug;

	const [rows, setRows] = useState<GridRow[]>(() => blanks(100));
	const [listApi, setListApi] = useState<GridApi<InviteeListRow> | null>(null);
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<InviteeListRow[]>([]);

	const list = useQuery({
		queryKey: ["invitees", slug],
		queryFn: () =>
			api<{ rows: InviteeListRow[] }>(`/api/v1/admin/rsvp/${slug}/invitees`),
	});

	const filled = rows.filter((r) => r.fileNo.trim() || r.its.trim());
	const hasErrors = rows.some((r) => r.check && !r.check.ok);
	// Every non-empty row must carry a fresh check result (edits clear it)
	const checked = filled.length > 0 && filled.every((r) => r.check);
	const canSave = checked && !hasErrors;

	// Set when a check request fails, so auto-check doesn't retry in a loop;
	// the next edit turns it back on.
	const [autoPaused, setAutoPaused] = useState(false);

	const edit = useCallback((id: string, patch: Partial<GridRow>) => {
		setAutoPaused(false);
		setRows((rs) =>
			rs.map((r) => (r.id === id ? { ...r, ...patch, check: undefined } : r)),
		);
	}, []);

	const check = useMutation({
		// Snapshot the rows being checked so late results can't land on edited rows
		mutationFn: async (snapshot: GridRow[]) => {
			const res = await api<{ rows: InviteeRowResult[] }>(
				`/api/v1/admin/rsvp/${slug}/invitees/validate`,
				{
					method: "POST",
					body: {
						rows: snapshot.map((r) => ({ fileNo: r.fileNo, its: r.its })),
					},
				},
			);
			return { snapshot, results: res.rows };
		},
		onSuccess: ({ snapshot, results }) => {
			// Results come back in the same order as the snapshot
			const byId = new Map(
				snapshot.map((r, i) => [r.id, { row: r, result: results[i] }]),
			);
			setRows((rs) =>
				rs.map((r) => {
					const hit = byId.get(r.id);
					const same =
						hit && hit.row.fileNo === r.fileNo && hit.row.its === r.its;
					// An ITS-only row gets the file no the server found for it
					return same
						? { ...r, fileNo: r.fileNo || hit.result.fileNo, check: hit.result }
						: r;
				}),
			);
		},
		onError: (e) => {
			setAutoPaused(true);
			message.error(e.message);
		},
	});

	// Look up rows as soon as an ITS is entered (file no is optional and filled
	// from the ITS), so details fill in and Save turns on without "Check rows".
	const { mutate: runCheck, isPending: checking } = check;
	useEffect(() => {
		if (checking || autoPaused) return;
		const ready = rows.filter((r) => r.its.trim() && !r.check);
		if (ready.length === 0) return;
		const t = setTimeout(() => runCheck(ready), 300);
		return () => clearTimeout(t);
	}, [rows, checking, autoPaused, runCheck]);

	const save = useMutation({
		mutationFn: () =>
			api<{ added: number; restored: number; unchanged: number }>(
				`/api/v1/admin/rsvp/${slug}/invitees`,
				{
					method: "POST",
					body: { rows: filled.map((r) => ({ fileNo: r.fileNo, its: r.its })) },
				},
			),
		onSuccess: (r) => {
			message.success(
				`Added ${r.added}, restored ${r.restored}, already there ${r.unchanged}`,
			);
			setRows(blanks(100));
			qc.invalidateQueries({ queryKey: ["invitees", slug] });
		},
		onError: (e) =>
			message.error(e instanceof ApiError ? e.message : "Could not save"),
	});

	const remove = useMutation({
		mutationFn: (memberIds: string[]) =>
			api<{ removed: number; hadAnswers: number }>(
				`/api/v1/admin/rsvp/${slug}/invitees`,
				{
					method: "DELETE",
					body: { memberIds },
				},
			),
		onSuccess: (r) => {
			message.success(`Removed ${r.removed}`);
			qc.invalidateQueries({ queryKey: ["invitees", slug] });
		},
		onError: (e) => message.error(e.message),
	});

	const addCols = useMemo<ColDef<GridRow>[]>(
		() => [
			{ headerName: "File No", field: "fileNo", editable: true, width: 110 },
			{ headerName: "ITS", field: "its", editable: true, width: 130 },
			{
				headerName: "Name",
				valueGetter: (p) => p.data?.check?.full_name ?? "",
				flex: 1,
			},
			{ headerName: "HOF", valueGetter: (p) => p.data?.check?.hofName ?? "" },
			{ headerName: "Sector", valueGetter: (p) => p.data?.check?.sector ?? "" },
			{
				headerName: "Sub-sector",
				valueGetter: (p) => p.data?.check?.subsector ?? "",
			},
			{
				headerName: "Status",
				valueGetter: (p) => (p.data ? statusOf(p.data) : ""),
				cellClass: (p) =>
					p.data?.check?.alreadyInvited ? "text-zinc-500" : "",
				flex: 1,
			},
		],
		[],
	);

	const listCols = useMemo<ColDef<InviteeListRow>[]>(
		() => [
			{
				headerName: "File No",
				field: "fileNo",
				width: 110,
				checkboxSelection: true,
			},
			{ headerName: "ITS", field: "its", width: 130 },
			{ headerName: "Name", field: "full_name", flex: 1 },
			{ headerName: "HOF", field: "hofName" },
			{ headerName: "Sector", field: "sector" },
			{ headerName: "Sub-sector", field: "subsector" },
			{
				headerName: "Answered",
				valueGetter: (p) => (p.data?.answered ? "Yes" : "No"),
				width: 110,
			},
			{
				headerName: "Added on",
				valueGetter: (p) =>
					p.data ? dayjs(p.data.createdAt).format("DD MMM YYYY") : "",
			},
		],
		[],
	);

	const upload = async (file: File) => {
		try {
			const parsed = parseInviteeSheet(await file.arrayBuffer());
			setAutoPaused(false);
			setRows([...parsed.map((r) => ({ ...blank(), ...r })), ...blanks(20)]);
			message.success(`Loaded ${parsed.length} rows`);
		} catch (e) {
			message.error(e instanceof Error ? e.message : "Could not read the file");
		}
		return false;
	};

	const confirmRemove = () => {
		const ids = selected.map((r) => r.its);
		const answered = selected.filter((r) => r.answered).length;
		modal.confirm({
			title: `Remove ${ids.length} members?`,
			content: `${answered} of them already answered; their answers are kept but hidden.`,
			onOk: () => remove.mutateAsync(ids),
		});
	};

	return (
		<AdminShell
			title={`Invitees: ${title}`}
			breadcrumbs={[{ label: "RSVPs", href: "/admin" }, { label: title }]}
		>
			<section className="mb-6 flex flex-col gap-2">
				<h2 className="m-0 text-base font-semibold">Add invitees</h2>
				<Space wrap>
					<Button onClick={() => setRows((rs) => [...rs, ...blanks(100)])}>
						Add 100 rows
					</Button>
					<Upload
						accept=".xlsx,.xls,.csv"
						showUploadList={false}
						beforeUpload={upload}
					>
						<Button>Upload Excel/CSV</Button>
					</Upload>
					<Button
						onClick={() => {
							setRows(blanks(100));
						}}
					>
						Clear
					</Button>
					<Button
						disabled={filled.length === 0}
						loading={check.isPending}
						onClick={() => {
							// Drop completely empty rows so the grid holds only real entries
							setRows(filled);
							check.mutate(filled);
						}}
					>
						Check rows
					</Button>
					<Button
						type="primary"
						disabled={!canSave}
						loading={save.isPending}
						onClick={() => save.mutate()}
					>
						Save
					</Button>
				</Space>
				<div style={{ height: 400 }}>
					<DataGrid<GridRow>
						rowData={rows}
						columnDefs={addCols}
						getRowId={(p) => p.data.id}
						cellSelection
						stopEditingWhenCellsLoseFocus
						rowClassRules={{
							"bg-red-50": (p) => !!p.data?.check && !p.data.check.ok,
						}}
						onCellValueChanged={(e) => {
							if (e.data && e.colDef.field) {
								edit(e.data.id, {
									[e.colDef.field]: String(e.newValue ?? "").trim(),
								});
							}
						}}
					/>
				</div>
			</section>

			<section className="flex flex-col gap-2">
				<h2 className="m-0 text-base font-semibold">
					Invited ({list.data?.rows.length ?? 0})
				</h2>
				<Space wrap>
					<Input.Search
						allowClear
						placeholder="Search"
						style={{ width: 240 }}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Button
						danger
						disabled={selected.length === 0}
						onClick={confirmRemove}
					>
						Remove selected
					</Button>
					<Button
						onClick={() =>
							listApi?.exportDataAsExcel({ fileName: `${slug}-invitees.xlsx` })
						}
					>
						Download Excel
					</Button>
				</Space>
				<div style={{ height: 400 }}>
					<DataGrid<InviteeListRow>
						rowData={list.data?.rows ?? []}
						columnDefs={listCols}
						loading={list.isPending}
						rowSelection={{ mode: "multiRow" }}
						quickFilterText={search}
						getRowId={(p) => p.data.its}
						onGridReady={(e: GridReadyEvent<InviteeListRow>) =>
							setListApi(e.api)
						}
						onSelectionChanged={(e) => setSelected(e.api.getSelectedRows())}
					/>
				</div>
			</section>
		</AdminShell>
	);
}
