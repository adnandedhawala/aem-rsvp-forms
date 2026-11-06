import type { FormDef } from "./_fields";
import sampleRsvp from "./sample-rsvp";

export const forms: FormDef[] = [sampleRsvp];

const slugs = new Set<string>();
for (const f of forms) {
	if (slugs.has(f.slug)) throw new Error(`duplicate form slug "${f.slug}"`);
	slugs.add(f.slug);
}

export function getForm(slug: string): FormDef | undefined {
	return forms.find((f) => f.slug === slug);
}

export function listForms(): FormDef[] {
	return forms;
}

export type FormStatus = "upcoming" | "open" | "closed";

export function formStatus(form: FormDef, now: Date = new Date()): FormStatus {
	if (now < form.opensAtDate) return "upcoming";
	if (now < form.closesAtDate) return "open";
	return "closed";
}
