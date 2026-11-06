import { Logo } from "@/components/Logo";

// Shared look for the household pages (sign-in and form): a soft grey page
// with content on white cards. Keep both pages on these so they match.

export const cardClass =
	"rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200";

export function PublicPage({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-dvh bg-[#eef1f5]">
			<main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
				{children}
			</main>
		</div>
	);
}

// The top card: logo, RSVP title and description, then anything page-specific
// (household details, sign-in form) under a divider.
export function IntroCard(props: {
	title?: string;
	description?: string;
	children?: React.ReactNode;
}) {
	const { title, description, children } = props;
	return (
		<section className={`${cardClass} flex flex-col gap-4`}>
			<div className="flex justify-center">
				<Logo size={88} />
			</div>
			{title && (
				<div className="flex flex-col gap-2">
					<h1 className="m-0 text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
						{title}
					</h1>
					{description && (
						<div className="flex flex-col gap-2 text-[15px] leading-relaxed text-slate-600">
							{description.split(/\n\s*\n/).map((para) => (
								<p key={para} className="m-0 whitespace-pre-line">
									{para}
								</p>
							))}
						</div>
					)}
				</div>
			)}
			{children && (
				<div className={title ? "border-t border-slate-200 pt-4" : ""}>
					{children}
				</div>
			)}
		</section>
	);
}

// Same tall button on every household page.
export const bigButtonStyle = { height: 52, borderRadius: 12, fontWeight: 600 };
