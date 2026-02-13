import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  externalId: text("external_id"), // For future Farcaster ID
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mode: text("mode").notNull(), // 'daily' | 'practice'
  seed: text("seed").notNull(),
  score: integer("score").notNull().default(0),
  gemsCollected: integer("gems_collected").notNull().default(0),
  timeMs: integer("time_ms").notNull().default(0),
  won: boolean("won").notNull().default(false),
  inputs: jsonb("inputs").notNull(), // Array of input events for replay
  serverNonce: text("server_nonce").notNull(),
  verified: boolean("verified").default(false),
  suspicious: boolean("suspicious").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyConfigs = pgTable("daily_configs", {
  date: text("date").primaryKey(), // YYYY-MM-DD
  seed: text("seed").notNull(),
  message: text("message"),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastSeenAt: true });
export const insertRunSchema = createInsertSchema(runs).omit({ id: true, verified: true, suspicious: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type Run = typeof runs.$inferSelect;
export type DailyConfig = typeof dailyConfigs.$inferSelect;

export type InputEvent = {
  tick: number;
  input: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'WAIT';
};

export type RunResult = {
  score: number;
  gems: number;
  timeMs: number;
  won: boolean;
  history: InputEvent[];
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  timeMs: number;
  rank: number;
};
