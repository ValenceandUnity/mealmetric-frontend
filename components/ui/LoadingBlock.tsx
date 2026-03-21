"use client";

type LoadingBlockProps = {
  title: string;
  message?: string;
};

export function LoadingBlock({ title, message }: LoadingBlockProps) {
  return (
    <section className="surface surface--soft">
      <h2 className="section__title">{title}</h2>
      {message ? <p className="section__copy">{message}</p> : null}
    </section>
  );
}
