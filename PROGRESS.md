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
  - [x] 4b Stock: supplier modal (buy 10–18 coins) + inventory; tap empty slot = place modal (choose pot tier); tap occupied slot = manage modal (info + move grid); pot tiers (Nursery free/+0%, Terracotta 3/+20%, Ceramic 8/+50%, Designer 15/+100%) chosen at placement, color-coded, bonus multiplies sale price; sold plants leave empty slots (no auto-restock)
  - [x] Open/Close days: start closed; "Open Shop" → 20 customers/day, serve + water only (no management); auto-close after 20 with day summary; "Close" early anytime; day counter; time (growth/water) runs in both phases
- [ ] **Step 4c — Repot & pot sizes (designed, not built).** Repot = stage-up (root-bound "!" → repot to 2"/4"/6"); pot stash (old pots reused free); size × tier pricing; economy pass (mandatory repot costs vs mature sale prices). Build after sprites land + loop tests.
- [ ] **Step 5 — Zone gameplay.** Light tiers matter per zone (sun icons, droop-before-death).
- [ ] **Step 6 — City + seasons.** Pick city → seasonal clock on the glass wall.
- [ ] **Step 7 — Chore fixes.** Self-watering pots, shop-wide watering system, grow lights.
- [ ] **Step 8 — Decoration + day/night.**
- [ ] **Step 9 — Wire the scanner.** Two cases (simplified 2026-10-20): plant + tag → OCR cultivar unlock; tagless plant → classifier pre-fills the name when confident (else user types it) → DB compare → match + confirm → claim (one visual plant = one claim), no match → send request.
- [ ] **Step 10 — Chase layer.** Variegation discovery, cultivar collectibles, phone orders, customization.
- [ ] **Step 11 — Feel pass + TestFlight.**

V1 excludes: cultivar-level scanning, shop relocation, social, story.

## Locked design decisions (2026-10-19 discussion)

- **Customers** wait at the checkout counter (coffee-shop style, not browsing). Dialogue card + patience bar.
- **Request types:** (a) specific plant(s); (b) requirements → player suggests → graded 1–3 stars by **deterministic trait overlap** (no embeddings/NLP — both sides are structured data).
- **Interactions (reworked 2026-10-19):** tap plant (open) = select → presents on the counter → drag to the customer to serve; watering is the watering-can tool (tap can, tap plants, tap can to stow); tap (closed) = slot manage modal; drag in closed = move/swap. Tools (can now, trowel/scissors later) own the chores so taps never overload.
- **Refuse** (wrong species for a specific request) = no sale, no coins; plant snaps back; patience keeps draining. The clock is the penalty.
- **Repot & pot sizes (designed 2026-10-19, Ngoc's proposal + Muse refinement):** growth stages map to pot sizes 2"→4"→6"; the repot IS the stage-up (growth meter fills → root-bound, "!" shows, growth pauses → repot to next size advances the stage). No punishment timer, no death — the plant waits. Pots are two-dimensional (size × tier, shown as e.g. "Terracotta 4in"). Repotting frees the old pot into a reusable stash; new sprouts use stashed pots free; buy only when the stash is empty. On sale, the current pot leaves with the plant + bonus. Economy to re-balance at build time (repots are mandatory costs; size can carry part of the price bonus).
- **Patience** varies per customer (values tbd).
- **Grading** is explainable (✓/✗ per requirement), offline, tunable.

## Changelog

- **2026-10-20** — Supplier modal fixed: it couldn't scroll or close (plain View, no ScrollView; content outgrew the 85% height cap when shelves were added, pushing the Close button off-screen, and the backdrop took no taps). Now the rows live in a ScrollView, Close is pinned below it, and tapping the dimmed backdrop closes the modal.
- **2026-10-20** — Scanner design simplified to two cases: plant + tag = straightforward OCR cultivar unlock; tagless plant = user types a name → DB compare → match + user confirm → claim. One visual plant = one claim (two cuttings from the same mother count as the same plant — intentional); no match → send a request. Replaces the classifier top-3 confirm as the primary tagless path and un-parks a simplified owner-confirm flow. Classifier pre-fill confirmed the same night (Ngoc): when confident, the name field comes pre-filled and the user just confirms or edits.
- **2026-10-20** — Shelf placement rebuilt as 4 light zones (one shelf per zone, an upgrade). Window = bright direct, Left Wall = bright indirect, Right Wall = medium, Showcase = low. Assign a bought shelf to a zone in the 🪑 Shelves panel; it snaps in and brings its own slots (starters keep built-in ids 0–7). Only while the zone is empty — the old shelf returns to storage. Deleted the decorate-drag prototype (decorate mode, tray drag, wall overlap, door zone, footprint). One Wall Ledge starts in storage; Showcase starts empty. `src/data/shelves.ts` holds zones + 3 shelf defs; `src/scene/ShelfSprite.tsx` is the placeholder art Ngoc will replace.

- **2026-10-19** — Serve + watering reworked. Background is now Ngoc's single image (`assets/background`); room re-anchored (customer behind the counter left, slots = 2 sill + 4 floor + 2 counter). **Serve = tap plant → it glides to a presentation spot on the counter (1.15×, name pill) → drag the short hop to the customer**; only the presented plant is draggable in open; wrong plant flies home on refuse. **Watering can tool** (tap can → watering mode: water gauges on all plants, taps water; tap can again to stow; infinite). Tap no longer waters directly; a presented plant gets a 💧 button. Plant states now crossfade (~450ms) instead of snapping. Interaction bugs fixed along the way: modal taps no longer water plants behind them (scene gesture disabled while a modal is open), taps moved to a real Tap gesture with a foliage-covering hitbox.
- **2026-10-19** — Customer sprites wired: 41 customers × 3 moods (happy/neutral/upset) from `assets/customers`, random per spawn, mood swaps on serve/timeout (preloaded, instant). Repot & pot-size system designed (repot = stage-up, pot stash, size × tier) — documented in DESIGN.md, queued as Step 4c.
- **2026-10-19** — Scaffold runs on device. Fixed: `useAnimatedStyle` handle must go to `Animated.View` (was crashing); Skia `Ellipse` export broken in this install (leaves = `Circle` for now); stale Metro bundle mimicked a particle bug. Layout pivoted from pan-between-zones to GPGP one-room (Ngoc's call). Slot system: snap + swap-on-occupied + spring-back; sparkle only on the player's drop. Design locked: counter customers, tap/slot-modal/drag-serve model, deterministic grading.
