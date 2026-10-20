# GreenThumb — Design Decisions (2026-10-19)

Everything discussed and agreed on for the cozy plant shop game. Living doc.

## Concept

- Mobile plant shop sim. The phone camera is the moat: Leafy Corner (the $9.99
  PC/console reference, 99.6% positive) can't do real-life scanning.
- Spine: **scan → identify → unlock → grow → sell**.
- Design language: **every systemic friction gets a purchasable in-fiction
  solution** (self-watering pots, grow lights, shade).
- Orientation: **landscape**. The shop is one continuous panning space, not screens.

## Locked design decisions

### Watering (Leafy Corner's #1 complaint, killed at the root)
- Purchasable self-watering pots (early, single-plant).
- Shop-wide scheduled watering system (late, batch gesture).
- Reservoir refill stays as the one retained caretaking verb.
- Manual watering kept in the first hours so automation feels earned.

### Light & zones — ONE fixed room, GPGP-style (2026-10-19)
- The shop is a single dollhouse view: everything visible at once, no camera,
  no panning between screens. (An earlier pan-between-zones layout was cut —
  Ngoc: "like good pizza great pizza style, not navigating between screens.")
- Back wall = 3 sections: **brick wall** (left, low light) | **glass
  storefront** (center, high light, windows) | **timber wall** (right, low
  light). Foreground = **center court** table (medium light, highest customer
  visibility). Pots drag freely between shelf/table slots and snap in.
- 3-tier light needs shown visually (sun icons). Droop-before-death:
  mistake-as-lesson, then penalty.
- Grow lights are the purchasable fix for dark zones.

### City & seasons
- Player picks a US city (NOT real GPS); it drives a real seasonal clock.
- Miami (summer heat punishes the glass wall), Phoenix (desert sun, fast
  evaporation), Minneapolis (weak winter light), Seattle (grey winter →
  grow lights matter), San Diego (easy mode).
- The glass wall carries seasonal variation as a **gradient, not a gate**
  (no forced plant migration).
- Location is **permanent per save**; moving costs heavy currency +
  a "grand reopening" event.

### Catalog
- Curated **by iNaturalist CC-image availability**, not the reverse.
- Audit (78 species): 56 strong / 15 ok / 7 thin / 0 missing.
  **Launch cut = 71 species at ≥1,000 observations.**
- Thin tail is trendy-but-niche: Alocasia zebrina (133), Begonia rex (112),
  moth orchid (285).
- Taxonomy gotchas: query *Sansevieria trifasciata* (iNat hasn't adopted the
  Dracaena merge); dragon tree is *Dracaena reflexa*; African violet =
  *Streptocarpus ionanthus*; areca palm = *Chrysalidocarpus lutescens*.
  Display names follow the trade; training queries follow iNat.
- Training sources must be license-clean: Wikimedia Commons, Flickr CC API,
  GBIF. **No random Google-Images scraping for commercial training data.**

## Scanner design — simplified two-case pipeline (2026-10-20)

1. **Plant + plant tag → straightforward.** At stores, scan plant + tag as
   one ritual. OCR (Apple Vision, on-device) reads the nursery tag: a
   high-trust unlock of the cultivar, and the photo pair enters the
   training set.
2. **Plant with no tag → the user names it.** If the classifier is
   confident, it **pre-fills the name field** — the camera does the work,
   the user just confirms or edits. Otherwise the user types a name. The
   app compares it against the database. If it matches **and the user confirms**
   (shown the matched species with reference photos — "is this your
   plant?"), they **claim** it: species unlock, almanac entry, and a
   "wild specimen" tag. No match, or no confirm → the user can **send a
   request** (name + photo into a suggestion/identification queue for human
   curator review; unlocks nothing, touches no training data).
   - **One visual plant = one claim.** A plant can only be used to claim
     once — scanning the same plant again for a different species won't
     work. "Same plant" is visual similarity, intentionally fuzzy: two
     cuttings from the same mother read as the same plant, and that's the
     point, not a bug. A second identical pothos was never going to unlock
     anything new anyway; the rule only bites when one plant is spent on
     two different names.
   - The no-tag path never unlocks cultivars (the camera sees species, not
     pink).

### Cultivar discovery (Pink Princess example)
- Tag scan at a store (intended real-world path).
- In-game **variegation discovery**: your *P. erubescens* grows a pink leaf.
- Rare, expensive supplier stock (currency-sink escape valve).
- NOT via the no-tag path: typing "marble queen" on a golden pothos grants
  nothing. The guard is the DB compare + user confirm + one-claim-per-plant
  rule, not a vision judgment.

### Scanner/shop decoupling
- Scanner classifies **species only, never genus**. *P. hederaceum*,
  *P. erubescens*, and tree philodendron are separate classes; within-species
  cultivar variety is the dog-breeds problem, solved by training-data coverage.
- The shop sells **cultivars as variants**.
- Heartleaf philodendron vs golden pothos = "tricky pair" confirm-UI moment.

### Folded into V1 (was parked; simplified 2026-10-20)
- The old owner-confirm design (type name → DB autocomplete → reference
  photos → confirm → "owner-confirmed" unlock) became the no-tag path
  above, minus the trust tiers. The hard gates are now just two: the typed
  name must match a catalog species in the DB, and each visual plant can
  be claimed once.
- The "suggest this variety" queue survives as the **send-a-request**
  fallback on the no-tag path (demand-driven DB growth; the thin tail
  heals itself through play).
- Still parked: trust tiers, per-cultivar verification profiles,
  variegation color checks, embedding-similarity nudges.

## ML validation (done)

- Smoke test (frozen MobileNetV2, 10 species, 1,999 CC photos): top-1 64.5% /
  top-3 84.8%; pothos-vs-heartleaf 61.3%.
- Fine-tune pilot, Apple Silicon (MobileNetV3-Large, 20 epochs): **test top-1
  86.7% / top-3 95.7%**; lookalike pair 81.7%. **Scanner viability CONFIRMED.**
- Caveats: iNat photos are cleaner than user scans; 71 classes will be harder.
- Next ML milestones: full 71-species training run, then Core ML export for
  on-device iOS inference.

## Build plan (RN) — revised 2026-10-19, tracked in PROGRESS.md

0. Pilot classifier ✅
1. 71-species content audit ✅ (seed data authored 2026-10-20: plant-database.json, 41 species verified on thesill.com, APPROVED by Ngoc 2026-10-20; 30 fallback species cut by Ngoc; growth time stays global for V1)
2. Scaffold (Expo + Skia) ✅ — this folder, one-room GPGP layout
3. Customer loop (in progress): counter + customer + dialogue/patience + drag-to-serve + coins
- **Tend (4a, built 2026-10-19):** water meter per plant (~60s drain) + 3 growth stages (sprout/growing/mature, only when watered). Stage time is per-species since 2026-10-20: growth groups (fast/mid/slow from the plant database) × game hours per stage (1h/2h/4h; 1 game hour = 1 real minute, Ngoc's pick) — a stage takes 1m/2m/4m real time at full light. Replaces the original flat ~25s/stage. Tap plant = water (blue droplet burst). "!" attention marker: thirsty → water, root-bound → repot. Sell anytime: price scales with maturity (30%/60%/100%) — no mature-gate; selling babies at a loss emerges once buy prices exist (4b).
- **Repot & pot sizes (4c, designed 2026-10-19, not built):** repot IS the stage-up (growth meter fills → root-bound "!" → repot to next size advances the stage); sizes 2"/4"/6" × tiers (Nursery/Terracotta/Ceramic/Designer); old pots return to a reusable stash; sale carries the current pot's bonus. Sequences after sprites land and the loop tests clean.
5. Zone gameplay (light tiers matter)
6. City + seasons (ON HOLD 2026-10-20 — Ngoc)
7. Chore fixes (self-watering pots, watering system, grow lights)
8. Decoration + day/night
9. Wire the scanner
10. Chase layer (variegation, cultivars, phone orders, customization)
11. Feel pass + TestFlight

V1 excludes: cultivar-level scanning, shop relocation, social, story.

## Interaction model (locked 2026-10-19; serve + watering reworked 2026-10-19)

- **Phases:** CLOSED = buy / plant / move / water, no customers. OPEN = 20 customers/day, serve + water only, no management. Time (growth/water) runs in both. Day ends after 20 with a summary; "Close" early anytime.
- **Tap rules (no more overloaded tap):**
  - Tap (closed): empty slot = place modal (inventory + pot choice); occupied slot = manage modal (info + move grid). The can = watering.
  - Tap (open): a plant = **select → it glides to the presentation spot** on the counter (front, enlarged 1.15×, name pill) = your confirmation. Tap it again (or empty space) = send it home. Tap another = swap.
  - **Watering can tool:** tap the can (on the counter, right end) to pick it up; taps then water plants (water gauges appear on every plant); tap the can again (or serve) to put it down. Infinite for V1 (no capacity/refill). The can is placeholder Skia art for Ngoc to replace.
  - **Water needs are 3 categories, not seconds (Ngoc, 2026-10-20):** each species sits in one water group — low / medium / high — which sets how fast its meter drains and how much water it tolerates. **Overwatering makes a plant suffer too:** watering a plant that's already wet pushes it waterlogged — it droops (thirsty art), growth pauses, and it recovers as the meter drains back down. No death; the lesson is 'read the gauge before you tap', so spam-watering everything stops working.
  - A presented plant with water < 100% gets a **💧 button** by it — water in place, it stays presented.
- **Serve (open): drag the PRESENTED plant the short hop to the customer.** Only the presented plant is draggable in open (others don't grab). Drop in the customer zone = graded/sale/refuse as before; wrong plant = refuse → it flies home. Drop elsewhere = back to the presentation spot. Drag stays for arranging in closed (drag to slot = move/swap).
- Rationale: with interior design coming, plants will be small, scattered on shelves, and occluded by the customer/dialogue card. Precision-drag from anywhere breaks; **select → present → drag** keeps the tactile hand-over but the grab is always on a big plant in the open. Drag is the arrange verb (closed) and the hand-over verb (open), never a precision grab.
- **Tools are the grammar:** watering can = tap tool → tap target. Repot (trowel) and trim (scissors) will follow the same pattern instead of fighting over what a tap means.
- "!" marker = plant needs attention: thirsty → water; **root-bound → repot** (the two jobs the marker was designed for).
- **Pots are two-dimensional: size × tier.** Size = 2" / 4" / 6", tier = Nursery / Terracotta / Ceramic / Designer. UI shows both plainly ("Terracotta 4in").
- **Repot IS the stage-up.** Sprout in a 2" pot → growth meter fills → plant goes root-bound ("!"), growth pauses → repot to 4" = becomes "growing". Meter fills again → repot to 6" = "mature". No punishment timer, no death — the plant waits for you (the time gate is the growth meter, not a countdown).
- **Pot stash.** Repotting frees the old pot into a reusable stash; new sprouts go into stashed pots free. Buy a pot only when the stash is empty. On sale, the current pot leaves with the plant and its bonus applies.
- Economy note: repots are now mandatory costs, so mature sale prices need headroom — re-run the numbers at build time. Size can carry part of the price bonus (a 6" plant is visibly a bigger product than a 2" one).
- Sell anytime: price = sell_price × request_grade × maturity (30%/60%/100%) × (1 + pot bonus). No mature-gate; selling babies at a loss emerges from buy prices.
- Customers at the checkout counter (coffee-shop style): dialogue card + patience bar.
  Specific requests: wrong species = refuse (no sale, snap back, patience drains).
  Requirement requests: graded 1–3 stars by deterministic trait overlap (no embeddings/NLP).
- Patience varies per customer (values tbd).

## Shelf & interior placement (locked + built 2026-10-20, placeholder art)

- **4 light zones, 1 shelf per zone (an upgrade).** Window = bright direct light, Left Wall = bright indirect, Right Wall = medium, Showcase = low. Buying a shelf and assigning it to a zone swaps in the shelf's own plant slots (more spots); no dragging furniture. Assigning/removing is only allowed while the zone is EMPTY (same "clear it first" rule), so plants never dangle. The old shelf returns to storage; the zone's default surface is its starter.
- **Slots belong to shelves/zones, not free positions.** Starter slots keep the original built-in ids (0–7); bought-shelf slots get fresh ids from a counter (8+), never reused.
- **Player flow:** closed phase → "🪑 Shelves" panel → per zone, "Use [shelf]" from storage or "Remove" (empty only). Buy shelves in the supplier. One Wall Ledge starts in storage so the upgrade flow is testable immediately (Showcase starts empty — a natural first upgrade).
- Starter defs (`src/data/shelves.ts`, placeholder art in `src/scene/ShelfSprite.tsx`): Wall Ledge 25c / 2 slots, Tall Bookcase 90c / 6 slots, Display Stand 60c / 2 slots. Zone spots (cx/baseY fractions) are tunable against the background art.
- Supersedes the earlier decorate-drag design (deleted 2026-10-20): decorate mode, shelf-tray drag, wall-interval overlap, door-blocking, and the validity footprint are all gone.

## Zone gameplay — Step 5: light matters (locked 2026-10-20, built 2026-10-20)

- **Principle:** light gates *growth* the way water gates health. Mature plants don't care — light is a growing-phase puzzle, solved once per plant, not a maintenance chore.
- **Zone light levels (fixed 1–4):** Showcase 1 (low), Right Wall 2 (medium), Left Wall 3 (bright indirect), Window 4 (bright direct).
- **Species light ranges** live in the plant database — 41 species verified on thesill.com 2026-10-20 (`~/workspace/plant-shop-game/plant-database.json` + `plant-database-review.md`; APPROVED by Ngoc 2026-10-20, not yet wired in; the 30 fallback species were cut by Ngoc, incl. Aloe Vera — The Sill doesn't stock it; aloe's game values stand as shipped). Starter 6 per The Sill: Golden Pothos 1–3, Snake Plant 1–4, Boston Fern 2–3, Monstera 2–3, Pilea 2–4. Water categories from the same check: Pothos medium, Monstera medium, Snake low, Pilea medium, Fern medium, Aloe low.
- **Growth rule:** in range = full speed; 1 tier outside = half speed; 2+ outside = growth pauses (the plant waits; no death timer).
- **Teaching:** sun icons on supplier rows + the place modal; while dragging in closed phase, slot markers tint green/yellow/red by light match; a growing plant stuck 60s+ in bad light (closed-phase time only — the counter freezes while the shop is open, when plants can't be moved) gets an amber sun badge (distinct from the red thirsty "!") and its pill says which way to move ("needs more light — try the window" / "too much sun — pull it back").
- **Droop (Ngoc's call):** a plant left in bad light long enough visibly droops — reuses the thirsty art even when watered; moving it to good light recovers it in seconds. No light-based death.
- **Grow lights stay in Step 7** (buy one per zone → that zone counts +1 light level).
- **Cities ON HOLD (Ngoc, 2026-10-20):** Step 6 city/season differences are held — zone light is a fixed base level for now; no city/season modifier plumbing in Step 5.
- **Out of scope:** sales/visibility bonuses per zone (parked).

## Condition pricing (designed + built 2026-10-20)

Sale price gains a condition factor, based on the sprite state at the moment of sale (the same state the player sees — `plantSpriteKey`):

- **Healthy → ×1**
- **Thirsty → ×0.8** (water < 0.35; waterlogged and bad-light droop also show as thirsty)
- **Half-dead → ×0.5** (water ≤ 0.02)

Multiplies into the existing price (sell × stars × maturity × pot bonus × condition). Until now condition was purely cosmetic (growth pause + art); this gives care an economic consequence while staying a recoverable nudge, not a punishment. Facts that shaped it: half-dead is a water-only state, can occur in either phase (water drains while open too), and is fixable during open hours with one watering tap (can, or the presented plant's 💧 button). Bad-light droop cannot be fixed while open (plants can't move; the counter freezes), but it only ever prices at the thirsty tier, never half-dead.

## Fertilizer & soil (designed 2026-10-20, not built)

Rule for both: decisions, not chores — the Leafy Corner complaint pattern is recurring maintenance (watering at scale), never depth. Anything that becomes daily upkeep is out.

**Fertilizer — a consumable boost, never a requirement.** Bought item, applied to one plant: that plant grows ~+50% faster for its current stage. Value is strategic timing (worth it on a slow grower like the snake plant at 4h/stage; pointless on a pothos). No fertilizer meter, no penalty for never using it.

**Soil — a placement choice, like pot tiers.** Chosen when a plant is placed; changeable at repot (Step 4c — repotting is when soil really changes). Three soils, matched against the species' water category:

- **Standard** — no change.
- **Moisture-retentive** — water drains ~20% slower (suits medium/high-water species).
- **Gritty / fast-drain** — harder to overwater: the waterlogged threshold rises (suits low-water species like snake plant and aloe).

Right soil for the species = a small edge; wrong soil = a small handicap (drains slightly faster). Zero upkeep after the choice. Effects are deliberately slight — real, not just cosmetic, but never a gate.

## Plant sprite plan (2026-10-19)

- **8 transparent plant sprites per species**, with growth stage and condition
  tracked separately:
  - Sprout: healthy, half dead (2 sprites).
  - Growing: healthy, thirsty, half dead (3 sprites).
  - Mature: healthy, thirsty, half dead (3 sprites).
- Sprout thirst reuses the healthy sprite with the "!" attention marker,
  giving a warning before the half-dead state. Any future code-driven droop
  must affect foliage without shifting the soil anchor.
- **Recovering is a gameplay state animated in code**, with no dedicated
  sprite: retain the thirsty/half-dead appearance initially, then gradually
  restore posture and transition toward healthy after care.
- **Gone needs no plant sprite**; show the empty pot and soil.
- **Plant sprites include visible soil and are separate from pots.** Layer
  the pot behind the plant/soil sprite and its front rim over the stem base.
- **All sprites across all species share canvas dimensions, soil width, and
  a fixed bottom-center soil anchor.** Align by soil, never by foliage bounds.
  Crossfades keep the same scale and anchor; do not shift the whole sprite
  downward to show thirst.
- All four current species use a **3:4 canvas (1254 × 1672)** with soil
  bottom-center at **(627, 1045)** (50% across, 62.5% down) and soil width
  normalized to **320 px**. Even the upright species have some wilted leaves
  below the soil; the shared space beneath the anchor preserves them. Apply
  this layout to all eight states, including sprouts, without per-species
  offsets or padding changes.
- Render at the original 3:4 aspect ratio and use the shared anchor to place
  the soil inside the pot rim.
- Animate idle sway and growth transitions in code; use stage/condition
  sprites instead of a baked growth GIF.

## Unity spike — verdict: back to RN (2026-10-19)

- Tried Unity to fix "mobile app vibes, not game feel". Spike: one scene
  (draggable pots, watering particles, swaying plants). Scripts + sprites by
  Muse, assembly by Ngoc; Unity project was named "Planty".
- Verdict: **back to Expo RN** — learning curve too steep, feel advantage not
  obvious enough. The fix is deliberate game patterns in RN (below), not a
  new engine.

## Game feel in RN (the active approach)

- **One scene, one camera** — no screens/navigators; camera glides, never pushes.
- **Ambient life** — everything idles (sway, drift); static = app.
- **Springs, not timings** — withSpring everywhere; squash-and-stretch on
  grab/release.
- **Particles** — small Skia pool (droplets, sparkles, leaves).
- **Sound + haptics on everything** — silent motion reads as app.
- **Kill native-looking UI** — custom everything; iOS-default components are
  half of "app vibes".

## Modals & economy (locked 2026-10-20, built 2026-10-20)

- **Three modals, one job each:** **Shop** = buy plants only (shelves leave the supplier). **Album** = the plant collection: all **41 approved database species**. Locked entries keep a silhouette *picture* only — name, scientific name, light/water, and cost stay visible (hearts are spent here; a blind unlock would be a mystery-box purchase, which Ngoc flagged and rejected 2026-10-20). **Design** = all shelf business (buy / assign / remove — the shelves panel, renamed).
- **Two currencies.** **Coins** buy things (plants, pots, interior). **Hearts** are earned from customer happiness (stars) and are **spent** to unlock Album entries — hearts go down on unlock, like coins. **Unlock ≠ own:** unlocking opens the species; buying the plant still costs coins in the Shop.
- Scanner tie-in (Step 9): a wild claim unlocks its Album entry the free way, with the wild-specimen tag — the camera's payoff.
- Draft numbers for the build (tunable): hearts per sale = stars (1/2/3♥); the 6 shop species start unlocked; unlock costs for the other 35 tier by rarity.

## Expansion rooms — selling more shop (designed 2026-10-20, not built)

- **Why:** Leafy Corner complaint #2 — collections outgrow the shop, and players
  ask for *additional areas*, not just bigger shelves. Capacity becomes
  progression and a long-term coin sink (also softens the "runs out of goals"
  complaint).
- **The offer:** rooms are bought with coins. Start = the current room; then a
  **back room**; then a **greenhouse** (a rooftop is possible later). Each room
  is one background image with its own 4 light zones, slots, and shelves.
- **Identity = light, not location.** The greenhouse is high light everywhere;
  the back room leans low-light. Rooms do NOT depend on the cities feature —
  Step 6 stays on hold (city differences can't be shown in the current
  background art, and rooms don't need them).
- **Navigation:** walk between rooms (door / edge arrows) freely while CLOSED.
- **Open hours — the main room is retail; side rooms are the grow-op.**
  Customers, the counter, and the present spot exist only in the main room.
  Plants in side rooms still grow, use light, and need water; you visit to
  water, and while closed to arrange. That split gives side rooms a job beyond
  storage: grow under greenhouse light, bring the best stock to the floor.
- **The fetch (serving across rooms):** while OPEN, tap a plant in a side room
  → it presents at the counter and the view returns to the main room on its
  own → drag to the customer, exactly as today. No cross-room dragging (drag
  stays a same-screen gesture). The fetch costs the two taps only — no fee, no
  timer; customer patience is unchanged.
- **Small-plant safeguards (chosen over zoom):** more rooms mean more plants
  at smaller sizes, so mis-taps get likelier. Mitigations: tap targets stay
  generous regardless of sprite size; tap = present/swap, so a wrong pick is
  fixed by tapping the right plant (the wrong one goes home — no extra trip);
  the presented plant renders big with its name pill before anything is
  decided; plants matching the customer's request can glow in every room.
  **Free pinch zoom: not planned** (two-handed, and it fights the drag
  gesture's coordinate math). Parked alternative: double-tap a zone to focus
  it, double-tap to return — build only if playtesting says hunting still
  hurts.
- **Sequencing:** per-zone shelf upgrades (built) are the early capacity ramp;
  back room = first big purchase; greenhouse = late game. This is the biggest
  single feature on the list (room switching + per-room state); when built it
  supersedes the "ONE fixed room" line in the light & zones section.

## Leafy Corner complaint tracker (researched 2026-10-20 — tackle as we go)

From a full sweep of Leafy Corner's Steam reviews (2,976; theme analysis over all of them + the 100 most-visible read directly) and critic reviews. This is the list Green Thumb is designed against; statuses are where we stand.

1. **Hand-watering everything (top complaint).** At scale, watering every pot by hand is misery; players beg for staff / auto-watering. → **Designed, not built:** self-watering pots (early, single-plant) + shop-wide scheduled watering system (late) — Step 7. Manual watering stays early on purpose so the automation feels earned.
2. **Shop runs out of room (~7% of complaints).** Collections outgrow the display space; players ask for bigger expansions / additional areas. → **Designed 2026-10-20, not built:** buyable expansion rooms (back room → greenhouse), each with its own 4 light zones — Step 8b (see Expansion rooms section above).
3. **Runs out of goals (~6%).** Max reputation + all unlocks done in under ~12h, then nothing left to chase. → **Partially built:** hearts + Album (41 species to unlock), the plant database as collection backbone; scanner claims (Step 9) are the endless real-world goal. Watch: playable species is still only 6 — the chase layer (Step 10) and more playable species close this fully.
4. **No search / filter in the catalog (~6%).** With 100+ plants, finding the one a customer wants means scrolling forever. → **Not yet a problem at 6 species:** Shop is a visual grid, Album is the catalog. Revisit when the playable list grows — the Album's info-visible locked rows already double as a browsable index.
5. **Repetitive loop (~4%).** Plant → water → sell → decorate, identical care routine for every plant; the source of the "boring" comments. → **Built:** light zones make placement a decision; per-species water categories + overwatering make care differ; growth groups (fast/mid/slow, hours per stage, wired 2026-10-20) make timing differ. Root pattern in their game: the loop contains no decisions — ours is built out of them.

Checked and NOT a complaint: **growth speed.** Nobody in the reviews says plants grow too fast (zero hits for it in the top 100; the one growth-time comment praises it being quick). The "too fast" people remember is complaint #3 — progression/unlocks running out.

## Open questions

- Monetization: premium upfront like Glean, or different?
- Should scanning ever go beyond unlocking (plant-health diagnosis pipeline)?
