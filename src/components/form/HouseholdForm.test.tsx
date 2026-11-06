// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HouseholdView } from "@/server/services/households";
import { HouseholdForm } from "./HouseholdForm";

afterEach(cleanup);

const member = (its: string, data: Record<string, unknown> | null = null) => ({
	its,
	full_name: `Member ${its}`,
	age: 30,
	gender: "Male",
	data,
	submitted_at: null,
});
const view = (first: Record<string, unknown> | null = null): HouseholdView => ({
	slug: "sample-rsvp",
	fileId: "10000001",
	fileNo: 101,
	hofName: "Hof A",
	sector: null,
	subsector: null,
	household: { data: null, submitted_at: null },
	members: [member("10000001", first), member("10000002")],
	lastSavedAt: null,
});

const setup = (props: Partial<Parameters<typeof HouseholdForm>[0]> = {}) => {
	const onSubmit = vi.fn();
	render(
		<HouseholdForm
			formSlug="sample-rsvp"
			view={view()}
			mode="household"
			submitting={false}
			onSubmit={onSubmit}
			{...props}
		/>,
	);
	return onSubmit;
};

describe("HouseholdForm", () => {
	it("renders a card per household and member", () => {
		setup();
		expect(screen.getByTestId("card-household")).toBeInTheDocument();
		expect(screen.getByTestId("card-10000001")).toBeInTheDocument();
		expect(screen.getByTestId("card-10000002")).toBeInTheDocument();
		expect(screen.getByText("Member 10000001")).toBeInTheDocument();
		expect(screen.getByText("Member 10000002")).toBeInTheDocument();
	});
	it("shows conditional fields only after the trigger answer", async () => {
		setup();
		const card = within(screen.getByTestId("card-10000001"));
		expect(card.queryByText("Which days?")).toBeNull();
		await userEvent.click(card.getByText("Yes"));
		expect(card.getByText("Which days?")).toBeInTheDocument();
	});
	it("blocks submit and shows errors when required fields are empty", async () => {
		const onSubmit = setup();
		await userEvent.click(screen.getByRole("button", { name: /submit/i }));
		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getAllByText("Will attend? is required")).toHaveLength(2);
	});
	it("submits the validated payload", async () => {
		const onSubmit = setup();
		for (const its of ["10000001", "10000002"]) {
			await userEvent.click(
				within(screen.getByTestId(`card-${its}`)).getByText("No"),
			);
		}
		await userEvent.click(screen.getByRole("button", { name: /submit/i }));
		const a = { attending: "No", needs_wheelchair: false };
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit).toHaveBeenCalledWith({
			household: {},
			members: { "10000001": a, "10000002": a },
		});
	});
	it("prefills earlier answers", () => {
		setup({ view: view({ attending: "Yes", days: "All" }) });
		const card = within(screen.getByTestId("card-10000001"));
		expect(card.getByText("Which days?")).toBeInTheDocument();
		expect(card.getByText("All")).toBeInTheDocument();
		expect(card.getByLabelText("Yes")).toBeChecked();
	});
	it("shows server errors on the matching card", () => {
		setup({
			serverErrors: { members: { "10000002": { attending: "Not allowed" } } },
		});
		expect(
			within(screen.getByTestId("card-10000002")).getByText("Not allowed"),
		).toBeInTheDocument();
	});
	it("tags admin mode", () => {
		setup({ mode: "admin" });
		expect(screen.getByText("Editing as admin")).toBeInTheDocument();
	});
});
