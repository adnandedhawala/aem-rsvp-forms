import { FormClient } from "./FormClient";

export default async function Page({ params }: PageProps<"/r/[slug]/form">) {
	const { slug } = await params;
	return <FormClient slug={slug} />;
}
