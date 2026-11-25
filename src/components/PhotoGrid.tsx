import { deletePhoto } from "@/app/albums/[orderId]/actions";
import type { PhotoWithUrl } from "@/lib/types";

export function PhotoGrid({
  photos,
  orderId,
}: {
  photos: PhotoWithUrl[];
  orderId: string;
}) {
  if (photos.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-dust bg-white p-8 text-center text-ink/50">
        No photos yet. Add some above to see them here, sorted oldest-first.
      </p>
    );
  }

  return (
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((p) => (
        <li
          key={p.id}
          className="group relative overflow-hidden rounded-xl border border-dust bg-white"
        >
          <div className="aspect-square w-full bg-dust/40">
            {p.displayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.displayUrl}
                alt={p.original_name ?? "Uploaded photo"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-ink/40">
                Processing…
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="truncate text-[11px] text-ink/50">
              {formatTaken(p.taken_at)}
            </span>
            <form action={deletePhoto}>
              <input type="hidden" name="photoId" value={p.id} />
              <input type="hidden" name="orderId" value={orderId} />
              <button
                type="submit"
                aria-label="Remove photo"
                className="rounded px-1.5 text-ink/40 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
              >
                ✕
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatTaken(taken: string | null): string {
  if (!taken) return "No date";
  const d = new Date(taken);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
