"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import { type ReactNode, useState } from "react";
import { makeQueryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: ReactNode }) {
	const [client] = useState(makeQueryClient);
	return (
		<AntdRegistry>
			<ConfigProvider theme={{ token: { colorPrimary: "#1E293B" } }}>
				<App>
					<QueryClientProvider client={client}>{children}</QueryClientProvider>
				</App>
			</ConfigProvider>
		</AntdRegistry>
	);
}
