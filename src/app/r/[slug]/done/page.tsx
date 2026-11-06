import { DoneClient } from "./DoneClient";

export default async function Page({ params }: PageProps<"/r/[slug]/done">) {
	const { slug } = await params;
	return <DoneClient slug={slug} />;
}
