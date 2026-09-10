import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const communityUsers = pgTable("community_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityRooms = pgTable("community_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  accent: text("accent").notNull().default("sage"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityMembers = pgTable("community_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => communityRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => communityUsers.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("community_members_room_user_idx").on(table.roomId, table.userId)]);

export const communityMessages = pgTable("community_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => communityRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => communityUsers.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityReactions = pgTable("community_reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => communityMessages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => communityUsers.id, { onDelete: "cascade" }),
  emoji: text("emoji").notNull().default("heart"),
}, (table) => [uniqueIndex("community_reactions_message_user_emoji_idx").on(table.messageId, table.userId, table.emoji)]);

export const communityReports = pgTable("community_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id").notNull().references(() => communityMessages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => communityUsers.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const communityRoomsRelations = relations(communityRooms, ({ many }) => ({ members: many(communityMembers), messages: many(communityMessages) }));
export const communityUsersRelations = relations(communityUsers, ({ many }) => ({ memberships: many(communityMembers), messages: many(communityMessages) }));
export const communityMessagesRelations = relations(communityMessages, ({ one, many }) => ({ room: one(communityRooms, { fields: [communityMessages.roomId], references: [communityRooms.id] }), user: one(communityUsers, { fields: [communityMessages.userId], references: [communityUsers.id] }), reactions: many(communityReactions), reports: many(communityReports) }));
