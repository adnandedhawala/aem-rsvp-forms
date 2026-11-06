import Image from "next/image";

export function Logo({ size = 72 }: { size?: number }) {
	return (
		<Image
			src="/jamaatLogo.png"
			alt="Anjuman-e-Mohammadi"
			width={size}
			height={size}
			priority
		/>
	);
}
