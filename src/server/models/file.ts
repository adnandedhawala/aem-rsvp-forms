import mongoose, { type Model, model, Schema } from "mongoose";

// Read-only copy of aem-shared's file model. The schema field is `sub_sector`.
export interface IFile {
	_id: string;
	address?: string;
	building?: string;
	floor?: string;
	flat_no?: string;
	fmb_status?: string;
	tanzeem_file_no?: number;
	hof_name?: string;
	member_ids?: string[];
	sub_sector?: {
		name: string;
		_id: string;
		sector: {
			_id: string;
			name: string;
			primary_color: string;
			secondary_color: string;
		};
	};
	no_of_males?: number;
	no_of_females?: number;
}

export const fileSchema = new Schema(
	{
		_id: { type: String },
		thali_taking: { type: String },
		address: { type: String },
		building: { type: String },
		floor: { type: String },
		flat_no: { type: String },
		fmb_status: { type: String },
		tanzeem_file_no: { type: Number },
		hof_name: { type: String },
		member_ids: [{ type: String, ref: "Member" }],
		sub_sector: {
			name: { type: String },
			_id: { type: String, ref: "Subsector" },
			sector: {
				_id: { type: String, ref: "Sector" },
				name: { type: String },
				primary_color: { type: String },
				secondary_color: { type: String },
			},
		},
		no_of_males: { type: Number },
		no_of_females: { type: Number },
	},
	{ timestamps: true },
);

export const File = (mongoose.models.File ||
	model("File", fileSchema, "file")) as Model<IFile>;
