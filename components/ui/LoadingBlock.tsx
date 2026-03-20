"use client";

type LoadingBlockProps = {
  title: string;
  message?: string;
};

export function LoadingBlock({ title, message }: LoadingBlockProps) {
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
      {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
