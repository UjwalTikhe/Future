import cookieParser from "cookie-parser";
import { desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { communityChannels, communityMembers, communityMessages, communityReactions, communityReports, communityRooms, communityUsers } from "@workspace/db/schema";
import { requireStudent } from "./auth";

const router: IRouter = Router();
const seededRooms = [
  { slug: "late-night-study", name: "Late Night Study", description: "Quiet accountability, study rituals, and getting started.", accent: "sage", visibility: "public" },
  { slug: "music-makers", name: "Music Makers", description: "Share songs, jams, gear, and unfinished ideas.", accent: "amber", visibility: "public" },
  { slug: "first-year-corner", name: "First Year Corner", description: "Questions, wins, and honest notes from the first year.", accent: "sky", visibility: "public" },
  { slug: "creative-lab", name: "Creative Lab", description: "A home for sketches, writing, design, and experiments.", accent: "rose", visibility: "public" },
];
let schemaReady = false;
router.use(cookieParser());

async function database() { if (!process.env.DATABASE_URL) return null; try { return (await import("@workspace/db")).db; } catch { return null; } }

async function ensureSchema(db: any) {
  if (schemaReady) return;
  await db.execute(sql.raw(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE TABLE IF NOT EXISTS community_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), username text NOT NULL UNIQUE, email text NOT NULL UNIQUE, password_hash text NOT NULL, interests text NOT NULL DEFAULT '', bio text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS email text;
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS interests text NOT NULL DEFAULT '';
    ALTER TABLE community_users ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
    CREATE TABLE IF NOT EXISTS community_rooms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL, description text NOT NULL, accent text NOT NULL DEFAULT 'sage', visibility text NOT NULL DEFAULT 'public', owner_id uuid REFERENCES community_users(id), created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
    ALTER TABLE community_rooms ADD COLUMN IF NOT EXISTS owner_id uuid;
    CREATE TABLE IF NOT EXISTS community_channels (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE, slug text NOT NULL, name text NOT NULL, topic text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id, slug));
    CREATE TABLE IF NOT EXISTS community_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'approved', joined_at timestamptz NOT NULL DEFAULT now(), UNIQUE(room_id, user_id));
    ALTER TABLE community_members ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
    CREATE TABLE IF NOT EXISTS community_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_id uuid NOT NULL REFERENCES community_rooms(id) ON DELETE CASCADE, channel_id uuid REFERENCES community_channels(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, content text NOT NULL, reply_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
    ALTER TABLE community_messages ADD COLUMN IF NOT EXISTS channel_id uuid;
    CREATE TABLE IF NOT EXISTS community_reactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, emoji text NOT NULL DEFAULT 'heart', UNIQUE(message_id, user_id, emoji));
    CREATE TABLE IF NOT EXISTS community_reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS community_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES community_users(id) ON DELETE CASCADE, token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL);
  `));
  for (const room of seededRooms) {
    const created = (await db.insert(communityRooms).values(room).onConflictDoNothing().returning())[0] ?? (await db.select().from(communityRooms).where(eq(communityRooms.slug, room.slug)).limit(1))[0];
    await db.insert(communityChannels).values({ roomId: created.id, slug: "general", name: "General", topic: "The main conversation" }).onConflictDoNothing();
    await db.insert(communityChannels).values({ roomId: created.id, slug: "introductions", name: "Introductions", topic: "Say hello, pseudonymously" }).onConflictDoNothing();
  }
  schemaReady = true;
}

async function currentUser(db: any, userId: string) { return (await db.select().from(communityUsers).where(eq(communityUsers.id, userId)).limit(1))[0]; }
async function roomBySlug(db: any, slug: string) { return (await db.select().from(communityRooms).where(eq(communityRooms.slug, slug)).limit(1))[0]; }
async function canRead(db: any, roomId: string, userId: string) { const room = (await db.select().from(communityRooms).where(eq(communityRooms.id, roomId)).limit(1))[0]; if (!room) return false; if (room.visibility === "public") return true; const membership = (await db.select().from(communityMembers).where(sql`${communityMembers.roomId} = ${roomId} and ${communityMembers.userId} = ${userId} and ${communityMembers.status} = 'approved'`).limit(1))[0]; return Boolean(membership); }

router.get("/community/rooms", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return;
  const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; }
  await ensureSchema(db);
  const rooms = await db.select({ id: communityRooms.id, slug: communityRooms.slug, name: communityRooms.name, description: communityRooms.description, accent: communityRooms.accent, visibility: communityRooms.visibility, memberCount: sql<number>`count(${communityMembers.id})`, joined: sql<boolean>`bool_or(${communityMembers.userId} = ${userId} and ${communityMembers.status} = 'approved')` }).from(communityRooms).leftJoin(communityMembers, eq(communityMembers.roomId, communityRooms.id)).groupBy(communityRooms.id).orderBy(communityRooms.name);
  res.json(rooms.map((room) => ({ ...room, memberCount: Number(room.memberCount), joined: Boolean(room.joined) })));
});

router.get("/community/rooms/:slug", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return;
  const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; }
  await ensureSchema(db); const room = await roomBySlug(db, req.params.slug);
  if (!room || !(await canRead(db, room.id, userId))) { res.status(403).json({ message: "Join this private community to view it." }); return; }
  const channels = await db.select({ id: communityChannels.id, slug: communityChannels.slug, name: communityChannels.name, topic: communityChannels.topic }).from(communityChannels).where(eq(communityChannels.roomId, room.id)).orderBy(communityChannels.name);
  res.json({ ...room, channels });
});

router.get("/community/rooms/:slug/channels/:channelSlug/messages", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return;
  const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; }
  await ensureSchema(db); const room = await roomBySlug(db, req.params.slug); if (!room || !(await canRead(db, room.id, userId))) { res.status(403).json({ message: "Join this private community to view it." }); return; }
  const channel = (await db.select().from(communityChannels).where(sql`${communityChannels.roomId} = ${room.id} and ${communityChannels.slug} = ${req.params.channelSlug}`).limit(1))[0]; if (!channel) { res.status(404).json({ message: "Channel not found." }); return; }
  const rows = await db.select({ id: communityMessages.id, username: communityUsers.username, content: communityMessages.content, createdAt: communityMessages.createdAt, replyCount: communityMessages.replyCount, reactions: sql<number>`count(${communityReactions.id})` }).from(communityMessages).innerJoin(communityUsers, eq(communityUsers.id, communityMessages.userId)).leftJoin(communityReactions, eq(communityReactions.messageId, communityMessages.id)).where(eq(communityMessages.channelId, channel.id)).groupBy(communityMessages.id, communityUsers.username).orderBy(desc(communityMessages.createdAt)).limit(100);
  res.json(rows.reverse().map((row) => ({ ...row, reactions: Number(row.reactions) })));
});

router.post("/community/rooms", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return;
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 60) : ""; const description = typeof req.body?.description === "string" ? req.body.description.trim().slice(0, 180) : ""; const visibility = req.body?.visibility === "private" ? "private" : "public"; const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  if (!name || !slug || !description) { res.status(400).json({ message: "A room name and description are required." }); return; }
  const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; }
  await ensureSchema(db); const existing = await roomBySlug(db, slug); if (existing) { res.status(409).json({ message: "A room with that name already exists." }); return; }
  const room = (await db.insert(communityRooms).values({ slug, name, description, visibility, ownerId: userId }).returning())[0]; await db.insert(communityMembers).values({ roomId: room.id, userId, status: "approved" }); await db.insert(communityChannels).values([{ roomId: room.id, slug: "general", name: "General", topic: "The main conversation" }, { roomId: room.id, slug: "introductions", name: "Introductions", topic: "Say hello, pseudonymously" }]); res.status(201).json({ ...room, memberCount: 1, joined: true });
});

router.post("/community/rooms/:slug/join", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return; const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; }
  await ensureSchema(db); const room = await roomBySlug(db, req.params.slug); if (!room) { res.status(404).json({ message: "Community room not found." }); return; } const status = room.visibility === "private" ? "pending" : "approved"; await db.insert(communityMembers).values({ roomId: room.id, userId, status }).onConflictDoNothing(); res.json({ joined: status === "approved", pending: status === "pending" });
});

router.post("/community/rooms/:slug/channels/:channelSlug/messages", async (req, res) => {
  const userId = await requireStudent(req, res); if (!userId) return; const content = typeof req.body?.content === "string" ? req.body.content.trim() : ""; if (!content || content.length > 2000) { res.status(400).json({ message: "Messages must contain between 1 and 2000 characters." }); return; }
  const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; } await ensureSchema(db); const room = await roomBySlug(db, req.params.slug); if (!room || !(await canRead(db, room.id, userId))) { res.status(403).json({ message: "Join this private community before chatting." }); return; } const channel = (await db.select().from(communityChannels).where(sql`${communityChannels.roomId} = ${room.id} and ${communityChannels.slug} = ${req.params.channelSlug}`).limit(1))[0]; if (!channel) { res.status(404).json({ message: "Channel not found." }); return; } const message = (await db.insert(communityMessages).values({ roomId: room.id, channelId: channel.id, userId, content }).returning())[0]; const user = await currentUser(db, userId); res.status(201).json({ ...message, username: user.username, reactions: 0 });
});

router.post("/community/messages/:id/react", async (req, res) => { const userId = await requireStudent(req, res); if (!userId) return; const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; } await ensureSchema(db); await db.insert(communityReactions).values({ messageId: req.params.id, userId }).onConflictDoNothing(); res.json({ reacted: true }); });
router.post("/community/messages/:id/report", async (req, res) => { const userId = await requireStudent(req, res); if (!userId) return; const db = await database(); if (!db) { res.status(503).json({ message: "Community database is not connected." }); return; } await ensureSchema(db); const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "Reported by community member"; await db.insert(communityReports).values({ messageId: req.params.id, userId, reason }); res.status(201).json({ reported: true }); });

export default router;
