import "server-only";
import type { FormDef } from "@forms/_fields";
import { getForm } from "@forms/index";
import { z } from "zod";
import { HttpError } from "../http";
import type { HouseholdPayload } from "./households";

export const PayloadSchema = z.object({
	household: z.record(z.string(), z.unknown()).optional(),
	members: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export function formOr404(slug: string): FormDef {
	const form = getForm(slug);
	if (!form) throw new HttpError(404, "RSVP not found");
	return form;
}

export async function readPayload(req: Request): Promise<HouseholdPayload> {
	const parsed = PayloadSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) throw new HttpError(400, "Invalid submission");
	return parsed.data;
}
