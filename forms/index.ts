import type { FormDef } from "./_fields";
import sampleRsvp from "./sample-rsvp";
import tncDarees2026 from "./tnc-darees-2026";

// The home page opens the first open form in this list.
export const forms: FormDef[] = [tncDarees2026, sampleRsvp];

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
