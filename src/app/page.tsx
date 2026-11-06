import { listForms } from "@forms/index";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { connectDb } from "@/server/db";
import { rsvpStatus } from "@/server/services/control";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function firstOpenSlug(): Promise<string | null> {
	await connectDb();
	for (const form of listForms()) {
		if ((await rsvpStatus(form)) === "open") return form.slug;
	}
	return null;
}

export default async function Home() {
	const slug = await firstOpenSlug();
	// Temporary (307) redirect: which RSVP is open changes over time.
	if (slug) redirect(`/r/${slug}`);
	return (
		<main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10">
			<Logo />
			<h1 className="text-xl font-semibold">AEM RSVP</h1>
			<p className="text-zinc-600">No RSVPs are open right now.</p>
		</main>
	);
}
