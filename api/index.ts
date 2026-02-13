import express from "express";
import path from "path";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] || "https") as string;
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "") as string;
  if (!host) return "";
  return `${proto}://${host}`;
}

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
    <meta property="og:title" content="Boulder Dash" />
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

// --- Frame endpoints ---
app.get(["/frame", "/frame/"], (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(
    frameHtml({
      imageUrl: `${baseUrl}/api/og?screen=home`,
      postUrl: `${baseUrl}/frame/action`,
      buttons: [{ label: "Play" }, { label: "Move" }],
      state: { screen: "home" },
    }),
  );
});

app.post(["/frame/action", "/frame/action/"], (req, res) => {
  const baseUrl = getBaseUrl(req);
  const buttonIndex = Number(req.body?.untrustedData?.buttonIndex || 0);
  let state: any = { screen: "home", moves: 0 };
  try {
    if (req.body?.untrustedData?.state) state = JSON.parse(req.body.untrustedData.state);
  } catch {}

  if (state.screen === "home") {
    if (buttonIndex === 1) {
      state = { screen: "play", moves: 0 };
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).send(
        frameHtml({
          imageUrl: `${baseUrl}/api/og?screen=play&n=0`,
          postUrl: `${baseUrl}/frame/action`,
          buttons: [
            { label: "UP" },
            { label: "LEFT" },
            { label: "DOWN" },
            { label: "RIGHT" },
          ],
          state,
        }),
      );
    }
    // button 2 -> go to move screen as well
    state = { screen: "play", moves: 0 };
  } else if (state.screen === "play") {
    state.moves = Number(state.moves || 0) + 1;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(
    frameHtml({
      imageUrl: `${baseUrl}/api/og?screen=play&n=${state.moves || 0}`,
      postUrl: `${baseUrl}/frame/action`,
      buttons: [
        { label: "UP" },
        { label: "LEFT" },
        { label: "DOWN" },
        { label: "RIGHT" },
      ],
      state,
    }),
  );
});

function sendPng(res: any) {
  const imgPath = path.resolve(process.cwd(), "client", "public", "favicon.png");
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(imgPath);
}

app.get(["/frame/image.png", "/frame/image.png/"], (_req, res) => {
  // Small PNG placeholder for max Farcaster compatibility.
  return sendPng(res);
});

// Some Farcaster clients / crawlers fetch the image URL under /api/*.
// Provide a non-edge fallback here so it always works.
app.get(["/api/og", "/api/og/"], (_req, res) => {
  return sendPng(res);
});

// Root: redirect to the frame (so pasting the domain works)
app.get("/", (_req, res) => {
  res.redirect(302, "/frame");
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
