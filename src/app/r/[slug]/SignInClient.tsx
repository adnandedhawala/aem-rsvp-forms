"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { bigButtonStyle, IntroCard, PublicPage } from "@/components/PublicPage";
import { ApiError, api } from "@/lib/api";
import { formatDate } from "@/lib/format";

interface RsvpInfo {
	slug: string;
	title: string;
	description?: string;
	opensAt: string;
	closesAt: string;
	status: "upcoming" | "open" | "closed";
	signInIts: "hof" | "member" | "either";
}

// A close date more than a year away is a placeholder for "open until the
// admin closes it", so households don't see it.
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
function showsCloseDate(closesAt: string): boolean {
	return new Date(closesAt).getTime() - Date.now() < YEAR_MS;
}

const ITS_LABEL = {
	hof: "HOF ITS",
	member: "Your ITS",
	either: "ITS ID",
};

export function SignInClient({ slug }: { slug: string }) {
	const router = useRouter();
	const info = useQuery({
		queryKey: ["rsvp", slug],
		queryFn: () => api<RsvpInfo>(`/api/v1/rsvp/${slug}`),
	});
	const signIn = useMutation({
		mutationFn: (v: { fileNo: string; its: string }) =>
			api(`/api/v1/rsvp/${slug}/sign-in`, { method: "POST", body: v }),
		onSuccess: () => router.push(`/r/${slug}/form`),
	});

	const d = info.data;
	return (
		<PublicPage>
			<IntroCard title={d?.title} description={d?.description}>
				{info.isPending && <p className="m-0 text-slate-600">Loading…</p>}
				{info.error && (
					<Alert
						type="error"
						message={
							info.error instanceof ApiError && info.error.status === 404
								? "RSVP not found"
								: info.error.message
						}
					/>
				)}
				{d?.status === "upcoming" && (
					<Alert
						type="info"
						message={`Not open yet. Opens ${formatDate(d.opensAt)}`}
					/>
				)}
				{d?.status === "closed" && (
					<Alert type="warning" message="This RSVP is closed" />
				)}
				{d?.status === "open" && (
					<>
						{showsCloseDate(d.closesAt) && (
							<p className="m-0 mb-3 text-sm text-slate-500">
								Closes {formatDate(d.closesAt)}
							</p>
						)}
						<Form
							layout="vertical"
							onFinish={(v) => signIn.mutate(v)}
							requiredMark={false}
						>
							<Form.Item
								label={ITS_LABEL[d.signInIts]}
								name="its"
								rules={[{ required: true, message: "Enter the ITS number" }]}
							>
								<Input inputMode="numeric" size="large" autoComplete="off" />
							</Form.Item>
							<Form.Item
								label="File No"
								name="fileNo"
								rules={[{ required: true, message: "Enter your file number" }]}
							>
								<Input inputMode="numeric" size="large" autoComplete="off" />
							</Form.Item>
							{signIn.error && (
								<Alert
									className="mb-4"
									type="error"
									message={signIn.error.message}
								/>
							)}
							<Button
								type="primary"
								htmlType="submit"
								size="large"
								block
								loading={signIn.isPending}
								style={bigButtonStyle}
							>
								Continue
							</Button>
						</Form>
					</>
				)}
			</IntroCard>
		</PublicPage>
	);
}
