# Baby Memory Album — Build Brief for Claude Code

Save this file as `CLAUDE.md` in the project root so you (Claude Code) read it automatically every session. Treat it as the source of truth for what we're building and how.

---

## 1. What we're building

A web app where a parent turns a year of their child's photos into a beautifully designed, themed physical photo album (30 leaves). Flow in one line: the customer picks a theme, uploads a fixed number of photos, our engine auto-places them into a pre-designed themed layout, the customer tweaks and approves, pays, and we generate a print-ready file that goes to a physical printer. We then pack and courier the finished album.

Target customer: parents of young kids. Price point ₹2,000 for 30 leaves. No refunds. This is an emotional keepsake, so the printed object must feel premium.

## 2. How to work with me

- **Confirm the stack with me before scaffolding.** My suggested default is below; propose changes if you have a strong reason.
- **Build in the phases in section 11.** Finish and let me test each phase before moving on. Do not jump ahead to payments or print-export while the core is unproven.
- **Ask before any irreversible or money/data decision** (deleting data, going live with payments, changing storage retention).
- **Never invent the print spec or the visual design.** Both come from humans (see section 10 and section 12). Where a value is unknown, read it from config and leave a clearly-marked `TODO`.
- **Test against real, messy data**, not happy-path samples: HEIC files from iPhones, huge files, wrong photo counts, low-resolution images.
- Keep secrets (payment keys, DB credentials) in environment variables, never in code.

## 3. Suggested stack (confirm before building)

- **Framework:** Next.js (React, full-stack) — one codebase for UI + API.
- **Backend-as-a-service:** Supabase (Postgres + auth + file storage in one), chosen to keep operations simple for a small, non-DevOps team. Open to alternatives.
- **Payments:** Razorpay (India).
- **Image processing + PDF export:** Sharp for image handling; a server-side PDF generator (pdf-lib, or headless Chromium rendering) for the print file.
- **Hosting:** Vercel or similar, with the database/storage on Supabase.

Prioritise a setup that one or two non-DevOps people can deploy and maintain.

## 4. The customer flow (end to end)

1. Sign in / create account.
2. Pick a theme (e.g. jungle, aquatic, cartoon).
3. Upload photos — hard-capped at the theme's total slot count (see section 5).
4. Engine auto-arranges photos into the theme's leaves and shows the full album preview.
5. Customer can, per leaf: swap which photo is in a slot, and drag to reposition a photo inside its slot (to frame the face).
6. Customer approves and pays. No refunds after payment.
7. We generate the print-ready file and send it to the printer. (Order appears in an admin dashboard.)

## 5. The engine (the deterministic core — be precise here)

The engine does **no AI and no generative layout.** It only routes photos into pre-designed slots. Logic:

1. **Sort** all uploaded photos by capture date (read EXIF timestamp; fall back to file order if missing). The album should flow chronologically, Jan → Dec.
2. **Read the slot maps** for the chosen theme. Each leaf template is defined by data, not code (see template format below).
3. **Walk the leaves in order.** For each leaf, look at the orientations of the next N photos in the sorted queue (N = that leaf's slot count) and choose, from the theme's **archetype library**, the leaf layout whose slot orientations best match those photos. Then assign those photos to that leaf's slots and advance the queue.
4. **Archetype library** (per theme) — a small, reusable set of leaf layouts, tagged by what they hold:
   - 1 portrait (full-bleed hero page)
   - 1 landscape (framed in the scene)
   - 2 portrait
   - portrait + landscape
   - 2 landscape
   - 4-up grid (holds any mix) These recombine to cover essentially any upload. Portrait-heavy layouts are the workhorses — most baby phone photos are portrait.
5. The **upload cap equals the total number of slots** across the 30 leaves for that theme, so every uploaded photo is used and no slot is left empty. (Exact number is derived from the templates, \~55–60. Make it config, not hardcoded.)

### Template format (the clean boundary between design and code)

Each leaf template is: a background image (the themed art, designed by us) + a JSON slot map. Example:

```json
{
  "theme": "jungle",
  "leafId": "jungle-portrait-landscape-01",
  "background": "jungle-pl-01.png",
  "slots": [
    { "id": "s1", "x": 40, "y": 30, "w": 520, "h": 740, "orientation": "portrait", "fullBleed": false },
    { "id": "s2", "x": 600, "y": 260, "w": 900, "h": 520, "orientation": "landscape", "fullBleed": false }
  ]
}
```

This lets us add new themes and leaves by dropping in art + a slot map, with no engine changes. Build the engine to consume this format.

### Photo fit, cropping, and the resolution warning

- A photo fills its slot with cover-crop; the reposition control (section 4.5) moves the photo within the slot.
- **Resolution check:** required pixels for a slot = slot's printed size in inches × 300. If the uploaded photo's effective resolution for that slot is below this, show a non-blocking warning ("this photo may print blurry"). This matters most on full-bleed hero slots — do not skip it there.

## 6. Screens to build

- Auth (sign in / sign up)
- Theme picker
- Upload (with the hard cap and clear count feedback)
- Album preview + per-leaf editor (swap photo, reposition within slot, resolution warnings)
- Checkout / payment
- Order confirmation
- Admin dashboard (incoming orders, their status, download the print file)

## 7. Data model (sketch — refine as needed)

- `users`
- `themes` (and their archetype library + slot maps)
- `orders` (user, theme, status: draft → paid → sent_to_print → shipped)
- `order_photos` (uploaded files, EXIF date, resolution, which slot they're assigned to, reposition offset)
- `payments`

## 8. Print-ready export (the hardest part — treat the spec as sacred config)

Generate a print-ready file matching the **printer's exact spec.** These values come from our printer, not from you. Put them in a config file and leave `TODO` until I provide them:

- Page / leaf dimensions
- Bleed (likely \~3mm — confirm)
- Safe margin (keep faces/important content inside it)
- Gutter / binding allowance (so content near the spine isn't swallowed)
- Resolution: 300 DPI
- Colour profile: CMYK vs RGB — ask the printer
- Pages as spreads vs single pages — ask the printer
- Cover / binding photo: usually separate dimensions and wrap behaviour
- Output file format and naming convention the printer wants

Do not ship an export that guesses any of these. A wrong spec produces files that look fine on screen and print wrong — and we have no refunds.

## 9. Payments

- Razorpay integration. Order is only marked `paid` on confirmed payment webhook.
- No refunds after payment — the UI must make the "approve & pay is final" step explicit.
- Handle a payment that fails or is abandoned mid-order (keep the draft; don't lose their uploads).

## 10. Photo storage, privacy & retention (decide deliberately — these are other families' babies' photos)

- Store uploads in private buckets, not public URLs.
- Define and implement a **retention policy**: how long we keep photos after an order ships, and a way for a parent to delete their photos/account. I will give you the policy — do not pick a default silently.
- Don't log or expose image URLs unnecessarily.

## 11. Build order (phases — finish and let me test each before the next)

1. **Core intake:** project setup, auth, theme picker, capped upload, store photos, show them in a grid sorted by EXIF date. (Confirm stack with me first.)
2. **The engine:** archetype library + slot maps, orientation routing, auto-placement, full album preview.
3. **The editor:** swap photo per slot, drag-to-reposition within slot, resolution warnings.
4. **Payments:** Razorpay, the final-approval flow, order states, admin dashboard.
5. **Print export:** the PDF generator built to the printer's confirmed spec (section 8).
6. **Hardening:** edge cases (section 13), retention policy, real-data testing, deployment.

## 12. What is NOT your job

- **The visual design and templates.** We design the themed leaves (background art + the layout feel — e.g. portrait photos become full-bleed heroes, landscapes sit framed in the scene). You consume them via the template format. Don't invent aesthetics.
- **The print spec.** Comes from the printer (section 8).
- **Business decisions** (pricing, which themes, retention policy). Ask me.

## 13. Edge cases to handle

- HEIC/HEIF uploads (iPhone) — convert for display and processing.
- Very large files — limit and/or compress sensibly without wrecking print resolution.
- Fewer photos than slots — block submission or define filler behaviour (ask me).
- Corrupt/unreadable images.
- Missing EXIF date.
- Payment failure or abandonment mid-order.

## 14. Decisions I owe you (I will fill these in)

- [x] Final stack confirmation — see §15.
- [x] Payment provider confirmation (default: Razorpay) — confirmed Razorpay.
- [ ] Where photos live + **retention/deletion policy** (storage = Supabase private bucket, Mumbai; retention policy value still owed).
- [ ] The printer's full spec (section 8).
- [ ] Exact slot total per theme (from the finished templates) = the upload cap. Placeholder `56` in config until then.
- [ ] Behaviour when a customer uploads fewer photos than slots.

---

## 15. Decisions log (updated as we build — newest at top)

> This section records choices made with the owner so future sessions don't re-litigate them. The brief above (§1–§14) remains the source of truth for scope.

### Stack — CONFIRMED (2026-11)
- **Framework:** Next.js (App Router) + TypeScript. One codebase, UI + API.
- **Data / auth / storage:** **Supabase**, project hosted on **AWS ap-south-1 (Mumbai)** for Indian-families' data residency. Supabase runs on AWS, so this is "managed bundle on AWS," not a different cloud. Per-user isolation is enforced by Postgres **Row-Level Security** + a private storage bucket with per-user folder paths.
- **Heavy compute (Phase 5 print/PDF):** **AWS Fargate** worker, added when we reach Phase 5 — serverless is a poor fit for headless Chromium. Not built yet.
- **Payments:** Razorpay (Phase 4, not built yet).
- **Auth method:** **magic link (passwordless email OTP)** — no passwords/reset flows.
- **Rationale:** owner has DevOps capacity (so simplicity wasn't the deciding factor), but the project's risk lives in the engine + print quality, not infra. Supabase gets a privacy-correct data layer fast and cheap (~$25/mo), on AWS, with a bounded migration path to full-AWS-native later if scale/compliance ever forces it. Cost at pilot scale was a wash between the two; the deciding factors were speed-to-validate + data residency + where DevOps effort is best spent (the Fargate print pipeline).

### Phase 1 — BUILT (awaiting owner test)
- Scope delivered: magic-link auth + route gating, theme picker (placeholder themes seeded in DB), capped direct-to-private-storage upload, server-side EXIF read + HEIC→WebP display-derivative generation + resolution capture, EXIF-sorted preview grid, per-photo delete.
- Upload cap: `NEXT_PUBLIC_UPLOAD_CAP` (placeholder **56**), and per-theme `themes.slot_count` (also 56). Server enforces the cap as source of truth.
- Bandwidth control (applies to all later phases): previews serve **downscaled WebP derivatives via signed URLs**, never full-res originals. Originals kept untouched for print.
- Phase 1 runs **without** the service-role key — all processing happens as the signed-in user under RLS. `SUPABASE_SERVICE_ROLE_KEY` is wired in `src/lib/supabase/admin.ts` for later background jobs (retention, Fargate worker).
- NOT built (later phases): the engine, the editor, payments, print export, retention automation.

### Still owed by owner (blocks later phases, not Phase 1)
- Retention/deletion policy value (§10) — needed for Phase 6; do not pick a default silently.
- Printer's full spec (§8) — needed for Phase 5.
- Real slot total per theme from finished templates (§5) — replaces the `56` placeholder.
- Under-cap submission behaviour (§13) — needed when we build album submission (Phase 2+).
