"use client";

import { useEffect, useState } from "react";

type ConfirmButtonProps = {
  idleLabel: string;
  confirmLabel: string;
  busyLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

export function ConfirmButton({
  idleLabel,
  confirmLabel,
  busyLabel = "Working...",
  onConfirm,
  disabled = false,
  className,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!confirming) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setConfirming(false);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [confirming]);

  async function handleClick() {
    if (busy || disabled) {
      return;
    }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setBusy(true);

    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <button
      type="button"
      className={[
        "button--danger",
        confirming ? "button--danger-armed" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => void handleClick()}
      disabled={disabled || busy}
      aria-live="polite"
    >
      {busy ? busyLabel : confirming ? confirmLabel : idleLabel}
    </button>
  );
}
