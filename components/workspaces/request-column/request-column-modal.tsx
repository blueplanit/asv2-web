"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
  workspaceName?: string;
  stripeAccountId?: string;
};

type UploadItem = { id: string; file: File };

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function RequestColumnModal({ open, onClose, userEmail, workspaceName, stripeAccountId }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [columnsText, setColumnsText] = useState("");
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  const totalBytes = useMemo(() => files.reduce((acc, f) => acc + f.file.size, 0), [files]);

  useEffect(() => {
    if (!open) return;
    setStatus({ kind: "idle" });
    // basic scroll lock
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !submitting) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, submitting]);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const imageOnly = arr.filter((f) => f.type.startsWith("image/"));
    const next = imageOnly.map((file) => ({ id: crypto.randomUUID(), file }));
    setFiles((prev) => [...prev, ...next]);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function onBrowseClick() {
    if (submitting) return;
    fileInputRef.current?.click();
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function submit() {
    setStatus({ kind: "idle" });

    const trimmed = columnsText.trim();
    if (!trimmed) {
      setStatus({ kind: "err", msg: "Add at least one column request." });
      return;
    }

    // keep attachments reasonable
    const MAX_TOTAL = 10 * 1024 * 1024; // 10MB total
    if (totalBytes > MAX_TOTAL) {
      setStatus({ kind: "err", msg: "Screenshots are too large (max 10MB total)." });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("columnsText", trimmed);
      if (userEmail) fd.set("userEmail", userEmail);
      if (workspaceName) fd.set("workspaceName", workspaceName);
      if (stripeAccountId) fd.set("stripeAccountId", stripeAccountId);
      fd.set("pageUrl", window.location.href);

      for (const item of files) fd.append("screenshots", item.file, item.file.name);

      const res = await fetch("/api/column-request", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      setStatus({ kind: "ok", msg: "Sent. Thanks — we’ll review it." });
      setColumnsText("");
      setFiles([]);
      // close shortly after success
      setTimeout(() => onClose(), 650);
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message || "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Request a new Stripe column"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={onDrop}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Request a new Stripe column</h2>
            <p className="mt-1 text-sm text-slate-600">
              Tell us which columns you need. Add screenshots if helpful.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-800">Columns needed (one per line)</label>
          <textarea
            value={columnsText}
            onChange={(e) => setColumnsText(e.target.value)}
            disabled={submitting}
            rows={6}
            className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-slate-50"
            placeholder={`Example:\ncharges.balance_transaction.fee\ninvoices.discount.coupon.id\ncustomers.metadata.plan`}
          />
          <p className="mt-2 text-xs text-slate-500">
            Include the Stripe object context if you know it (charges / invoices / subscriptions, etc.).
          </p>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-800">Screenshots (optional)</label>
            <span className="text-xs text-slate-500">{files.length ? `${formatBytes(totalBytes)} total` : ""}</span>
          </div>

          <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-700">
                <div className="font-medium">Drag & drop images here</div>
                <div className="text-xs text-slate-500">PNG/JPG/WebP. Max 10MB total.</div>
              </div>
              <button
                type="button"
                onClick={onBrowseClick}
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
              >
                Browse
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{item.file.name}</div>
                      <div className="text-xs text-slate-500">{formatBytes(item.file.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      disabled={submitting}
                      className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {status.kind !== "idle" && (
          <div
            className={[
              "mt-4 rounded-xl px-3 py-2 text-sm",
              status.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800",
            ].join(" ")}
          >
            {status.msg}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
