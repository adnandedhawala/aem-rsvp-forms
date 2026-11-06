import { ResponsesClient } from "./ResponsesClient";

export default async function Page({
	params,
}: PageProps<"/admin/r/[slug]/responses">) {
	const { slug } = await params;
	return <ResponsesClient slug={slug} />;
}
