"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { originalPath, extOf } from "@/lib/storage";
import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  ACCEPTED_MIME,
  ACCEPTED_EXT,
} from "@/config/app-config";

type ItemState = "pending" | "uploading" | "processing" | "done" | "error";
type Item = { name: string; state: ItemState; message?: string };

export function Uploader({
  orderId,
  userId,
  bucket,
  cap,
  existingCount,
}: {
  orderId: string;
  userId: string;
  bucket: string;
  cap: number;
  existingCount: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const remaining = Math.max(cap - existingCount, 0);
  const atCap = remaining <= 0;

  function validate(file: File): string | null {
    const ext = extOf(file.name);
    const okType =
      (file.type && ACCEPTED_MIME.has(file.type)) || ACCEPTED_EXT.has(ext);
    if (!okType) return "Unsupported file type";
    if (file.size > MAX_FILE_BYTES) return `Over ${MAX_FILE_MB}MB`;
    if (file.size === 0) return "Empty file";
    return null;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = ""; // allow re-picking same file
    if (!picked.length) return;

    setNotice(null);

    // Enforce the hard cap: only take up to `remaining`.
    let accepted = picked;
    if (picked.length > remaining) {
      accepted = picked.slice(0, remaining);
      setNotice(
        `This album holds ${cap} photos. ${
          remaining === 0
            ? "It's already full."
            : `Only the first ${remaining} of your ${picked.length} selected were added.`
        }`,
      );
    }

    setBusy(true);
    const supabase = createClient();

    for (const file of accepted) {
      const invalid = validate(file);
      if (invalid) {
        pushItem({ name: file.name, state: "error", message: invalid });
        continue;
      }

      const idx = addItem({ name: file.name, state: "uploading" });

      const photoId = crypto.randomUUID();
      const ext = extOf(file.name) || "jpg";
      const path = originalPath(userId, orderId, photoId, ext);

      // 1) Upload the ORIGINAL straight to private storage (bypasses our API
      //    so big iPhone photos don't hit serverless body limits).
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (upErr) {
        updateItem(idx, { state: "error", message: "Upload failed" });
        continue;
      }

      // 2) Ask the server to read EXIF, make the display derivative, and record
      //    the photo. (HEIC conversion + resolution read happen there.)
      updateItem(idx, { state: "processing" });
      try {
        const res = await fetch("/api/photos/process", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orderId,
            photoId,
            originalPath: path,
            originalName: file.name,
            byteSize: file.size,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          updateItem(idx, {
            state: "error",
            message: body.error || "Could not process",
          });
        } else {
          updateItem(idx, { state: "done" });
        }
      } catch {
        updateItem(idx, { state: "error", message: "Network error" });
      }
    }

    setBusy(false);
    router.refresh(); // pull fresh counts + the new photos into the grid

    // Clear the done/pending items after a beat; keep errors visible.
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.state === "error"));
    }, 1500);
  }

  // --- tiny item-list helpers ---
  function addItem(item: Item): number {
    let index = -1;
    setItems((prev) => {
      index = prev.length;
      return [...prev, item];
    });
    return index;
  }
  function pushItem(item: Item) {
    setItems((prev) => [...prev, item]);
  }
  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-clay/40 bg-white p-6">
      <div className="flex flex-col items-center justify-center text-center">
        <p className="font-serif text-lg text-ink">
          {atCap ? "Album is full" : "Add your photos"}
        </p>
        <p className="mt-1 text-sm text-ink/60">
          {atCap
            ? `All ${cap} photos are in.`
            : `JPEG, PNG, WebP or HEIC (iPhone). Up to ${MAX_FILE_MB}MB each. ${remaining} slot${
                remaining === 1 ? "" : "s"
              } left.`}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          hidden
          disabled={busy || atCap}
          onChange={onPick}
        />
        <button
          type="button"
          disabled={busy || atCap}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-lg bg-clay px-5 py-2.5 font-medium text-white transition hover:bg-clay/90 disabled:opacity-50"
        >
          {busy ? "Working…" : "Choose photos"}
        </button>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg bg-cream px-3 py-2 text-center text-sm text-ink/70">
          {notice}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md bg-cream px-3 py-1.5"
            >
              <span className="truncate text-ink/80">{it.name}</span>
              <span
                className={
                  it.state === "error"
                    ? "shrink-0 text-red-600"
                    : it.state === "done"
                      ? "shrink-0 text-sage"
                      : "shrink-0 text-ink/50"
                }
              >
                {labelFor(it)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function labelFor(it: Item): string {
  switch (it.state) {
    case "uploading":
      return "Uploading…";
    case "processing":
      return "Processing…";
    case "done":
      return "✓ Added";
    case "error":
      return `✕ ${it.message ?? "Failed"}`;
    default:
      return "Waiting…";
  }
}
