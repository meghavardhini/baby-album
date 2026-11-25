/**
 * The deterministic layout engine (brief §5).
 *
 *   1. Photos arrive already sorted chronologically (EXIF capture date, then
 *      upload order as the tiebreaker). `sortPhotos` re-asserts that order so
 *      the engine never depends on the caller.
 *   2. Walk the theme's leaves in order. For each leaf, look at the next N
 *      photos (N = that leaf's slot count) and choose, from the archetype
 *      library, the same-slot-count layout whose slot orientations best match.
 *   3. Assign those photos to that layout's slots and advance the queue.
 *
 * No AI, no generative layout — just routing into pre-designed slots.
 */

import type {
  Archetype,
  AlbumLayout,
  EnginePhoto,
  PlacedLeaf,
  PlacedSlot,
  PhotoOrientation,
  SlotOrientation,
  ThemeTemplate,
} from "./types";

/** Chronological order: capture date ascending, undated photos last, then
 *  upload order as a stable tiebreaker. Mirrors the preview grid (brief §5.1). */
export function sortPhotos<T extends { takenAt: string | null }>(
  photos: (T & { uploadIndex?: number })[],
): (T & { uploadIndex?: number })[] {
  return [...photos].sort((a, b) => {
    const ta = a.takenAt ? Date.parse(a.takenAt) : NaN;
    const tb = b.takenAt ? Date.parse(b.takenAt) : NaN;
    const aHas = !Number.isNaN(ta);
    const bHas = !Number.isNaN(tb);
    if (aHas && bHas && ta !== tb) return ta - tb;
    if (aHas !== bHas) return aHas ? -1 : 1; // dated before undated
    return (a.uploadIndex ?? 0) - (b.uploadIndex ?? 0);
  });
}

/** How well a photo's orientation fits a slot's preferred orientation.
 *  1 = ideal, 0.5 = acceptable (square photos bend either way), 0 = poor. */
function orientationScore(
  slot: SlotOrientation,
  photo: PhotoOrientation | null | undefined,
): number {
  if (slot === "any") return 1;
  if (!photo) return 0.5; // unknown orientation — neutral
  if (photo === slot) return 1;
  if (photo === "square" || slot === "square") return 0.5;
  return 0; // portrait photo in landscape slot, or vice versa
}

/**
 * Pick the best archetype of a given slot count for the upcoming photos.
 * Deterministic: highest total orientation score wins; ties break by the
 * archetype's order in the library (stable, predictable output).
 */
export function chooseArchetype(
  archetypes: Archetype[],
  slotCount: number,
  orientations: (PhotoOrientation | null)[],
): Archetype {
  const candidates = archetypes.filter((a) => a.slotCount === slotCount);
  if (candidates.length === 0) {
    throw new Error(`No archetype with ${slotCount} slot(s) in the library.`);
  }

  let best = candidates[0];
  let bestScore = -Infinity;
  for (const arche of candidates) {
    let score = 0;
    for (let i = 0; i < arche.slots.length; i++) {
      score += orientationScore(arche.slots[i].orientation, orientations[i]);
    }
    if (score > bestScore) {
      bestScore = score;
      best = arche;
    }
  }
  return best;
}

/**
 * Build the full album layout: assign every photo to a slot across the 30
 * leaves. When there are fewer photos than slots (under-cap), trailing slots
 * are left empty (photo = null) — the preview shows them so the customer sees
 * what's missing. Behaviour for under-cap submission is still an owner decision
 * (brief §13); this just renders it honestly.
 */
export function buildAlbum(
  template: ThemeTemplate,
  photos: EnginePhoto[],
): AlbumLayout {
  const queue = sortPhotos(photos);
  const leaves: PlacedLeaf[] = [];

  let cursor = 0;
  let filledSlots = 0;
  let totalSlots = 0;

  for (const leaf of template.leaves) {
    const n = leaf.slotCount;
    totalSlots += n;

    const next = queue.slice(cursor, cursor + n);
    const orientations = next.map((p) => p.orientation ?? null);
    const archetype = chooseArchetype(template.archetypes, n, orientations);

    const slots: PlacedSlot[] = archetype.slots.map((slot, i) => {
      const photo = next[i] ?? null;
      if (photo) filledSlots += 1;
      return { slot, photo };
    });

    leaves.push({ index: leaf.index, archetypeId: archetype.id, slots });
    cursor += n;
  }

  return {
    leaves,
    leafWidth: template.leafWidth,
    leafHeight: template.leafHeight,
    totalSlots,
    filledSlots,
    photoCount: photos.length,
  };
}
