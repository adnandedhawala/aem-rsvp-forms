import { expect, test } from "@playwright/test";

test("admin flow", async ({ page }) => {
	await page.goto("/admin");
	await expect(page).toHaveURL(/\/admin\/login/);

	await page.getByLabel("ITS or email").fill("30000002");
	await page.getByLabel("Password").fill("secret");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByText("Not an admin")).toBeVisible();

	await page.getByLabel("ITS or email").fill("30000001");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByText("Sample RSVP")).toBeVisible();

	await page.goto("/admin/r/sample-rsvp/responses");
	await expect(
		page.locator("[row-id='10000002']").filter({ hasText: "Answered" }).first(),
	).toBeVisible();

	await page.goto("/admin/r/sample-rsvp/household/101");
	await expect(page.getByText("Editing as admin")).toBeVisible();
	const card = page.getByTestId("card-10000002");
	await card.getByText("Yes", { exact: true }).click();
	await card.locator(".ant-select").click();
	await page.locator(".ant-select-item-option[title='1-3']").click();
	await page.getByRole("button", { name: "Submit" }).click();
	await expect(page).toHaveURL(/\/responses$/);
	const res = await page.request.get(
		"/api/v1/admin/rsvp/sample-rsvp/responses",
	);
	const { rows } = await res.json();
	const saved = rows.find((r: { its: string }) => r.its === "10000002");
	expect(saved).toMatchObject({
		submitted_via: "admin",
		answers: { attending: "Yes", days: "1-3" },
	});

	await page.goto("/admin/r/sample-rsvp/invitees");
	const firstRow = page.getByRole("grid").first().getByRole("row").nth(1);
	const cell = (n: number) => firstRow.getByRole("gridcell").nth(n);
	await cell(0).click();
	await page.keyboard.type("101");
	await page.keyboard.press("Enter");
	await cell(1).click();
	await page.keyboard.type("10000003");
	await page.keyboard.press("Enter");
	await page.getByRole("button", { name: "Check rows" }).click();
	await expect(cell(6)).toHaveText("OK");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText(/Added 1/)).toBeVisible();
});
