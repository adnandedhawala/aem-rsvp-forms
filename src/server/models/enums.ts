// Copied from aem-shared (read-only copy).
export enum MemberType {
	HOF = "HOF",
	FM = "FM",
}
export enum MisaqStatus {
	DONE = "Done",
	NOT_DONE = "Not Done",
}
export enum MaritalStatus {
	SINGLE = "Single",
	MARRIED = "Married",
	DIVORCED = "Divorced",
	WIDOWED = "Widowed",
}
export enum Gender {
	MALE = "Male",
	FEMALE = "Female",
}
export enum UserRole {
	Masool = "Masool",
	Masoola = "Masoola",
	Musaid = "Musaid",
	Musaida = "Musaida",
	Umoor = "Umoor",
	Admin = "Admin",
	User = "User",
}
export enum AEMApps {
	ZMQ = "zmq",
	AUTH = "auth",
	ESCALATION = "escalation",
	DISTRIBUTION = "distribution",
}
export const permissions = {
	VIEW_ZMQ_EVENT: "viewZMQEvent",
	VIEW_ZMQ_ACCOMODATION: "viewZMQAccomodation",
	CREATE_EDIT_ZMQ_ACCOMODATION: "createEditZMQAccomodation",
};
