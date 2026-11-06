import mongoose, { type Model, model, Schema } from "mongoose";

// Read-only copy of aem-shared's subsector model.
export interface ISubsector {
	name: string;
	musaid_name?: string;
	musaid_contact?: string;
	musaid_its?: string;
	musaida_name?: string;
	musaida_contact?: string;
	musaida_its?: string;
	latlng?: number[];
	no_of_males?: number;
	no_of_females?: number;
	files?: string[];
	sector?: {
		_id: string;
		name: string;
		primary_color?: string;
		secondary_color?: string;
	};
}

export const subSectorSchema = new Schema(
	{
		name: { type: String, required: true },
		musaid_name: { type: String },
		musaid_contact: { type: String },
		musaid_its: { type: String },
		musaida_name: { type: String },
		musaida_contact: { type: String },
		musaida_its: { type: String },
		latlng: [{ type: Number }],
		no_of_males: { type: Number },
		no_of_females: { type: Number },
		files: [{ type: String, ref: "File" }],
		sector: {
			_id: { type: String, ref: "Sector" },
			name: { type: String },
			primary_color: { type: String },
			secondary_color: { type: String },
		},
	},
	{ timestamps: true },
);

export const Subsector = (mongoose.models.Subsector ||
	model("Subsector", subSectorSchema, "subsector")) as Model<ISubsector>;
