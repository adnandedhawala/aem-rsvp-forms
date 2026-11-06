import mongoose, { type Model, model, Schema } from "mongoose";
import { AEMApps, permissions, type UserRole } from "./enums";

// Read-only copy of aem-shared's user model. Passwords are plain text, as in aem-auth.
export interface IUser {
	name: string;
	email?: string;
	contact?: string;
	password: string;
	userRole: UserRole[];
	assignedArea?: string[];
	assignedUmoor?: string[];
	assignedApps?: AEMApps[];
	itsId: number;
	permissions?: string[];
}

export const userSchema = new Schema<IUser>(
	{
		name: { type: String, required: [true, "name is missing"] },
		email: { type: String },
		contact: { type: String },
		password: { type: String, required: [true, "password is missing"] },
		userRole: [{ type: String, required: [true, "user role is missing"] }],
		assignedArea: [
			{ type: String, required: [true, "assigned area is missing"] },
		],
		assignedUmoor: [
			{ type: String, required: [true, "assigned umoor is missing"] },
		],
		itsId: { type: Number, required: true },
		assignedApps: [{ type: String, enum: Object.values(AEMApps) }],
		permissions: [{ type: String, enum: Object.values(permissions) }],
	},
	{ timestamps: true },
);

export const User = (mongoose.models.User ||
	model("User", userSchema, "user")) as Model<IUser>;
