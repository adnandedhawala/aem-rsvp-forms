import { AdminHouseholdClient } from "./AdminHouseholdClient";

export default async function Page({
	params,
}: PageProps<"/admin/r/[slug]/household/[fileNo]">) {
	const { slug, fileNo } = await params;
	return <AdminHouseholdClient slug={slug} fileNo={fileNo} />;
}
