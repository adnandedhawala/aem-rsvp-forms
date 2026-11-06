"use client";

import { useMutation } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";

export function LoginClient() {
	const router = useRouter();
	const next = useSearchParams().get("next");
	const login = useMutation({
		mutationFn: (v: { identifier: string; password: string }) =>
			api("/api/v1/admin/login", { method: "POST", body: v }),
		onSuccess: () =>
			router.replace(next?.startsWith("/admin") ? next : "/admin"),
	});

	return (
		<main className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-sm">
				<div className="mb-4 flex flex-col items-center gap-2">
					<Logo />
					<h1 className="m-0 text-lg font-semibold">Admin sign in</h1>
				</div>
				<Form
					layout="vertical"
					requiredMark={false}
					onFinish={(v) => login.mutate(v)}
				>
					<Form.Item
						label="ITS or email"
						name="identifier"
						rules={[{ required: true, message: "Enter your ITS or email" }]}
					>
						<Input size="large" autoComplete="username" />
					</Form.Item>
					<Form.Item
						label="Password"
						name="password"
						rules={[{ required: true, message: "Enter your password" }]}
					>
						<Input.Password size="large" autoComplete="current-password" />
					</Form.Item>
					{login.error && (
						<Alert
							className="mb-4"
							type="error"
							message={login.error.message}
						/>
					)}
					<Button
						type="primary"
						htmlType="submit"
						size="large"
						block
						loading={login.isPending}
					>
						Sign in
					</Button>
				</Form>
			</Card>
		</main>
	);
}
