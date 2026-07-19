import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(900px 420px at 20% 20%, rgba(45,212,191,0.25), transparent 60%), radial-gradient(900px 520px at 80% 70%, rgba(59,130,246,0.25), transparent 55%), #070A12",
          color: "white",
          padding: 80,
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Arial",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 980 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              PI
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>PursuitIQ</div>
              <div style={{ fontSize: 16, color: "rgba(226,232,240,0.8)" }}>Win Intelligence Platform</div>
            </div>
          </div>
          <div style={{ fontSize: 54, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.4 }}>
            Build stronger bids in one connected workflow.
          </div>
          <div style={{ fontSize: 22, lineHeight: 1.35, color: "rgba(226,232,240,0.86)" }}>
            Discover opportunities. Draft with evidence. Review, export, and learn from each outcome.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
