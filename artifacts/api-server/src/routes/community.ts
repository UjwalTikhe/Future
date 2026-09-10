import { randomBytes } from "node:crypto";
import cookieParser from "cookie-parser";
import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import { communityMembers, communityMessages, communityReactions, communityReports, communityRooms, communityUsers } from "@workspace/db/schema";

const router: IRouter = Router();
const COMMUNITY_COOKIE = "mci_community_user";
const seededRooms = [
  { slug: "late-night-study", name: "Late Night Study", description: "Quiet accountability, study rituals, and getting started.", accent: "sage" },
  { slug: "music-makers", name: "Music Makers", description: "Share songs, jams, gear, and unfinished ideas.", accent: "amber" },
  { slug: "first-year-corner", name: "First Year Corner", description: "Questions, wins, and honest notes from the first year.", accent: "sky" },
  { slug: "creative-lab", name: "Creative Lab", description: "A home for sketches, writing, design, and experiments.", accent: "rose" },
];
const fallbackUsers = new Map<string, { id: string; username: string }>();
const fallbackRooms = seededRooms.map((room, index) => ({ ...room, id: `room-${index + 1}`, memberCount: [428, 186, 312, 94][index] }));
const fallbackMessages = new Map<string, Array<{ id: string; username: string; content: string; createdAt: string; reactions: number; replyCount: number }>>();
let schemaReady = false;

router.use(cookieParser());

async function database() {
  if (!process.env.DATABASE_URL) return null;
  try { return (await import("@workspace/db")).db; } catch { return null; }
}

function getIdentity(req: Request, res: Parameters<Parameters<IRouter["get"]>[1]>[1]) {
  const current = req.cookies?.[COMMUNITY_COOKIE];
  if (current && fallbackUsers.has(current)) return fallbackUsers.get(current)!;
  const id = randomBytes(12).toString("hex");
  const user = { id, username: `student${randomBytes(3).toString("hex")}` };
  fallbackUsers.set(id, user);
  res.cookie(COMMUNITY_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 24 * 365, path: "/" });
  return user;
}

async function seed(db: any) {
  if (!schemaReady) {
    await db.execute(sql.raw(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS community_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS community_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL, description text NOT NULL, accent text NOT NULL DEFAULT 'sage', created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS community_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id, user_id));
      CREATE TABLE IF NOT EXISTS community_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, content text NOT NULL, reply_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE IF NOT EXISTS community_reactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, emoji text NOT NULL DEFAULT 'heart', UNIQUE(message_id, user_id, emoji));
      CREATE TABLE IF NOT EXISTS community_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now());
    `));
    schemaReady = true;
  }
  const existing = await db.select({ id: communityRooms.id }).from(communityRooms).limit(1);
  if (existing.length) return;
  await db.insert(communityRooms).values(seededRooms);
}

router.get("/community/identity", (req, res) => {
  const identity = getIdentity(req, res);
  res.json(identity);
});

router.get("/community/rooms", async (req, res) => {
  const db = await database();
  if (!db) { res.json(fallbackRooms); return; }
  await seed(db);
  const rooms = await db.select({ id: communityRooms.id, slug: communityRooms.slug, name: communityRooms.name, description: communityRooms.description, accent: communityRooms.accent, memberCount: sql<number>`count(${communityMembers.id})` }).from(communityRooms).leftJoin(communityMembers, eq(communityMembers.roomId, communityRooms.id)).groupBy(communityRooms.id).orderBy(communityRooms.name);
  res.json(rooms.map((room) => ({ ...room, memberCount: Number(room.memberCount) })));
});

router.get("/community/rooms/:slug/messages", async (req, res) => {
  const db = await database();
  if (!db) { res.json(fallbackMessages.get(req.params.slug) ?? []); return; }
  await seed(db);
  const rows = await db.select({ id: communityMessages.id, username: communityUsers.username, content: communityMessages.content, createdAt: communityMessages.createdAt, replyCount: communityMessages.replyCount, reactions: sql<number>`count(${communityReactions.id})` }).from(communityMessages).innerJoin(communityRooms, eq(communityRooms.id, communityMessages.roomId)).innerJoin(communityUsers, eq(communityUsers.id, communityMessages.userId)).leftJoin(communityReactions, eq(communityReactions.messageId, communityMessages.id)).where(eq(communityRooms.slug, req.params.slug)).groupBy(communityMessages.id, communityUsers.username).orderBy(desc(communityMessages.createdAt)).limit(100);
  res.json(rows.map((row) => ({ ...row, reactions: Number(row.reactions) })).reverse());
});

router.post("/community/rooms/:slug/messages", async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content || content.length > 2000) { res.status(400).json({ message: "Messages must contain between 1 and 2000 characters." }); return; }
  const identity = getIdentity(req, res);
  const db = await database();
  if (!db) {
    const message = { id: `message-${Date.now()}`, username: identity.username, content, createdAt: new Date().toISOString(), reactions: 0, replyCount: 0 };
    fallbackMessages.set(req.params.slug, [ ...(fallbackMessages.get(req.params.slug) ?? []), message ]);
    res.status(201).json(message); return;
  }
  await seed(db);
  let user = (await db.select().from(communityUsers).where(eq(communityUsers.username, identity.username)).limit(1))[0];
  if (!user) user = (await db.insert(communityUsers).values({ username: identity.username }).returning())[0];
  const room = (await db.select().from(communityRooms).where(eq(communityRooms.slug, req.params.slug)).limit(1))[0];
  if (!room) { res.status(404).json({ message: "Community room not found." }); return; }
  const message = (await db.insert(communityMessages).values({ roomId: room.id, userId: user.id, content }).returning())[0];
  res.status(201).json({ ...message, username: user.username, reactions: 0 });
});

router.post("/community/rooms/:slug/join", async (req, res) => {
  const identity = getIdentity(req, res);
  const db = await database();
  if (!db) { res.json({ joined: true }); return; }
  await seed(db);
  let user = (await db.select().from(communityUsers).where(eq(communityUsers.username, identity.username)).limit(1))[0];
  if (!user) user = (await db.insert(communityUsers).values({ username: identity.username }).returning())[0];
  const room = (await db.select().from(communityRooms).where(eq(communityRooms.slug, req.params.slug)).limit(1))[0];
  if (!room) { res.status(404).json({ message: "Community room not found." }); return; }
  await db.insert(communityMembers).values({ roomId: room.id, userId: user.id }).onConflictDoNothing();
  res.json({ joined: true });
});

router.post("/community/messages/:id/react", async (req, res) => {
  const identity = getIdentity(req, res);
  const db = await database();
  if (!db) { res.json({ reacted: true }); return; }
  let user = (await db.select().from(communityUsers).where(eq(communityUsers.username, identity.username)).limit(1))[0];
  if (!user) user = (await db.insert(communityUsers).values({ username: identity.username }).returning())[0];
  await db.insert(communityReactions).values({ messageId: req.params.id, userId: user.id }).onConflictDoNothing();
  res.json({ reacted: true });
});

router.post("/community/messages/:id/report", async (req, res) => {
  const identity = getIdentity(req, res);
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "Reported by community member";
  const db = await database();
  if (!db) { res.status(201).json({ reported: true }); return; }
  let user = (await db.select().from(communityUsers).where(eq(communityUsers.username, identity.username)).limit(1))[0];
  if (!user) user = (await db.insert(communityUsers).values({ username: identity.username }).returning())[0];
  await db.insert(communityReports).values({ messageId: req.params.id, userId: user.id, reason });
  res.status(201).json({ reported: true });
});

export default router;
