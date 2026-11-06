"use client";

import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { gridTheme, registerGrid } from "./grid";

registerGrid();

export function DataGrid<T>(props: AgGridReactProps<T>) {
	return (
		<div style={{ height: "100%", width: "100%" }}>
			<AgGridReact<T> theme={gridTheme} {...props} />
		</div>
	);
}
