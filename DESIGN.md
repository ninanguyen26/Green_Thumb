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

## Scanner design (V1 scope)

### What V1 does — two paths, nothing else
1. **Plant scan → classifier → top-3 confirm → species unlock.**
   Unlocks the species (standard form), an almanac entry, and a
   "wild specimen" tag. Never unlocks cultivars.
2. **Tag scan → OCR → cultivar unlock.** At stores, scan plant + tag as one
   ritual. OCR (Apple Vision, on-device) is high-trust: unlocks the cultivar
   and the pair enters the training set.

### Cultivar discovery (Pink Princess example)
- Tag scan at a store (intended real-world path).
- In-game **variegation discovery**: your *P. erubescens* grows a pink leaf.
- Rare, expensive supplier stock (currency-sink escape valve).
- NOT via classifier alone (it sees *erubescens*, not pink).
- NOT via manual typing (personal label only — otherwise typing
  "marble queen" on a golden pothos would grant a Marble Queen).

### Scanner/shop decoupling
- Scanner classifies **species only, never genus**. *P. hederaceum*,
  *P. erubescens*, and tree philodendron are separate classes; within-species
  cultivar variety is the dog-breeds problem, solved by training-data coverage.
- The shop sells **cultivars as variants**.
- Heartleaf philodendron vs golden pothos = "tricky pair" confirm-UI moment.

### Parked to phase 2 (designed, not built)
- Owner-confirm flow: type name → DB autocomplete → reference photos →
  confirm → "owner-confirmed" unlock. No DB match → personal label +
  "suggest this variety" queue (demand-driven DB growth; the thin tail
  heals itself through play).
- Anti-fraud principle: automated checks **advise, never block** (the White
  Knight lesson — subtle variegation must never false-reject). The only hard
  gate is the DB lookup "cultivar ∈ confirmed species".
- Trust tiers: nursery tag (trains model) > owner-confirmed (quarantined)
  > personal name (no unlock, no training data).

## ML validation (done)

- Smoke test (frozen MobileNetV2, 10 species, 1,999 CC photos): top-1 64.5% /
  top-3 84.8%; pothos-vs-heartleaf 61.3%.
- Fine-tune pilot, Apple Silicon (MobileNetV3-Large, 20 epochs): **test top-1
  86.7% / top-3 95.7%**; lookalike pair 81.7%. **Scanner viability CONFIRMED.**
- Caveats: iNat photos are cleaner than user scans; 71 classes will be harder.
- Next ML milestones: full 71-species training run, then Core ML export for
  on-device iOS inference.

## Build plan (RN)

0. Pilot classifier ✅
1. 71-species content seed JSON (care, light tier, water, traits, growth)
2. Scaffold (Expo + SQLite) ✅ — this folder
3. Core loop, NO scanner (pot → place → water → grow → sell)
4. Customers & economy (to-do → plant points, reputation tiers)
5. Zones (done in scaffold as layout; gameplay wiring here)
6. City + seasons
7. Chore fixes (self-watering pots, watering system, grow lights)
8. Decoration + day/night
9. Wire the scanner
10. Chase layer (variegation, cultivars, phone orders, customization)
11. Feel pass + TestFlight

V1 excludes: cultivar-level scanning, shop relocation, social, story.

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

## Open questions

- Monetization: premium upfront like Glean, or different?
- Should scanning ever go beyond unlocking (plant-health diagnosis pipeline)?
