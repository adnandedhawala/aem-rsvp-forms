import "server-only";
import { NO_STORE_HEADERS } from "@/lib/noStore";
import { connectDb } from "./db";

export { NO_STORE_HEADERS };

export class HttpError extends Error {
	status: number;
	details?: unknown;
	constructor(status: number, message: string, details?: unknown) {
		super(message);
		this.status = status;
		this.details = details;
	}
}

export function json(
	body: unknown,
	init: { status?: number; headers?: HeadersInit } = {},
): Response {
	const headers = new Headers(init.headers);
	for (const [k, v] of Object.entries(NO_STORE_HEADERS)) headers.set(k, v);
	headers.set("Content-Type", "application/json");
	return new Response(JSON.stringify(body), {
		status: init.status ?? 200,
		headers,
	});
}

export function withRoute<C>(
	handler: (req: Request, ctx: C) => Promise<Response>,
): (req: Request, ctx: C) => Promise<Response> {
	return async (req, ctx) => {
		try {
			await connectDb();
			return await handler(req, ctx);
		} catch (err) {
			if (err instanceof HttpError) {
				return json(
					{ error: err.message, details: err.details },
					{ status: err.status },
				);
			}
			console.error(err);
			return json({ error: "Something went wrong" }, { status: 500 });
		}
	};
}
