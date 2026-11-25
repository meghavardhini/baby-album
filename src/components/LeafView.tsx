import type { PlacedLeaf } from "@/lib/engine/types";

/**
 * Renders one leaf: the themed background (a coloured placeholder for now —
 * real art slots in later) with each photo cover-cropped into its slot at the
 * slot-map coordinates. Coordinates are % of the leaf canvas, so it scales to
 * any rendered size.
 */
export function LeafView({
  leaf,
  leafWidth,
  leafHeight,
  bgColor,
}: {
  leaf: PlacedLeaf;
  leafWidth: number;
  leafHeight: number;
  bgColor: string;
}) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5"
      style={{
        aspectRatio: `${leafWidth} / ${leafHeight}`,
        // Placeholder "art": a soft themed wash. Swap for the real background
        // image when the design team delivers it.
        background: `linear-gradient(135deg, ${bgColor} 0%, ${bgColor}cc 100%)`,
      }}
    >
      {leaf.slots.map((ps, i) => {
        const { slot, photo } = ps;
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${(slot.x / leafWidth) * 100}%`,
          top: `${(slot.y / leafHeight) * 100}%`,
          width: `${(slot.w / leafWidth) * 100}%`,
          height: `${(slot.h / leafHeight) * 100}%`,
        };

        if (!photo || !photo.displayUrl) {
          return (
            <div
              key={slot.id + i}
              style={style}
              className="flex items-center justify-center rounded-md border-2 border-dashed border-white/60 bg-white/10"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-white/80">
                empty
              </span>
            </div>
          );
        }

        return (
          <div
            key={slot.id + i}
            style={style}
            className={slot.fullBleed ? "" : "overflow-hidden rounded-md ring-1 ring-black/10"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.displayUrl}
              alt={photo.name ?? "Album photo"}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
