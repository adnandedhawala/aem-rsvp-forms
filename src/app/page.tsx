import { formStatus, listForms } from "@forms/index";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function Home() {
	const first = listForms().find((f) => formStatus(f) === "open");
	// Temporary (307) redirect: which RSVP is open changes over time.
	if (first) redirect(`/r/${first.slug}`);
	return (
		<main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10">
			<Logo />
			<h1 className="text-xl font-semibold">AEM RSVP</h1>
			<p className="text-zinc-600">No RSVPs are open right now.</p>
		</main>
	);
}
