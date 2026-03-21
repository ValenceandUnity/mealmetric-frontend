"use client";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__copy">{message}</p>
    </div>
  );
}
