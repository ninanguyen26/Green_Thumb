// Plant sprite map. Folders in assets/plants/<folder>/.
// Anchor = soil-mound point in the canvas (fractions), measured per species.
// Sprout has no thirsty sprite — reuse healthy + code droop.

export interface PlantArt { folder: string; ax: number; ay: number; size: number; }

export const PLANT_ART: Record<string, PlantArt> = {
  pothos: { folder: "golden-pothos", ax: 0.52, ay: 0.63, size: 150 },
  monstera: { folder: "monstera-deliciosa", ax: 0.515, ay: 0.83, size: 140 },
  snake: { folder: "snake-plant", ax: 0.5, ay: 0.83, size: 140 },
  pilea: { folder: "pilea", ax: 0.52, ay: 0.83, size: 135 },
};

const SPRITES: Record<string, any> = {
  "pothos/sprout-healthy": require("../../assets/plants/golden-pothos/sprout-healthy.png"),
  "pothos/sprout-half-dead": require("../../assets/plants/golden-pothos/sprout-half-dead.png"),
  "pothos/growing-healthy": require("../../assets/plants/golden-pothos/growing-healthy.png"),
  "pothos/growing-thirsty": require("../../assets/plants/golden-pothos/growing-thirsty.png"),
  "pothos/growing-half-dead": require("../../assets/plants/golden-pothos/growing-half-dead.png"),
  "pothos/mature-healthy": require("../../assets/plants/golden-pothos/mature-healthy.png"),
  "pothos/mature-thirsty": require("../../assets/plants/golden-pothos/mature-thirsty.png"),
  "pothos/mature-half-dead": require("../../assets/plants/golden-pothos/mature-half-dead.png"),
  "monstera/sprout-healthy": require("../../assets/plants/monstera-deliciosa/sprout-healthy.png"),
  "monstera/sprout-half-dead": require("../../assets/plants/monstera-deliciosa/sprout-half-dead.png"),
  "monstera/growing-healthy": require("../../assets/plants/monstera-deliciosa/growing-healthy.png"),
  "monstera/growing-thirsty": require("../../assets/plants/monstera-deliciosa/growing-thirsty.png"),
  "monstera/growing-half-dead": require("../../assets/plants/monstera-deliciosa/growing-half-dead.png"),
  "monstera/mature-healthy": require("../../assets/plants/monstera-deliciosa/mature-healthy.png"),
  "monstera/mature-thirsty": require("../../assets/plants/monstera-deliciosa/mature-thirsty.png"),
  "monstera/mature-half-dead": require("../../assets/plants/monstera-deliciosa/mature-half-dead.png"),
  "snake/sprout-healthy": require("../../assets/plants/snake-plant/sprout-healthy.png"),
  "snake/sprout-half-dead": require("../../assets/plants/snake-plant/sprout-half-dead.png"),
  "snake/growing-healthy": require("../../assets/plants/snake-plant/growing-healthy.png"),
  "snake/growing-thirsty": require("../../assets/plants/snake-plant/growing-thirsty.png"),
  "snake/growing-half-dead": require("../../assets/plants/snake-plant/growing-half-dead.png"),
  "snake/mature-healthy": require("../../assets/plants/snake-plant/mature-healthy.png"),
  "snake/mature-thirsty": require("../../assets/plants/snake-plant/mature-thirsty.png"),
  "snake/mature-half-dead": require("../../assets/plants/snake-plant/mature-half-dead.png"),
  "pilea/sprout-healthy": require("../../assets/plants/pilea/sprout-healthy.png"),
  "pilea/sprout-half-dead": require("../../assets/plants/pilea/sprout-half-dead.png"),
  "pilea/growing-healthy": require("../../assets/plants/pilea/growing-healthy.png"),
  "pilea/growing-thirsty": require("../../assets/plants/pilea/growing-thirsty.png"),
  "pilea/growing-half-dead": require("../../assets/plants/pilea/growing-half-dead.png"),
  "pilea/mature-healthy": require("../../assets/plants/pilea/mature-healthy.png"),
  "pilea/mature-thirsty": require("../../assets/plants/pilea/mature-thirsty.png"),
  "pilea/mature-half-dead": require("../../assets/plants/pilea/mature-half-dead.png"),
};

export const STAGE_NAMES = ['sprout', 'growing', 'mature'] as const;

export function plantCondition(water: number): 'healthy' | 'thirsty' | 'half-dead' {
  if (water <= 0.02) return 'half-dead';
  if (water < 0.35) return 'thirsty';
  return 'healthy';
}

export function plantSpriteKey(stage: 0 | 1 | 2, water: number): string {
  const stageName = STAGE_NAMES[stage];
  let cond = plantCondition(water);
  if (stageName === 'sprout' && cond === 'thirsty') cond = 'healthy'; // droop handled in code
  return `${stageName}-${cond}`;
}

export function plantSpriteSource(speciesId: string, key: string): any | null {
  if (!PLANT_ART[speciesId]) return null; // fern/aloe: no art yet, use drawn leaves
  return SPRITES[`${speciesId}/${key}`] ?? null;
}
