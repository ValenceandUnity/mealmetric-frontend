"use client";

type ErrorBlockProps = {
  title: string;
  message: string;
};

export function ErrorBlock({ title, message }: ErrorBlockProps) {
  return (
    <section className="surface">
      <h2 className="section__title">{title}</h2>
      <p className="status-text" style={{ color: "var(--danger)" }}>
        {message}
      </p>
    </section>
  );
}
