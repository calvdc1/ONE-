import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

type UserRec = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  campus?: string | null;
  createdAt: number;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  followers: string[];
  following: string[];
};

type DB = {
  users: UserRec[];
};

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "db.json");

async function ensureDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {}
}

async function loadDB(): Promise<DB> {
  await ensureDir();
  try {
    const buf = await fs.readFile(dbPath);
    return JSON.parse(buf.toString("utf8"));
  } catch {
    return { users: [] };
  }
}

async function saveDB(db: DB) {
  await ensureDir();
  await fs.writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function hashPassword(pw: string, salt?: string) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, s, 64).toString("hex");
  return `${s}:${hash}`;
}

function verifyPassword(pw: string, stored: string) {
  const [s, h] = stored.split(":");
  const calc = crypto.scryptSync(pw, s, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(calc, "hex"));
}

function publicUser(u: UserRec) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    username: u.username,
    bio: u.bio,
    location: u.location,
    website: u.website,
    campus: u.campus ?? null,
    createdAt: u.createdAt,
    avatarUrl: u.avatarUrl ?? null,
    coverUrl: u.coverUrl ?? null,
    followers: u.followers,
    following: u.following
  };
}

async function findUserByEmail(email: string) {
  const db = await loadDB();
  return db.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function createUser(email: string, password: string, displayName?: string) {
  const db = await loadDB();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) return null;
  const id = crypto.randomUUID();
  const ph = hashPassword(password);
  const name = displayName?.trim() || email.split("@")[0];
  const now = Date.now();
  const rec: UserRec = {
    id,
    email,
    passwordHash: ph,
    displayName: name,
    username: name,
    bio: "Welcome to my profile!",
    location: "Unknown",
    website: "",
    campus: null,
    createdAt: now,
    avatarUrl: null,
    coverUrl: null,
    followers: [],
    following: []
  };
  db.users.push(rec);
  await saveDB(db);
  return rec;
}

async function updateUser(id: string, patch: Partial<UserRec>) {
  const db = await loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  const next = { ...db.users[idx], ...patch };
  db.users[idx] = next;
  await saveDB(db);
  return next;
}

export const store = {
  loadDB,
  saveDB,
  findUserByEmail,
  createUser,
  updateUser,
  verifyPassword,
  publicUser
};
