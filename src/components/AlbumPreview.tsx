import { LeafView } from "./LeafView";
import type { AlbumLayout } from "@/lib/engine/types";

/**
 * The full album preview (brief §5): all 30 leaves in order, photos auto-placed
 * by the engine, flowing chronologically from the first leaf to the last.
 */
export function AlbumPreview({
  layout,
  bgColor,
}: {
  layout: AlbumLayout;
  bgColor: string;
}) {
  const empty = layout.totalSlots - layout.filledSlots;

  return (
    <div>
      <div className="mb-6 rounded-xl border border-dust bg-white p-4 text-sm text-ink/70">
        <strong className="text-ink">{layout.leaves.length} leaves</strong> ·{" "}
        {layout.filledSlots} of {layout.totalSlots} photo slots filled
        {empty > 0 && (
          <span className="text-clay">
            {" "}
            · {empty} empty slot{empty === 1 ? "" : "s"} (add{" "}
            {empty === 1 ? "a photo" : "more photos"} to fill the album)
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {layout.leaves.map((leaf) => (
          <figure key={leaf.index}>
            <LeafView
              leaf={leaf}
              leafWidth={layout.leafWidth}
              leafHeight={layout.leafHeight}
              bgColor={bgColor}
            />
            <figcaption className="mt-1.5 text-center text-xs text-ink/40">
              Leaf {leaf.index + 1}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
