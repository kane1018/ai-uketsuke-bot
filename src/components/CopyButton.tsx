"use client";

import { useEffect, useRef, useState } from "react";

export function CopyButton({ value, label = "コピー", className = "btn-secondary" }: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const [copying, setCopying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    if (lock.current) return;
    lock.current = true;
    setCopying(true);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    let success = false;
    try {
      await navigator.clipboard.writeText(value);
      success = true;
    } catch {
      // execCommand can return false as well as throw. Neither means success.
      const textarea = document.createElement("textarea");
      const previousFocus = document.activeElement;
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      try {
        document.body.appendChild(textarea);
        textarea.select();
        success = document.execCommand("copy");
      } catch {
        success = false;
      } finally {
        textarea.remove();
        if (previousFocus instanceof HTMLElement) previousFocus.focus();
      }
    } finally {
      lock.current = false;
      setCopying(false);
    }
    setStatus(success ? "copied" : "error");
    if (success) timer.current = setTimeout(() => setStatus("idle"), 1800);
  }

  return <span className="inline-flex max-w-full flex-col items-start gap-1">
    <button type="button" onClick={copy} className={className} disabled={copying}>
      {copying ? "コピー中…" : status === "copied" ? "✓ コピーしました" : label}
    </button>
    <span role="status" className={status === "error" ? "max-w-xs text-xs text-red-700" : "sr-only"}>
      {status === "error" ? "コピーできませんでした。表示されたURL・コードを選択して手動でコピーしてください。" : status === "copied" ? "コピーしました" : ""}
    </span>
  </span>;
}
