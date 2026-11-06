import mongoose, { type Model, model, Schema } from "mongoose";

export interface IRsvpEntry {
	rsvp: string;
	kind: "member" | "household" | "control" | "viewer";
	file_id: string;
	tanzeem_file_no: number;
	member_id: string | null;
	invited_by: string | null;
	is_removed: boolean;
	data: Record<string, unknown> | null;
	submitted_by_its: string | null;
	submitted_via: "household" | "admin" | null;
	submitted_at: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export const rsvpEntrySchema = new Schema<IRsvpEntry>(
	{
		rsvp: { type: String, required: true },
		kind: {
			type: String,
			enum: ["member", "household", "control", "viewer"],
			required: true,
		},
		file_id: { type: String, required: true },
		tanzeem_file_no: { type: Number, required: true },
		member_id: { type: String, default: null },
		invited_by: { type: String, default: null },
		is_removed: { type: Boolean, default: false },
		data: { type: Schema.Types.Mixed, default: null },
		submitted_by_its: { type: String, default: null },
		submitted_via: {
			type: String,
			enum: ["household", "admin", null],
			default: null,
		},
		submitted_at: { type: Date, default: null },
	},
	{ timestamps: true, collection: "rsvp_entry" },
);

rsvpEntrySchema.index(
	{ rsvp: 1, kind: 1, file_id: 1, member_id: 1 },
	{ unique: true },
);
rsvpEntrySchema.index({ rsvp: 1, tanzeem_file_no: 1 });

export const RsvpEntry = (mongoose.models.RsvpEntry ||
	model<IRsvpEntry>("RsvpEntry", rsvpEntrySchema)) as Model<IRsvpEntry>;
