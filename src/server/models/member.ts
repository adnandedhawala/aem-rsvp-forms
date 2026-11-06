import mongoose, { type Model, model, Schema } from "mongoose";
import { Gender, MaritalStatus, MemberType, MisaqStatus } from "./enums";

// Read-only copy of aem-shared's member model.
export interface IMember {
	_id: string;
	full_name: string;
	first_prefix?: string;
	hof_fm_type: MemberType;
	misaq?: MisaqStatus;
	marital_status?: MaritalStatus;
	age?: number;
	gender?: Gender;
	idara?: string;
	email?: string;
	occupation?: string;
	title?: string;
	mobile?: string;
	qualification?: string;
	quran_sanad?: string;
	sub_occupation?: string;
	hof_id?: string;
}

export const memberSchema = new Schema(
	{
		_id: { type: String },
		full_name: { type: String },
		first_prefix: { type: String },
		hof_fm_type: { type: String, enum: Object.values(MemberType) },
		misaq: { type: String, enum: Object.values(MisaqStatus) },
		marital_status: { type: String, enum: Object.values(MaritalStatus) },
		age: { type: Number },
		gender: { type: String, enum: Object.values(Gender) },
		idara: { type: String },
		email: { type: String },
		occupation: { type: String },
		title: { type: String },
		mobile: { type: String },
		qualification: { type: String },
		quran_sanad: { type: String },
		sub_occupation: { type: String },
		hof_id: { type: String, ref: "File" },
	},
	{ timestamps: true },
);

export const Member = (mongoose.models.Member ||
	model("Member", memberSchema, "member")) as Model<IMember>;
