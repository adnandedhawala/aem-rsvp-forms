import { expect, test } from "@playwright/test";

test("household signs in, answers, and edits", async ({ page }) => {
	await page.goto("/r/sample-rsvp");

	await page.getByLabel("ITS ID").fill("20000001");
	await page.getByLabel("File No").fill("101");
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page.getByText("File number and ITS don't match")).toBeVisible();

	await page.getByLabel("ITS ID").fill("10000002");
	await page.getByRole("button", { name: "Continue" }).click();
	await expect(page).toHaveURL(/\/r\/sample-rsvp\/form$/);
	for (const id of ["card-household", "card-10000001", "card-10000002"]) {
		await expect(page.getByTestId(id)).toBeVisible();
	}

	await page.getByRole("button", { name: "Submit" }).click();
	await expect(
		page.getByText("Will attend? is required").first(),
	).toBeVisible();

	const first = page.getByTestId("card-10000001");
	await first.getByText("Yes", { exact: true }).click();
	await first.locator(".ant-select").click();
	await page.locator(".ant-select-item-option[title='All']").click();
	await page
		.getByTestId("card-10000002")
		.getByText("No", { exact: true })
		.click();
	await page.getByTestId("card-household").getByRole("spinbutton").fill("2");
	await page.getByRole("button", { name: "Submit" }).click();

	await expect(page).toHaveURL(/\/done$/);
	await expect(page.getByText("Thank you")).toBeVisible();
	await expect(page.getByText("Which days?")).toBeVisible();
	await expect(page.getByText("All", { exact: true })).toBeVisible();

	await page.getByRole("link", { name: "Edit answers" }).click();
	await expect(page).toHaveURL(/\/form$/);
	await expect(
		page.getByTestId("card-10000001").getByRole("radio", { name: "Yes" }),
	).toBeChecked();
});
