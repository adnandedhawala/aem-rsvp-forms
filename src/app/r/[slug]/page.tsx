import { SignInClient } from "./SignInClient";

export default async function Page({ params }: PageProps<"/r/[slug]">) {
	const { slug } = await params;
	return <SignInClient slug={slug} />;
}
