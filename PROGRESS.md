# GreenThumb — Progress Tracker

Living build log. Updated as steps land.

## Build plan (revised 2026-10-19)

- [x] **Step 0 — Pilot classifier.** MobileNetV3-Large, test top-1 86.7% / top-3 95.7%. Scanner viability confirmed.
- [x] **Step 1 — Content audit.** 78 species checked; launch cut = 71 at ≥1,000 iNat observations. (`~/workspace/plant-shop-game/plant-catalog-audit.md`)
- [x] **Step 2 — Scaffold.** Expo SDK 57 + Skia 2.6.2 + Reanimated 4.5.1 at `~/Documents/Projs/Green_Thumb`. One-room GPGP layout.
- [~] **Step 3 — Customer loop (in progress).**
  - [x] Room: back wall (brick | glass | timber) + shelves, one fixed screen, no camera
  - [x] 8 slots (6 wall + 2 featured on counter), drag pots, sparkle burst, idle sway
  - [x] Checkout counter at screen bottom (ref: cafe-game screenshot 2026-10-19)
  - [x] Customer sprite + dialogue card + segmented patience bar (45s)
  - [x] Request types: specific plant | requirements (graded 1–3 stars, deterministic trait match)
  - [x] Drag plant → customer = serve; wrong species / 0 traits = refuse (no sale, snap back)
  - [x] Coins (top-right counter); sold plants auto-restock after 900ms (temporary)
  - [x] Shelf markers with species names; leaf color varies per species
- [x] **Step 4 — Tend & stock.**
  - [x] 4a Tend: water meter (drains ~60s) + growth stages (sprout/growing/mature, ~25s/stage, only when watered); tap plant = water (blue droplets); "!" attention marker (thirsty only for now — trim/repot plug in later); sell anytime with maturity scaling (sprout 30% / growing 60% / mature 100%)
  - [x] 4b Stock: supplier modal (buy 10–18 coins) + inventory; tap empty slot = place modal (choose pot tier); tap occupied slot = manage modal (info + water + move grid); pot tiers (Nursery free/+0%, Terracotta 3/+20%, Ceramic 8/+50%, Designer 15/+100%) chosen at placement, color-coded, bonus multiplies sale price; sold plants leave empty slots (no auto-restock)
  - [x] Open/Close days: start closed; "Open Shop" → 20 customers/day, serve + water only (no management); auto-close after 20 with day summary; "Close" early anytime; day counter; time (growth/water) runs in both phases
- [ ] **Step 5 — Zone gameplay.** Light tiers matter per zone (sun icons, droop-before-death).
- [ ] **Step 6 — City + seasons.** Pick city → seasonal clock on the glass wall.
- [ ] **Step 7 — Chore fixes.** Self-watering pots, shop-wide watering system, grow lights.
- [ ] **Step 8 — Decoration + day/night.**
- [ ] **Step 9 — Wire the scanner.** Plant scan → species unlock; tag scan → cultivar unlock.
- [ ] **Step 10 — Chase layer.** Variegation discovery, cultivar collectibles, phone orders, customization.
- [ ] **Step 11 — Feel pass + TestFlight.**

V1 excludes: cultivar-level scanning, shop relocation, social, story.

## Locked design decisions (2026-10-19 discussion)

- **Customers** wait at the checkout counter (coffee-shop style, not browsing). Dialogue card + patience bar.
- **Request types:** (a) specific plant(s); (b) requirements → player suggests → graded 1–3 stars by **deterministic trait overlap** (no embeddings/NLP — both sides are structured data).
- **Interactions:** tap plant = water (if thirsty) else slot modal; tap slot = manage modal (swap/place); drag plant → customer = serve; drag elsewhere = spring back. No free drag-to-rearrange.
- **Refuse** (wrong species for a specific request) = no sale, no coins; plant snaps back; patience keeps draining. The clock is the penalty.
- **Patience** varies per customer (values tbd).
- **Grading** is explainable (✓/✗ per requirement), offline, tunable.

## Changelog

- **2026-10-19** — Scaffold runs on device. Fixed: `useAnimatedStyle` handle must go to `Animated.View` (was crashing); Skia `Ellipse` export broken in this install (leaves = `Circle` for now); stale Metro bundle mimicked a particle bug. Layout pivoted from pan-between-zones to GPGP one-room (Ngoc's call). Slot system: snap + swap-on-occupied + spring-back; sparkle only on the player's drop. Design locked: counter customers, tap/slot-modal/drag-serve model, deterministic grading.
