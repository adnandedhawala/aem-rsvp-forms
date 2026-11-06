import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import {
	File,
	Member,
	RsvpEntry,
	Sector,
	Subsector,
	User,
} from "@/server/models";

let repl: MongoMemoryReplSet | null = null;

export async function startTestDb(
	opts: { uri?: string } = {},
): Promise<string> {
	let uri = opts.uri;
	if (!uri) {
		repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
		uri = repl.getUri();
	}
	await mongoose.connect(uri, { dbName: "aem-dev" });
	await RsvpEntry.syncIndexes();
	return uri;
}

export async function stopTestDb(): Promise<void> {
	await mongoose.disconnect();
	if (repl) await repl.stop();
	repl = null;
}

export async function clearDb(): Promise<void> {
	await Promise.all([
		Member.deleteMany({}),
		File.deleteMany({}),
		Sector.deleteMany({}),
		Subsector.deleteMany({}),
		User.deleteMany({}),
		RsvpEntry.deleteMany({}),
	]);
}

const subSector = {
	_id: "ss1",
	name: "SS One",
	sector: {
		_id: "s1",
		name: "Sector One",
		primary_color: "#000",
		secondary_color: "#fff",
	},
};

export async function seedBasic(): Promise<void> {
	await File.insertMany([
		{
			_id: "10000001",
			tanzeem_file_no: 101,
			hof_name: "Hof A",
			member_ids: ["10000001", "10000002", "10000003"],
			sub_sector: subSector,
		},
		{
			_id: "20000001",
			tanzeem_file_no: 202,
			hof_name: "Hof B",
			member_ids: ["20000001", "20000002"],
			sub_sector: subSector,
		},
	]);
	const m = (
		id: string,
		hof: string,
		type: "HOF" | "FM",
		gender: string,
		age: number,
	) => ({
		_id: id,
		full_name: `Member ${id}`,
		hof_fm_type: type,
		gender,
		age,
		hof_id: hof,
	});
	await Member.insertMany([
		m("10000001", "10000001", "HOF", "Male", 50),
		m("10000002", "10000001", "FM", "Female", 45),
		m("10000003", "10000001", "FM", "Male", 12),
		m("20000001", "20000001", "HOF", "Male", 40),
		m("20000002", "20000001", "FM", "Female", 38),
	]);
	await User.insertMany([
		{
			itsId: 30000001,
			email: "admin@test.local",
			password: "secret",
			userRole: ["Admin"],
			name: "Admin One",
		},
		{
			itsId: 30000002,
			email: "masool@test.local",
			password: "secret",
			userRole: ["Masool"],
			name: "Masool One",
		},
	]);
}

export async function invite(
	slug: string,
	its: string[],
	opts: { removed?: boolean } = {},
): Promise<void> {
	for (const id of its) {
		const member = await Member.findById(id).lean();
		if (!member?.hof_id) throw new Error(`invite: unknown member ${id}`);
		const file = await File.findById(member.hof_id).lean();
		if (!file) throw new Error(`invite: no file for member ${id}`);
		await RsvpEntry.create({
			rsvp: slug,
			kind: "member",
			file_id: file._id,
			tanzeem_file_no: file.tanzeem_file_no,
			member_id: id,
			is_removed: opts.removed ?? false,
		});
	}
}
