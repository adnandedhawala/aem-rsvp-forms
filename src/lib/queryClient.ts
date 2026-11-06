import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 0,
				gcTime: 0,
				refetchOnMount: "always",
				refetchOnWindowFocus: true,
				retry: false,
			},
			mutations: { retry: false },
		},
	});
}
