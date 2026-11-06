"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input } from "antd";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
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
	either: "HOF or member ITS",
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

	let body: React.ReactNode;
	if (info.isPending) {
		body = <p className="text-zinc-600">Loading…</p>;
	} else if (info.error) {
		const notFound =
			info.error instanceof ApiError && info.error.status === 404;
		body = (
			<Alert
				type="error"
				message={notFound ? "RSVP not found" : info.error.message}
			/>
		);
	} else {
		const d = info.data;
		body = (
			<>
				<h1 className="text-xl font-semibold">{d.title}</h1>
				{d.description && (
					<p className="whitespace-pre-line text-zinc-600">{d.description}</p>
				)}
				{d.status === "upcoming" && (
					<Alert
						type="info"
						message={`Not open yet. Opens ${formatDate(d.opensAt)}`}
					/>
				)}
				{d.status === "closed" && (
					<Alert type="warning" message="This RSVP is closed" />
				)}
				{d.status === "open" && (
					<>
						{showsCloseDate(d.closesAt) && (
							<p className="text-sm text-zinc-500">
								Closes {formatDate(d.closesAt)}
							</p>
						)}
						<Form
							layout="vertical"
							onFinish={(v) => signIn.mutate(v)}
							requiredMark={false}
						>
							<Form.Item
								label="File No"
								name="fileNo"
								rules={[{ required: true, message: "Enter your file number" }]}
							>
								<Input inputMode="numeric" size="large" autoComplete="off" />
							</Form.Item>
							<Form.Item
								label={ITS_LABEL[d.signInIts]}
								name="its"
								rules={[{ required: true, message: "Enter the ITS number" }]}
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
							>
								Continue
							</Button>
						</Form>
					</>
				)}
			</>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
			<div className="flex justify-center">
				<Logo />
			</div>
			{body}
		</main>
	);
}
