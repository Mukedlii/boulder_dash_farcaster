import express from "express";
import path from "path";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

const app = express();

// Parse JSON bodies (needed for frame POSTs)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Serve built client files from dist/public
const publicDir = path.resolve(process.cwd(), "dist", "public");
app.use(express.static(publicDir));

// Register API + /frame endpoints
const httpServer = createServer(app);
let routesReady: Promise<void> | null = null;
async function ensureRoutes() {
  if (!routesReady) {
    routesReady = (async () => {
      await registerRoutes(httpServer, app);
    })();
  }
  await routesReady;
}

app.use(async (_req, _res, next) => {
  await ensureRoutes();
  next();
});

// SPA fallback
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default async function handler(req: any, res: any) {
  await ensureRoutes();
  return app(req, res);
}
