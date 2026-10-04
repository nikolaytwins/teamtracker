export default function ClientEstimateNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg,#f6f8fc 0%,#eef2f9 100%)",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: "32px 36px",
          maxWidth: 480,
          boxShadow: "0 1px 2px rgba(16,24,40,.04),0 10px 30px -14px rgba(16,24,40,.10)",
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: ".13em",
            textTransform: "uppercase",
            color: "#a1a1aa",
          }}
        >
          Twin Labs
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.03em", margin: "10px 0 8px" }}>
          Ссылка недействительна
        </h1>
        <p style={{ fontSize: 15, color: "#71717a", lineHeight: 1.5 }}>
          Эта страница сметы недоступна или была отключена. Попросите актуальную ссылку в чате проекта.
        </p>
      </div>
    </div>
  );
}
