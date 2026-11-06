import { formStatus, listForms } from "@forms/index";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
	const open = listForms().filter((f) => formStatus(f) === "open");
	return (
		<main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-10">
			<Logo />
			<h1 className="text-xl font-semibold">AEM RSVP</h1>
			{open.length === 0 ? (
				<p className="text-zinc-600">No RSVPs are open right now.</p>
			) : (
				<ul className="flex w-full flex-col gap-3">
					{open.map((f) => (
						<li key={f.slug}>
							<Link
								prefetch={false}
								href={`/r/${f.slug}`}
								className="block rounded-lg border border-zinc-200 p-4 shadow-sm"
							>
								<div className="font-medium">{f.title}</div>
								<div className="text-sm text-zinc-600">
									Closes{" "}
									{f.closesAtDate.toLocaleDateString("en-IN", {
										day: "numeric",
										month: "short",
										year: "numeric",
										timeZone: "Asia/Kolkata",
									})}
								</div>
							</Link>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
