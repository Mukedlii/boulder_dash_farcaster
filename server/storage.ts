import { db } from "./db";
import { users, runs, dailyConfigs, type User, type Run, type DailyConfig, type InputEvent } from "@shared/schema";
import { eq, and, desc, sql, gte, lt } from "drizzle-orm";

export interface IStorage {
  // User
  createUser(username: string): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  
  // Daily Config
  getDailyConfig(date: string): Promise<DailyConfig | undefined>;
  setDailyConfig(config: DailyConfig): Promise<DailyConfig>;
  
  // Runs
  createRun(run: { userId: number; mode: string; seed: string; serverNonce: string; inputs: InputEvent[] }): Promise<Run>;
  updateRun(id: number, result: { score: number; gemsCollected: number; timeMs: number; won: boolean; inputs: InputEvent[]; verified?: boolean; suspicious?: boolean }): Promise<Run>;
  
  // Leaderboards
  getDailyLeaderboard(date: string): Promise<{ username: string; score: number; timeMs: number; rank: number }[]>;
}

export class DatabaseStorage implements IStorage {
  async createUser(username: string): Promise<User> {
    const [user] = await db.insert(users).values({ username }).returning();
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getDailyConfig(date: string): Promise<DailyConfig | undefined> {
    const [config] = await db.select().from(dailyConfigs).where(eq(dailyConfigs.date, date));
    return config;
  }

  async setDailyConfig(config: DailyConfig): Promise<DailyConfig> {
    const [newConfig] = await db.insert(dailyConfigs)
      .values(config)
      .onConflictDoUpdate({ target: dailyConfigs.date, set: config })
      .returning();
    return newConfig;
  }

  async createRun(data: { userId: number; mode: string; seed: string; serverNonce: string; inputs: InputEvent[] }): Promise<Run> {
    const [run] = await db.insert(runs).values({
      userId: data.userId,
      mode: data.mode,
      seed: data.seed,
      serverNonce: data.serverNonce,
      inputs: data.inputs, // Initial empty/partial inputs
    }).returning();
    return run;
  }

  async updateRun(id: number, result: Partial<Run>): Promise<Run> {
    const [run] = await db.update(runs)
      .set(result)
      .where(eq(runs.id, id))
      .returning();
    return run;
  }

  async getDailyLeaderboard(date: string): Promise<{ username: string; score: number; timeMs: number; rank: number }[]> {
    // Basic leaderboard implementation
    // In a real app, this would filter by the specific daily seed
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const results = await db.select({
      username: users.username,
      score: runs.score,
      timeMs: runs.timeMs,
    })
    .from(runs)
    .innerJoin(users, eq(runs.userId, users.id))
    .where(and(
      eq(runs.mode, 'daily'),
      eq(runs.verified, true),
      // In a real app we'd join with the daily seed to ensure it matches
    ))
    .orderBy(desc(runs.score), desc(runs.gemsCollected))
    .limit(50);

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}

export const storage = new DatabaseStorage();
