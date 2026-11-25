/**
 * PLACEHOLDER theme templates (brief §5 + §12).
 *
 * This file stands in for what your design team will deliver: for each theme, a
 * set of 30 leaves (background art + a JSON slot map per leaf) plus the
 * archetype library. Here we generate that structure procedurally with plain
 * coloured placeholder backgrounds and sensible slot maps, so the engine and
 * preview are fully testable today. When the real art + slot maps arrive, they
 * replace this module and NOTHING in the engine changes.
 */

import type { Archetype, LeafSpec, ThemeTemplate } from "./types";

const LEAF_COUNT = 30; // brief §1: 30 leaves per album
const LEAF_W = 1200;
const LEAF_H = 1200; // square keepsake leaf (final dims come from the printer, §8)

const M = 64; // margin
const G = 40; // gap between slots

// Inner content box (within margins) and half-width/height for 2-ups.
const INNER_W = LEAF_W - 2 * M; // 1072
const INNER_H = LEAF_H - 2 * M; // 1072
const HALF_W = (INNER_W - G) / 2; // 516
const HALF_H = (INNER_H - G) / 2; // 516

/**
 * The archetype library (brief §5.4). Each entry is one candidate leaf layout.
 * The engine chooses among entries of the SAME slot count by orientation fit.
 *   1 slot: a portrait hero (full-bleed) OR a framed landscape
 *   2 slot: two-portrait, two-landscape, or portrait+landscape
 *   4 slot: a 4-up grid that holds any mix
 */
const ARCHETYPES: Archetype[] = [
  // --- 1 slot ---
  {
    id: "hero-portrait",
    slotCount: 1,
    slots: [
      { id: "s1", x: 0, y: 0, w: LEAF_W, h: LEAF_H, orientation: "portrait", fullBleed: true },
    ],
  },
  {
    id: "framed-landscape",
    slotCount: 1,
    slots: [
      { id: "s1", x: M, y: 360, w: INNER_W, h: 480, orientation: "landscape" },
    ],
  },
  // --- 2 slot ---
  {
    id: "two-portrait",
    slotCount: 2,
    slots: [
      { id: "s1", x: M, y: M, w: HALF_W, h: INNER_H, orientation: "portrait" },
      { id: "s2", x: M + HALF_W + G, y: M, w: HALF_W, h: INNER_H, orientation: "portrait" },
    ],
  },
  {
    id: "two-landscape",
    slotCount: 2,
    slots: [
      { id: "s1", x: M, y: M, w: INNER_W, h: HALF_H, orientation: "landscape" },
      { id: "s2", x: M, y: M + HALF_H + G, w: INNER_W, h: HALF_H, orientation: "landscape" },
    ],
  },
  {
    id: "portrait-landscape",
    slotCount: 2,
    slots: [
      { id: "s1", x: M, y: M, w: HALF_W, h: INNER_H, orientation: "portrait" },
      { id: "s2", x: M + HALF_W + G, y: 360, w: HALF_W, h: 480, orientation: "landscape" },
    ],
  },
  // --- 4 slot ---
  {
    id: "grid-4",
    slotCount: 4,
    slots: [
      { id: "s1", x: M, y: M, w: HALF_W, h: HALF_H, orientation: "any" },
      { id: "s2", x: M + HALF_W + G, y: M, w: HALF_W, h: HALF_H, orientation: "any" },
      { id: "s3", x: M, y: M + HALF_H + G, w: HALF_W, h: HALF_H, orientation: "any" },
      { id: "s4", x: M + HALF_W + G, y: M + HALF_H + G, w: HALF_W, h: HALF_H, orientation: "any" },
    ],
  },
];

/**
 * Build the fixed 30-leaf slot-count profile that sums to `totalSlots`
 * (= the theme's upload cap). Mix of 1-, 2- and 4-slot leaves, evenly spread
 * so heroes and grids don't clump. Deterministic.
 */
function buildLeafProfile(leafCount: number, totalSlots: number): number[] {
  // Decide how many leaves of each size. Start from all 1-slot, then add the
  // remaining slots using some 4-ups and the rest 2-ups.
  const extra = Math.max(totalSlots - leafCount, 0); // slots beyond one-per-leaf
  let four = Math.min(Math.floor(extra / 6), leafCount); // a handful of grids
  let two = extra - 3 * four; // each 2-up adds 1 slot over the base 1
  // Clamp if the arithmetic overshoots the available leaves.
  if (two > leafCount - four) {
    two = leafCount - four;
  }
  if (two < 0) {
    two = 0;
    four = Math.min(Math.floor(extra / 3), leafCount);
  }
  const one = leafCount - four - two;

  const groups = [
    { size: 1, count: one },
    { size: 2, count: two },
    { size: 4, count: four },
  ].filter((g) => g.count > 0);

  // Even spread (Bresenham-style): each group's items land at regular intervals.
  const state = groups.map((g) => ({
    size: g.size,
    count: g.count,
    acc: 0,
    step: leafCount / g.count,
  }));

  const out: number[] = [];
  for (let i = 0; i < leafCount; i++) {
    // Prefer a group that is "due" (acc <= i); otherwise the one with the most left.
    let pick = -1;
    let bestDue = Infinity;
    state.forEach((s, idx) => {
      if (s.count <= 0) return;
      if (s.acc <= i && s.acc < bestDue) {
        bestDue = s.acc;
        pick = idx;
      }
    });
    if (pick === -1) {
      let most = -1;
      state.forEach((s, idx) => {
        if (s.count > most) {
          most = s.count;
          pick = idx;
        }
      });
    }
    const s = state[pick];
    out.push(s.size);
    s.count -= 1;
    s.acc += s.step;
  }
  return out;
}

/**
 * Get the placeholder template for a theme. `uploadCap` is the theme's total
 * slot count (brief §5.5) — the leaf profile sums to it.
 */
export function getThemeTemplate(slug: string, uploadCap: number): ThemeTemplate {
  const profile = buildLeafProfile(LEAF_COUNT, uploadCap);
  const leaves: LeafSpec[] = profile.map((slotCount, index) => ({ index, slotCount }));

  return {
    slug,
    leafWidth: LEAF_W,
    leafHeight: LEAF_H,
    leaves,
    archetypes: ARCHETYPES,
  };
}
