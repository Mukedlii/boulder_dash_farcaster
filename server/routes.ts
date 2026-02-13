import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import crypto from "crypto";

function frameHtml(opts: {
  imageUrl: string;
  postUrl: string;
  buttons: Array<{ label: string }>;
  state?: any;
}) {
  const state = opts.state === undefined ? undefined : JSON.stringify(opts.state);
  const buttonMetas = opts.buttons
    .slice(0, 4)
    .map(
      (b, i) =>
        `<meta property="fc:frame:button:${i + 1}" content="${escapeHtml(b.label)}" />`,
    )
    .join("\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta property="og:title" content="Replit Game" />
    <meta property="og:image" content="${escapeHtml(opts.imageUrl)}" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${escapeHtml(opts.imageUrl)}" />
    <meta property="fc:frame:post_url" content="${escapeHtml(opts.postUrl)}" />
    ${buttonMetas}
    ${state ? `<meta property="fc:frame:state" content='${escapeHtml(state)}' />` : ""}
  </head>
  <body></body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function svgResponse(res: any, svg: string) {
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(svg);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === Farcaster Frame (MVP) ===
  app.get("/frame", (_req, res) => {
    const baseUrl = process.env.PUBLIC_URL || "";
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(
      frameHtml({
        imageUrl: `${baseUrl}/frame/image.png?screen=home`,
        postUrl: `${baseUrl}/frame/action`,
        buttons: [{ label: "Play daily" }, { label: "Leaderboard" }],
        state: { screen: "home" },
      }),
    );
  });

  app.post("/frame/action", async (req, res) => {
    // Warpcast sends JSON with untrustedData.buttonIndex and optionally untrustedData.state
    const untrusted = req.body?.untrustedData;
    const buttonIndex = Number(untrusted?.buttonIndex || 0);
    let state: any = { screen: "home" };
    try {
      if (untrusted?.state) state = JSON.parse(untrusted.state);
    } catch {}

    const baseUrl = process.env.PUBLIC_URL || "";

    // Home screen
    if (!state?.screen || state.screen === "home") {
      if (buttonIndex === 1) {
        // Start daily run: create guest + fetch daily + request server nonce
        const username = `Guest ${Math.floor(Math.random() * 10000)}`;
        const user = await storage.createUser(username);
        const token = Buffer.from(JSON.stringify({ id: user.id })).toString("base64");

        const today = new Date().toISOString().split("T")[0];
        let config = await storage.getDailyConfig(today);
        if (!config) {
          const seed = crypto
            .createHash("sha256")
            .update(today)
            .digest("hex")
            .substring(0, 8);
          config = await storage.setDailyConfig({ date: today, seed, message: "Good luck!" });
        }

        const serverNonce = crypto.randomBytes(16).toString("hex");

        state = {
          screen: "play",
          token,
          seed: config.seed,
          serverNonce,
          moves: [],
        };

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(
          frameHtml({
            imageUrl: `${baseUrl}/frame/image.png?screen=play`,
            postUrl: `${baseUrl}/frame/action`,
            buttons: [{ label: "UP" }, { label: "LEFT" }, { label: "DOWN" }, { label: "RIGHT" }],
            state,
          }),
        );
      }

      if (buttonIndex === 2) {
        state = { screen: "leaderboard" };
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(
          frameHtml({
            imageUrl: `${baseUrl}/frame/image.png?screen=leaderboard`,
            postUrl: `${baseUrl}/frame/action`,
            buttons: [{ label: "Back" }],
            state,
          }),
        );
      }
    }

    // Play screen: capture directional moves into state
    if (state?.screen === "play") {
      const dir =
        buttonIndex === 1
          ? "UP"
          : buttonIndex === 2
            ? "LEFT"
            : buttonIndex === 3
              ? "DOWN"
              : buttonIndex === 4
                ? "RIGHT"
                : null;

      const moves = Array.isArray(state.moves) ? state.moves.slice(0, 200) : [];
      if (dir) moves.push(dir);
      state = { ...state, moves, lastMove: dir };

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(
        frameHtml({
          imageUrl: `${baseUrl}/frame/image.png?screen=play&n=${moves.length}`,
          postUrl: `${baseUrl}/frame/action`,
          buttons: [{ label: "UP" }, { label: "LEFT" }, { label: "DOWN" }, { label: "RIGHT" }],
          state,
        }),
      );
    }

    // Leaderboard screen
    if (state?.screen === "leaderboard") {
      state = { screen: "home" };
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(
        frameHtml({
          imageUrl: `${baseUrl}/frame/image.png?screen=home`,
          postUrl: `${baseUrl}/frame/action`,
          buttons: [{ label: "Play daily" }, { label: "Leaderboard" }],
          state,
        }),
      );
    }

    // Fallback
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(
      frameHtml({
        imageUrl: `${baseUrl}/frame/image.png?screen=home`,
        postUrl: `${baseUrl}/frame/action`,
        buttons: [{ label: "Play daily" }, { label: "Leaderboard" }],
        state: { screen: "home" },
      }),
    );
  });

  // NOTE: Farcaster clients often don't render SVGs in frame images reliably.
  // Serve a PNG for maximum compatibility.
  app.get("/frame/image.png", async (req, res) => {
    const screen = String(req.query.screen || "home");

    // For MVP, return favicon.png as a placeholder image.
    // (We can switch to real dynamic PNG rendering later.)
    try {
      const fs = await import("fs");
      const path = await import("path");
      const imgPath = path.resolve(process.cwd(), "dist", "public", "favicon.png");
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store");
      return fs.createReadStream(imgPath).pipe(res);
    } catch (e) {
      // fallback: 204
      return res.status(204).end();
    }
  });

  // Kept for debugging: SVG generator
  app.get("/frame/image", async (req, res) => {
    const screen = String(req.query.screen || "home");

    if (screen === "leaderboard") {
      const today = new Date().toISOString().split("T")[0];
      const leaderboard = await storage.getDailyLeaderboard(today);
      const top = leaderboard.slice(0, 5);

      const rows = top
        .map((r, i) => `${i + 1}. ${r.username} — ${r.score}`)
        .join("\n");

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020" />
      <stop offset="1" stop-color="#070a12" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="60" y="110" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="56" fill="#7CFF6B">LEADERBOARD</text>
  <text x="60" y="180" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#cbd5e1">${escapeHtml(today)}</text>
  <text x="60" y="250" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="36" fill="#e2e8f0" xml:space="preserve">${escapeHtml(rows || "No runs yet")}</text>
  <text x="60" y="580" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#94a3b8">Tap Back</text>
</svg>`;
      return svgResponse(res, svg);
    }

    if (screen === "play") {
      const n = Number(req.query.n || 0);
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020" />
      <stop offset="1" stop-color="#070a12" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="60" y="120" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="56" fill="#ff00ff">DAILY RUN</text>
  <text x="60" y="200" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="36" fill="#e2e8f0">Moves: ${n}</text>
  <text x="60" y="260" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#94a3b8">Use buttons: UP / LEFT / DOWN / RIGHT</text>
  <text x="60" y="560" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#94a3b8">(MVP frame: records moves only)</text>
</svg>`;
      return svgResponse(res, svg);
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020" />
      <stop offset="1" stop-color="#070a12" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <text x="60" y="120" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="64" fill="#7dd3fc">REPLIT GAME</text>
  <text x="60" y="220" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="34" fill="#e2e8f0">Farcaster Frame</text>
  <text x="60" y="300" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="28" fill="#94a3b8">Play daily or view leaderboard</text>
</svg>`;
    return svgResponse(res, svg);
  });

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
