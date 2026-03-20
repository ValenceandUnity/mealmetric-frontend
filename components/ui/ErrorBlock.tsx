"use client";

type ErrorBlockProps = {
  title: string;
  message: string;
};

export function ErrorBlock({ title, message }: ErrorBlockProps) {
  return (
    <section
      style={{
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 20,
        background: "#111827",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginBottom: 0, color: "#fca5a5" }}>{message}</p>
    </section>
  );
}
