import { ImageResponse } from "next/og";

export const alt = "Subhronil Chattoraj — Portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "70px", background: "#0b0a0e", color: "#f3f0f7", fontFamily: "sans-serif" }}><div style={{ display: "flex", color: "#b79ae5", fontSize: 20 }}>PORTFOLIO</div><div style={{ display: "flex", flexDirection: "column", fontSize: 100, fontWeight: 700, letterSpacing: "-6px", lineHeight: 1 }}><span>SUBHRONIL</span><span style={{ color: "#b79ae5" }}>CHATTORAJ.</span></div><div style={{ display: "flex", fontSize: 24 }}>Engineering student · Generative AI · Web development</div></div>, size);
}
