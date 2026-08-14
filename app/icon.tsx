import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M8 8h8" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 12h6" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M8 16h4" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
