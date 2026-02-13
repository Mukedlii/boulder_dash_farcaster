import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

export default function handler(req: Request) {
  const url = new URL(req.url);
  const screen = url.searchParams.get("screen") || "home";
  const n = url.searchParams.get("n") || "0";

  const title = screen === "play" ? "BOULDER DASH" : screen === "leaderboard" ? "LEADERBOARD" : "BOULDER DASH";
  const subtitle =
    screen === "play" ? `Moves: ${n}` : screen === "leaderboard" ? "Top runs" : "Farcaster Frame";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
          background: "linear-gradient(135deg, #0b1020 0%, #070a12 100%)",
          color: "#e2e8f0",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: -2, color: "#7dd3fc" }}>{title}</div>
        <div style={{ marginTop: 18, fontSize: 36, color: "#94a3b8" }}>{subtitle}</div>
        <div style={{ marginTop: 40, fontSize: 28, color: "#cbd5e1" }}>
          {screen === "home" ? "Tap Play" : "Use buttons: UP / LEFT / DOWN / RIGHT"}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
