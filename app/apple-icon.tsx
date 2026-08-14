import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #5B8CFF 0%, #3B6FF7 48%, #244FD0 100%)",
          borderRadius: 40,
        }}
      >
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <path d="M7 8h10" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7 12h7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M7 16h5" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
