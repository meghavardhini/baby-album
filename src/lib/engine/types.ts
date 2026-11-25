/**
 * Engine types (brief §5). The engine is deterministic: no AI, no generative
 * layout. It routes photos into pre-designed slots.
 *
 * The clean design/code boundary (brief §5 "Template format"):
 *   - A ThemeTemplate is pure DATA: leaf structure + archetype library + slot
 *     coordinates. Your design team supplies the real version (background art +
 *     slot maps); the engine code never changes to add a theme or a leaf.
 *   - For Phase 2 we generate PLACEHOLDER templates so the flow is testable.
 */

export type SlotOrientation = "portrait" | "landscape" | "square" | "any";
export type PhotoOrientation = "portrait" | "landscape" | "square";

/** One photo slot on a leaf. Coordinates are in the leaf's own pixel canvas
 *  (leafWidth × leafHeight); the UI scales them to whatever size it renders. */
export type Slot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: SlotOrientation;
  /** Full-bleed slots run to the leaf edge (hero pages). */
  fullBleed?: boolean;
};

/** A reusable leaf layout from the theme's archetype library (brief §5.4). */
export type Archetype = {
  id: string;
  slotCount: number;
  slots: Slot[];
};

/** One leaf position in the album, with its fixed slot count. The engine picks
 *  which same-slot-count archetype to use based on the upcoming photos. */
export type LeafSpec = {
  index: number;
  slotCount: number;
};

/** A whole theme's template: 30 leaves + the archetype library. */
export type ThemeTemplate = {
  slug: string;
  leafWidth: number;
  leafHeight: number;
  leaves: LeafSpec[];
  archetypes: Archetype[];
};

/** A photo as the engine consumes it. */
export type EnginePhoto = {
  id: string;
  orientation: PhotoOrientation | null;
  displayUrl: string | null;
  takenAt: string | null;
  name: string | null;
};

export type PlacedSlot = {
  slot: Slot;
  /** null = an empty slot (happens only when fewer photos than slots). */
  photo: EnginePhoto | null;
};

export type PlacedLeaf = {
  index: number;
  archetypeId: string;
  slots: PlacedSlot[];
};

export type AlbumLayout = {
  leaves: PlacedLeaf[];
  leafWidth: number;
  leafHeight: number;
  totalSlots: number;
  filledSlots: number;
  photoCount: number;
};
