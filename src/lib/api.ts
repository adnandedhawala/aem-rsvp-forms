export class ApiError extends Error {
	status: number;
	details?: unknown;
	constructor(status: number, message: string, details?: unknown) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

export async function api<T>(
	path: string,
	init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown } = {},
): Promise<T> {
	const res = await fetch(path, {
		method: init.method ?? "GET",
		cache: "no-store",
		credentials: "same-origin",
		headers: {
			"Cache-Control": "no-cache",
			"Content-Type": "application/json",
		},
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
	const body = await res.json().catch(() => null);
	if (!res.ok) {
		throw new ApiError(
			res.status,
			body?.error ?? "Something went wrong",
			body?.details,
		);
	}
	return body as T;
}
