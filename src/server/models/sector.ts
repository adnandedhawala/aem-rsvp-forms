import mongoose, { type Model, model, Schema } from "mongoose";

// Read-only copy of aem-shared's sector model.
export interface ISector {
	name: string;
	primary_color?: string;
	secondary_color?: string;
	masool_name?: string;
	masool_contact?: string;
	masool_its?: string;
	masoola_name?: string;
	masoola_contact?: string;
	masoola_its?: string;
	bounds?: { lat: number; lang: number }[];
	sub_sector_id?: string[];
}

export const sectorSchema = new Schema(
	{
		name: { type: String, required: [true, "Sector name is missing"] },
		primary_color: { type: String },
		secondary_color: { type: String },
		masool_name: { type: String },
		masool_contact: { type: String },
		masool_its: { type: String },
		masoola_name: { type: String },
		masoola_contact: { type: String },
		masoola_its: { type: String },
		bounds: [{ lat: { type: Number }, lang: { type: Number } }],
		sub_sector_id: [{ type: String, ref: "Subsector" }],
	},
	{ timestamps: true },
);

export const Sector = (mongoose.models.Sector ||
	model("Sector", sectorSchema, "sector")) as Model<ISector>;
