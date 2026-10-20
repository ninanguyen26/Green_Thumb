// Starter catalog: species, traits, prices. (Full 71-species seed comes in Step 1 of PROGRESS.md.)

export type TraitKey = "petSafe" | "easyCare" | "lowLight" | "brightLight";

export interface Species {
  id: string;
  name: string;
  leaf: string; // leaf color
  buy: number; // coins to buy from supplier
  sell: number; // coins when sold at full stars, mature, nursery pot
  traits: TraitKey[];
}

export const SPECIES: Species[] = [
  { id: "pothos", name: "Golden Pothos", leaf: "#43a047", buy: 10, sell: 20, traits: ["easyCare", "lowLight"] },
  { id: "monstera", name: "Monstera", leaf: "#1b5e20", buy: 18, sell: 35, traits: ["easyCare"] },
  { id: "snake", name: "Snake Plant", leaf: "#7cb342", buy: 13, sell: 25, traits: ["easyCare", "lowLight"] },
  { id: "pilea", name: "Pilea", leaf: "#66bb6a", buy: 15, sell: 30, traits: ["petSafe", "easyCare"] },
  { id: "fern", name: "Boston Fern", leaf: "#2e7d32", buy: 14, sell: 28, traits: ["petSafe", "lowLight"] },
  { id: "aloe", name: "Aloe Vera", leaf: "#9ccc65", buy: 11, sell: 22, traits: ["easyCare", "brightLight"] },
];

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
  nursery: { name: "Nursery Pot", price: 0, bonus: 0, color: "#8a6a4f", rim: "#6e543d" },
  terracotta: { name: "Terracotta", price: 3, bonus: 0.2, color: "#c9763f", rim: "#a8562a" },
  ceramic: { name: "Ceramic", price: 8, bonus: 0.5, color: "#e8e0d4", rim: "#c9bda9" },
  designer: { name: "Designer", price: 15, bonus: 1.0, color: "#5d4e7a", rim: "#463c5e" },
};

export const POT_TIER_ORDER: PotTier[] = ["nursery", "terracotta", "ceramic", "designer"];

export const STAGE_LABEL = ["Sprout", "Growing", "Mature"];
