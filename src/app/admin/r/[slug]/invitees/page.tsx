import { InviteesClient } from "./InviteesClient";

export default async function Page({
	params,
}: PageProps<"/admin/r/[slug]/invitees">) {
	const { slug } = await params;
	return <InviteesClient slug={slug} />;
}
