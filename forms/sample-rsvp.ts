import { defineForm } from "./_fields";

export default defineForm({
	slug: "sample-rsvp",
	title: "Sample RSVP",
	description: "Please fill for every member listed.",
	opensAt: "2026-01-01T00:00:00+05:30",
	closesAt: "2030-12-31T23:59:59+05:30",
	signIn: { its: "either", mustBeInvited: false },
	householdFields: [
		{
			name: "mehmaan_count",
			label: "Number of guests",
			type: "number",
			min: 0,
			max: 20,
		},
	],
	memberFields: [
		{
			name: "attending",
			label: "Will attend?",
			type: "radio",
			options: ["Yes", "No"],
			required: true,
		},
		{
			name: "days",
			label: "Which days?",
			type: "select",
			options: ["1-3", "4-6", "7-9", "All"],
			required: true,
			visibleIf: (v) => v.attending === "Yes",
		},
		{
			name: "needs_wheelchair",
			label: "Needs wheelchair access",
			type: "checkbox",
		},
		{ name: "notes", label: "Notes", type: "text", maxLength: 200 },
	],
	showMemberInfo: ["full_name", "age", "gender"],
});
