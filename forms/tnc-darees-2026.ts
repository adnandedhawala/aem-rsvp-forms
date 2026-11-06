import { defineForm } from "./_fields";

export default defineForm({
	slug: "tnc-darees-2026",
	title: "Darees: Friday 13 November 2026",
	description: [
		"Anjuman E Ezzi, Marol Jamaat aapne maal ikram sathe 13th November 2026 Friday Darees nu izan pesh kariye chhe.",
		"",
		"Time: 7.30 PM",
		"Venue: Saifee Masjid Sahen, Marol",
		"",
		"Darees baad salawaat na jaman nu izan che.",
		"",
		"Aap na si adaban iltemas che ke aap RSVP ma aapnu confirmation aapiye.",
	].join("\n"),
	opensAt: "2026-11-06T00:00:00+05:30",
	// No fixed close date: the admin closes it by setting closesAt and redeploying.
	closesAt: "2099-12-31T23:59:59+05:30",
	signIn: { its: "either", mustBeInvited: true },
	memberFields: [
		{
			name: "attending",
			label: "Will you attend the Darees and jaman?",
			type: "radio",
			options: ["Yes", "No"],
			required: true,
		},
	],
	showMemberInfo: ["full_name", "age", "gender"],
});
