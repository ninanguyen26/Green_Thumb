import { theme } from "../theme";
// Starter catalog: species, traits, prices. (Full 71-species seed comes in Step 1 of PROGRESS.md.)

export type TraitKey = "petSafe" | "easyCare" | "lowLight" | "brightLight";

export type WaterNeed = "low" | "medium" | "high";

export type GrowthSpeed = "fast" | "mid" | "slow";

export interface Species {
  id: string;
  name: string;
  leaf: string; // leaf color
  buy: number; // coins to buy from supplier
  sell: number; // coins when sold at full stars, mature, nursery pot
  traits: TraitKey[];
  lightMin: number; // tolerated light band (1 low .. 4 direct), from plant-database.json (The Sill, 2026-10-20)
  lightMax: number;
  water: WaterNeed; // water group: sets drain speed + how much overwater it tolerates
  growth: GrowthSpeed; // growth group: sets hours per growth stage (plant-database.json)
}

export const SPECIES: Species[] = [
  { id: "pothos", name: "Golden Pothos", leaf: theme.art.leaf, buy: 10, sell: 20, traits: ["easyCare", "lowLight"], lightMin: 1, lightMax: 3, water: "medium", growth: "fast" },
  { id: "monstera", name: "Monstera", leaf: theme.art.leafDark, buy: 18, sell: 35, traits: ["easyCare"], lightMin: 2, lightMax: 3, water: "medium", growth: "fast" },
  { id: "snake", name: "Snake Plant", leaf: theme.art.leafLight, buy: 13, sell: 25, traits: ["easyCare", "lowLight"], lightMin: 1, lightMax: 4, water: "low", growth: "slow" },
  { id: "pilea", name: "Pilea", leaf: theme.art.leafLight, buy: 15, sell: 30, traits: ["petSafe", "easyCare"], lightMin: 2, lightMax: 4, water: "medium", growth: "fast" },
  { id: "fern", name: "Boston Fern", leaf: theme.art.leaf, buy: 14, sell: 28, traits: ["petSafe", "lowLight"], lightMin: 2, lightMax: 3, water: "medium", growth: "fast" },
  { id: "aloe", name: "Aloe Vera", leaf: theme.art.leafPale, buy: 11, sell: 22, traits: ["easyCare", "brightLight"], lightMin: 3, lightMax: 4, water: "low", growth: "slow" },
];

// Seconds for a full meter to drain, by water group. (Tuned 2026-10-20:
// the first pass at 90/60/40s made watering a constant chore.)
export const WATER_DRAIN: Record<WaterNeed, number> = { low: 300, medium: 180, high: 120 };

// Bad-light timing (accrues only while the shop is CLOSED — the arranging
// phase; frozen while open, when plants can't be moved): badge + hint at
// 60s, droop at 180s.
export const BAD_LIGHT_BADGE_S = 60;
export const BAD_LIGHT_DROOP_S = 180;

// How far past full the meter can go before watering is refused, by group.
// Water > 1 = waterlogged: droops (thirsty art), growth pauses, recovers as it drains.
export const WATER_MAX: Record<WaterNeed, number> = { low: 1.25, medium: 1.4, high: 1.6 };

// Each watering adds this much. Two taps from empty = full.
export const WATER_PER_TAP = 0.5;

// Growth time is measured in GAME HOURS per stage, by growth group
// (plant-database.json). One game hour = GAME_HOUR_S real seconds — the
// tuning knob if the whole game clock ever changes pace. Light still
// scales the rate on top of this (in range full / one out half / two+ out 0).
export const GAME_HOUR_S = 60;
export const GROWTH_HOURS: Record<GrowthSpeed, number> = { fast: 1, mid: 2, slow: 4 };

// Real seconds one growth stage takes this species at full speed.
export function stageSeconds(sp: Species): number {
  return GROWTH_HOURS[sp.growth] * GAME_HOUR_S;
}

// Sale-price factor from the plant's VISIBLE condition at the moment of
// sale (mirrors plantSpriteKey exactly): healthy x1, thirsty x0.8,
// half-dead x0.5. Droop (waterlogged or bad-light) shows as thirsty;
// sprouts never show thirsty. Worklet-safe (used in the serve gesture).
export function conditionFactor(stage: 0 | 1 | 2, water: number, droop: boolean): number {
  "worklet";
  let cond = water <= 0.02 ? 2 : water < 0.35 ? 1 : 0; // 0 healthy, 1 thirsty, 2 half-dead
  if (droop && cond === 0) cond = 1;
  if (stage === 0 && cond === 1) cond = 0;
  return [1, 0.8, 0.5][cond];
}

// Light gap between a species and a zone level: 0 = in range (full growth),
// 1 = one tier out (half speed), 2+ = too far (growth pauses). Worklet-safe.
export function lightGap(sp: Species, zoneLight: number): number {
  "worklet";
  if (zoneLight >= sp.lightMin && zoneLight <= sp.lightMax) return 0;
  if (zoneLight < sp.lightMin) return Math.min(2, sp.lightMin - zoneLight);
  return Math.min(2, zoneLight - sp.lightMax);
}

export const WATER_LABEL: Record<WaterNeed, string> = { low: "low", medium: "med", high: "high" };

export function speciesById(id: string): Species {
  "worklet";
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0];
}

export const TRAIT_LABEL: Record<TraitKey, string> = {
  petSafe: "pet-safe",
  easyCare: "easy-care",
  lowLight: "loves shade",
  brightLight: "loves sun",
};

export type Request =
  | { kind: "specific"; speciesId: string }
  | { kind: "traits"; wants: TraitKey[] };

// Worklet-safe: count how many wanted traits a species has.
export function matchTraits(wants: TraitKey[], speciesId: string): number {
  "worklet";
  const s = SPECIES.find((x) => x.id === speciesId);
  if (!s) return 0;
  let m = 0;
  for (let i = 0; i < wants.length; i++) {
    if (s.traits.indexOf(wants[i]) >= 0) m++;
  }
  return m;
}

export function requestText(r: Request): string {
  if (r.kind === "specific") {
    const name = speciesById(r.speciesId).name;
    const article = /^[aeiou]/i.test(name) ? "an" : "a";
    return `Can I get ${article} ${name}?`;
  }
  return `Something ${r.wants.map((w) => TRAIT_LABEL[w]).join(" + ")}!`;
}

// Worklet-safe: specific refuse reason so the player knows why it was rejected.
export function refuseText(r: Request): string {
  "worklet";
  if (r.kind === "specific") {
    const name = speciesById(r.speciesId).name;
    const article = /^[aeiou]/i.test(name) ? "an" : "a";
    return `I asked for ${article} ${name}!`;
  }
  return `I need ${r.wants.map((w) => TRAIT_LABEL[w]).join(" + ")}!`;
}

export function randomSpeciesId(): string {
  return SPECIES[Math.floor(Math.random() * SPECIES.length)].id;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---- Pots: chosen at placement, go with the plant on sale. ----
// Bonus multiplies the sale price. Better ROI on expensive plants,
// so designer pots are a strategic choice, not an automatic one.

export type PotTier = "nursery" | "terracotta" | "ceramic" | "designer";

export interface PotTierInfo {
  name: string;
  price: number;
  bonus: number; // added to the sale-price multiplier (0.2 = +20%)
  color: string;
  rim: string;
}

export const POT_TIERS: Record<PotTier, PotTierInfo> = {
  nursery: { name: "Nursery Pot", price: 0, bonus: 0, color: theme.art.nursery, rim: theme.art.nurseryRim },
  terracotta: { name: "Terracotta", price: 3, bonus: 0.2, color: theme.art.terracotta, rim: theme.art.terracottaRim },
  ceramic: { name: "Ceramic", price: 8, bonus: 0.5, color: theme.art.ceramic, rim: theme.art.ceramicRim },
  designer: { name: "Designer", price: 15, bonus: 1.0, color: theme.art.designer, rim: theme.art.designerRim },
};

export const POT_TIER_ORDER: PotTier[] = ["nursery", "terracotta", "ceramic", "designer"];

export const STAGE_LABEL = ["Sprout", "Growing", "Mature"];
