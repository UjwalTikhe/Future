import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import cookieParser from "cookie-parser";
import { communitySessions, communityUsers } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();
const SESSION_COOKIE = "mci_staff_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, { email: string; expiresAt: number }>();
const studentSessions = new Map<string, { userId: string; expiresAt: number }>();
const STUDENT_COOKIE = "mci_student_session";
const STUDENT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

router.use(cookieParser());

function configuredAdminEmail() {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

function passwordMatches(password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword) return false;

  const salt = process.env.ADMIN_PASSWORD_SALT ?? "mindful-campus-mvp";
  const expected = scryptSync(configuredPassword, salt, 32);
  const received = scryptSync(password, salt, 32);
  return timingSafeEqual(expected, received);
}

function currentSession(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

async function database() {
  if (!process.env.DATABASE_URL) return null;
  try { return (await import("@workspace/db")).db; } catch { return null; }
}

async function ensureStudentSchema(db: any) {
  await db.execute(sql.raw(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS community_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE, email text NOT NULL UNIQUE, password_hash text NOT NULL, interests text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS interests text NOT NULL DEFAULT '';
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS community_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL);
  `));
}

function hashPassword(password: string) {
  return scryptSync(password, process.env.ADMIN_PASSWORD_SALT ?? "mindful-campus-student-salt", 32).toString("hex");
}

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function studentCookieOptions() { return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: STUDENT_TTL_MS, path: "/" }; }

async function currentStudent(req: Request) {
  const token = req.cookies?.[STUDENT_COOKIE];
  if (!token) return null;
  const fallback = studentSessions.get(token);
  if (fallback && fallback.expiresAt > Date.now()) return fallback.userId;
  const db = await database();
  if (!db) return null;
  await ensureStudentSchema(db);
  const row = (await db.select({ userId: communitySessions.userId }).from(communitySessions).where(eq(communitySessions.tokenHash, hashToken(token))).limit(1))[0];
  return row?.userId ?? null;
}

export async function requireStudent(req: Request, res: Parameters<Parameters<IRouter["get"]>[1]>[1]) {
  const userId = await currentStudent(req);
  if (!userId) { res.status(401).json({ message: "Sign in to join the community." }); return null; }
  return userId;
}

async function setStudentSession(userId: string, res: Parameters<Parameters<IRouter["get"]>[1]>[1]) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + STUDENT_TTL_MS;
  studentSessions.set(token, { userId, expiresAt });
  const db = await database();
  if (db) await db.insert(communitySessions).values({ userId, tokenHash: hashToken(token), expiresAt: new Date(expiresAt) });
  res.cookie(STUDENT_COOKIE, token, studentCookieOptions());
}

router.get("/auth/student/me", async (req, res) => {
  const userId = await currentStudent(req);
  if (!userId) { res.status(401).json({ authenticated: false }); return; }
  const db = await database();
  if (!db) { res.json({ authenticated: true, user: { id: userId, username: "student" } }); return; }
  const user = (await db.select({ id: communityUsers.id, username: communityUsers.username, email: communityUsers.email, interests: communityUsers.interests, bio: communityUsers.bio }).from(communityUsers).where(eq(communityUsers.id, userId)).limit(1))[0];
  if (!user) { res.status(401).json({ authenticated: false }); return; }
  res.json({ authenticated: true, user });
});

router.post("/auth/student/register", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const interests = Array.isArray(req.body?.interests) ? req.body.interests.filter((item: unknown) => typeof item === "string").slice(0, 8).join(",") : "";
  if (!email || !username || password.length < 8) { res.status(400).json({ message: "Use a valid email, username, and 8-character password." }); return; }
  const db = await database();
  if (!db) { res.status(503).json({ message: "Student accounts need the database to be connected." }); return; }
  try {
    const user = (await db.insert(communityUsers).values({ email, username, passwordHash: hashPassword(password), interests }).returning({ id: communityUsers.id, username: communityUsers.username, email: communityUsers.email, interests: communityUsers.interests, bio: communityUsers.bio }))[0];
    await setStudentSession(user.id, res);
    res.status(201).json({ authenticated: true, user });
  } catch { res.status(409).json({ message: "That email or username is already in use." }); }
});

router.post("/auth/student/login", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const db = await database();
  if (!db) { res.status(503).json({ message: "Student accounts need the database to be connected." }); return; }
  await ensureStudentSchema(db);
  await ensureStudentSchema(db);
  const user = (await db.select().from(communityUsers).where(eq(communityUsers.email, email)).limit(1))[0];
  if (!user || !timingSafeEqual(Buffer.from(user.passwordHash, "hex"), Buffer.from(hashPassword(password), "hex"))) { res.status(401).json({ message: "Email or password is incorrect." }); return; }
  await setStudentSession(user.id, res);
  res.json({ authenticated: true, user: { id: user.id, username: user.username, email: user.email, interests: user.interests, bio: user.bio } });
});

router.post("/auth/student/logout", async (req, res) => {
  const token = req.cookies?.[STUDENT_COOKIE];
  if (token) { studentSessions.delete(token); const db = await database(); if (db) await db.delete(communitySessions).where(eq(communitySessions.tokenHash, hashToken(token))); }
  res.clearCookie(STUDENT_COOKIE, studentCookieOptions());
  res.status(204).send();
});

router.get("/auth/me", (req, res) => {
  const session = currentSession(req);
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, user: { email: session.email, role: "admin" } });
});

router.post("/auth/login", (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const adminEmail = configuredAdminEmail();

  if (!adminEmail || !process.env.ADMIN_PASSWORD) {
    res.status(503).json({ message: "Staff authentication is not configured on the server." });
    return;
  }

  if (email !== adminEmail || !passwordMatches(password)) {
    res.status(401).json({ message: "Those staff credentials were not recognized." });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  sessions.set(token, { email, expiresAt: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
  res.json({ authenticated: true, user: { email, role: "admin" } });
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  res.status(204).send();
});

export default router;
