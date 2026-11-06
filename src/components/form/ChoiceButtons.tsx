"use client";

import { useId } from "react";

// Plain elements styled with Tailwind, so antd's theme can't override them.
// Yes is blue and No is red; any other option uses the neutral slate.
const tone: Record<string, { idle: string; picked: string }> = {
	Yes: {
		idle: "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100",
		picked: "bg-blue-600 text-white ring-blue-600",
	},
	No: {
		idle: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100",
		picked: "bg-red-600 text-white ring-red-600",
	},
};
const neutral = {
	idle: "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-slate-100",
	picked: "bg-slate-800 text-white ring-slate-800",
};

export function ChoiceButtons(props: {
	options: string[];
	value: unknown;
	invalid?: boolean;
	onChange: (v: string) => void;
}) {
	const { options, value, invalid, onChange } = props;
	const name = useId();
	return (
		<div
			role="radiogroup"
			className={`grid gap-2 ${options.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
		>
			{options.map((o) => {
				const picked = value === o;
				const t = tone[o] ?? neutral;
				return (
					<label
						key={o}
						className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-base font-semibold ring-1 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-slate-900 ${
							picked ? t.picked : t.idle
						} ${invalid && !picked ? "ring-red-400" : ""}`}
					>
						<input
							type="radio"
							name={name}
							value={o}
							checked={picked}
							onChange={() => onChange(o)}
							className="sr-only"
						/>
						{picked && (
							<svg
								aria-hidden="true"
								viewBox="0 0 20 20"
								className="h-5 w-5"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
									clipRule="evenodd"
								/>
							</svg>
						)}
						<span>{o}</span>
					</label>
				);
			})}
		</div>
	);
}
