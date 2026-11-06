"use client";

import {
	AllCommunityModule,
	ModuleRegistry,
	themeQuartz,
} from "ag-grid-community";
import {
	ClipboardModule,
	ExcelExportModule,
	LicenseManager,
	RowGroupingModule,
	SetFilterModule,
} from "ag-grid-enterprise";

let registered = false;

export function registerGrid(): void {
	if (registered) return;
	registered = true;
	ModuleRegistry.registerModules([
		AllCommunityModule,
		ClipboardModule,
		ExcelExportModule,
		SetFilterModule,
		RowGroupingModule,
	]);
	const key = process.env.NEXT_PUBLIC_AG_GRID_LICENSE;
	if (key) LicenseManager.setLicenseKey(key);
}

export const gridTheme = themeQuartz;
