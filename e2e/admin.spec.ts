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
	// Click away without Enter: the value must still commit, and the row is
	// looked up on its own (no "Check rows" click)
	await page.getByRole("heading", { name: "Add invitees" }).click();
	await expect(cell(6)).toHaveText("OK");
	await expect(cell(2)).not.toHaveText("");
	// ITS only: the file no is filled in from the ITS
	const row2 = page.getByRole("grid").first().getByRole("row").nth(2);
	await row2.getByRole("gridcell").nth(1).click();
	await page.keyboard.type("20000002");
	await page.keyboard.press("Enter");
	await expect(row2.getByRole("gridcell").nth(6)).toHaveText("OK");
	await expect(row2.getByRole("gridcell").nth(0)).toHaveText("202");
	// "Check rows" drops the empty rows: only the header and the two filled remain
	await page.getByRole("button", { name: "Check rows" }).click();
	await expect(page.getByRole("grid").first().getByRole("row")).toHaveCount(3);
	await expect(cell(6)).toHaveText("OK");
	await page.getByRole("button", { name: "Save" }).click();
	await expect(page.getByText(/Added 2/)).toBeVisible();
});

test("invitee grid selects ranges and pastes into many cells", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.goto("/admin/login");
	await page.getByLabel("ITS or email").fill("30000001");
	await page.getByLabel("Password").fill("secret");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page.getByText("Sample RSVP")).toBeVisible();

	await page.goto("/admin/r/sample-rsvp/invitees");
	const grid = page.getByRole("grid").first();
	const cell = (row: number, col: number) =>
		grid.getByRole("row").nth(row).getByRole("gridcell").nth(col);

	// Drag from row 1 File No to row 3 ITS: a 3 x 2 range
	const from = await cell(1, 0).boundingBox();
	const to = await cell(3, 1).boundingBox();
	if (!from || !to) throw new Error("grid cells not laid out");
	await page.mouse.move(from.x + 10, from.y + 10);
	await page.mouse.down();
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
		steps: 10,
	});
	await page.mouse.up();
	await expect(grid.locator(".ag-cell-range-selected")).toHaveCount(6);

	// Paste a 2 x 2 block from Excel starting at the focused cell
	await cell(1, 0).click();
	await page.evaluate(() =>
		navigator.clipboard.writeText("101\t10000003\n202\t20000002\n"),
	);
	await page.keyboard.press("ControlOrMeta+v");
	await expect(cell(1, 0)).toHaveText("101");
	await expect(cell(1, 1)).toHaveText("10000003");
	await expect(cell(2, 0)).toHaveText("202");
	await expect(cell(2, 1)).toHaveText("20000002");
	await expect(cell(1, 6)).toHaveText(/OK|Already invited/);
});

test("admin closes and reopens an RSVP", async ({ page }) => {
	await page.goto("/admin/login");
	await page.getByLabel("ITS or email").fill("30000001");
	await page.getByLabel("Password").fill("secret");
	await page.getByRole("button", { name: "Sign in" }).click();
	const row = page.getByRole("row").filter({ hasText: "Sample RSVP" });
	await row.getByRole("button", { name: "Close" }).click();
	await page.getByRole("button", { name: "Close RSVP" }).click();
	await expect(row.getByText("closed (by admin)")).toBeVisible();

	const info = await page.request.get("/api/v1/rsvp/sample-rsvp");
	expect((await info.json()).status).toBe("closed");
	// A fresh page with no admin cookie sees what a household sees
	const visitor = await page.context().browser()?.newPage();
	if (!visitor) throw new Error("no browser");
	await visitor.goto(new URL("/r/sample-rsvp", page.url()).toString());
	await expect(visitor.getByText("This RSVP is closed")).toBeVisible();
	await visitor.close();

	await row.getByRole("button", { name: "Reopen" }).click();
	await page
		.getByRole("dialog")
		.getByRole("button", { name: "Reopen" })
		.click();
	await expect(row.getByText("open", { exact: true })).toBeVisible();
	const again = await page.request.get("/api/v1/rsvp/sample-rsvp");
	expect((await again.json()).status).toBe("open");
});
