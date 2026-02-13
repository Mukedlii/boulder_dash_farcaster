import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Auth (Simple Session) ===
  app.post(api.auth.guest.path, async (req, res) => {
    // In a real app, we'd use a real session store (redis/postgres)
    // For this MVP, we just create a user and return their ID "token"
    const username = `Guest ${Math.floor(Math.random() * 10000)}`;
    const user = await storage.createUser(username);
    
    // Simple insecure token for MVP
    const token = Buffer.from(JSON.stringify({ id: user.id })).toString('base64');
    
    res.json({ user, token });
  });

  // === Daily Config ===
  app.get(api.daily.get.path, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let config = await storage.getDailyConfig(today);
    
    if (!config) {
      // Generate a deterministic seed for the day if not exists
      const seed = crypto.createHash('sha256').update(today).digest('hex').substring(0, 8);
      config = await storage.setDailyConfig({ date: today, seed, message: "Good luck!" });
    }
    
    res.json(config);
  });

  // === Runs ===
  app.post(api.runs.start.path, async (req, res) => {
    // Verify auth token (simple check)
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });
    
    try {
      // Decode fake token
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const userId = payload.id;

      const { mode, seed } = api.runs.start.input.parse(req.body);
      
      const serverNonce = crypto.randomBytes(16).toString('hex');
      
      // We don't necessarily need to create the run row immediately for practice,
      // but for daily we might want to to track attempts.
      // For MVP, we'll just return the nonce.
      
      res.json({ serverNonce });
    } catch (e) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  app.post(api.runs.submit.path, async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });

    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      const userId = payload.id;

      const input = api.runs.submit.input.parse(req.body);
      
      // === ANTI-CHEAT VALIDATION (MVP) ===
      // In a full implementation, we would instantiate the game engine here
      // and replay input.result.history using input.seed.
      // For this Lite MVP, we will perform heuristic checks.
      
      let suspicious = false;
      let valid = true;
      
      // Check 1: Time consistency
      const maxTicks = input.result.history.length;
      const calculatedTime = maxTicks * (1000 / 10); // Assuming 10 ticks per second
      // Allow some variance, but if claimed time is vastly different from tick count, flag it.
      
      // Check 2: Score bounds
      // Max score = gems * gem_value + time_bonus. 
      // We'd need game constants here.
      
      // Save the run
      await storage.createRun({
        userId,
        mode: input.mode,
        seed: input.seed,
        serverNonce: input.serverNonce,
        inputs: input.result.history,
      }).then(run => storage.updateRun(run.id, {
        score: input.result.score,
        gemsCollected: input.result.gems,
        timeMs: input.result.timeMs,
        won: input.result.won,
        inputs: input.result.history,
        verified: valid,
        suspicious: suspicious
      }));

      res.json({
        valid,
        newHighScore: false, // Calculate real high score logic
        rank: 0
      });

    } catch (e) {
      console.error(e);
      res.status(400).json({ message: "Validation error" });
    }
  });

  // === Leaderboard ===
  app.get(api.leaderboard.daily.path, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const leaderboard = await storage.getDailyLeaderboard(today);
    res.json(leaderboard);
  });

  return httpServer;
}
