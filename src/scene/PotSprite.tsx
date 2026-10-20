import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { RoundedRect, Circle } from "@shopify/react-native-skia";
import { speciesById, POT_TIERS, type PotTier } from "../data/plants";

export interface PotData {
  id: string;
  wx: number; // room x of pot center
  wy: number; // room y of pot center
  slot: number; // home slot index
  phase: number; // sway phase so pots don't move in sync
  speciesId: string;
  water: number; // 0..1
  stage: 0 | 1 | 2; // sprout | growing | mature
  growth: number; // 0..1 progress to next stage
  pot: PotTier;
}

interface Props {
  id: string;
  pots: SharedValue<Record<string, PotData>>;
  clock: SharedValue<number>;
  dragId: SharedValue<string | null>;
  dragDX: SharedValue<number>;
  dragDY: SharedValue<number>;
  dragScale: SharedValue<number>;
}

interface LeafDef {
  ox: number;
  oy: number;
  rx: number;
  ry: number;
  shade: number; // multiplier on the species base leaf color
}

const LEAVES: LeafDef[] = [
  { ox: -42, oy: -118, rx: 19, ry: 33, shade: 0.8 },
  { ox: -22, oy: -136, rx: 20, ry: 37, shade: 0.92 },
  { ox: 0, oy: -148, rx: 21, ry: 40, shade: 1.1 },
  { ox: 22, oy: -136, rx: 20, ry: 37, shade: 0.92 },
  { ox: 42, oy: -118, rx: 19, ry: 33, shade: 0.8 },
];

function shadeHex(hex: string, f: number): string {
  "worklet";
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

function Leaf({
  leaf,
  leafBase,
  sx,
  sy,
  s,
  gs,
  sway,
}: {
  leaf: LeafDef;
  leafBase: SharedValue<string>;
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
  gs: SharedValue<number>; // growth scale (stage)
  sway: SharedValue<number>;
}) {
  // outer leaves sway more than inner ones
  const cx = useDerivedValue(
    () => sx.value + sway.value * (0.6 + Math.abs(leaf.ox) / 50) + leaf.ox * s.value * gs.value
  );
  const cy = useDerivedValue(() => sy.value + leaf.oy * s.value * gs.value);
  const rx = useDerivedValue(() => leaf.rx * s.value * gs.value);
  const c = useDerivedValue(() => shadeHex(leafBase.value, leaf.shade));
  return <Circle cx={cx} cy={cy} r={rx} color={c} />;
}

function PotBody({
  sx,
  sy,
  s,
  potColor,
  potRim,
}: {
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
  potColor: SharedValue<string>;
  potRim: SharedValue<string>;
}) {
  const bodyX = useDerivedValue(() => sx.value - 32 * s.value);
  const bodyY = useDerivedValue(() => sy.value - 46 * s.value);
  const bodyW = useDerivedValue(() => 64 * s.value);
  const bodyH = useDerivedValue(() => 88 * s.value);
  const rimX = useDerivedValue(() => sx.value - 37 * s.value);
  const rimY = useDerivedValue(() => sy.value - 68 * s.value);
  const rimW = useDerivedValue(() => 74 * s.value);
  const rimH = useDerivedValue(() => 22 * s.value);
  return (
    <>
      <RoundedRect x={bodyX} y={bodyY} width={bodyW} height={bodyH} r={8} color={potColor} />
      <RoundedRect x={rimX} y={rimY} width={rimW} height={rimH} r={8} color={potRim} />
    </>
  );
}

export function PotSprite({ id, pots, clock, dragId, dragDX, dragDY, dragScale }: Props) {
  // screen pos = home slot + drag offset. Free 2D drag, no camera.
  // Guards: the pot can be deleted (sold) while deriveds still run —
  // park it off-screen until React unmounts this component.
  const sx = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return -1000;
    return p.wx + (dragId.value === id ? dragDX.value : 0);
  });
  const sy = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return -1000;
    return p.wy + (dragId.value === id ? dragDY.value : 0);
  });
  const s = useDerivedValue(() => {
    if (!pots.value[id]) return 0;
    return dragId.value === id ? dragScale.value : 1;
  });
  const sway = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return 0;
    return Math.sin(clock.value * 1.4 + p.phase) * 6;
  });
  const leafBase = useDerivedValue(() => {
    const p = pots.value[id];
    return p ? speciesById(p.speciesId).leaf : "#4a7c3a";
  });
  const gs = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return 0;
    return [0.55, 0.8, 1][p.stage] ?? 1;
  });
  const potColor = useDerivedValue(() => {
    const p = pots.value[id];
    return p ? POT_TIERS[p.pot].color : "#8a6a4f";
  });
  const potRim = useDerivedValue(() => {
    const p = pots.value[id];
    return p ? POT_TIERS[p.pot].rim : "#6e543d";
  });

  return (
    <>
      {LEAVES.map((leaf, i) => (
        <Leaf key={i} leaf={leaf} leafBase={leafBase} sx={sx} sy={sy} s={s} gs={gs} sway={sway} />
      ))}
      <PotBody sx={sx} sy={sy} s={s} potColor={potColor} potRim={potRim} />
    </>
  );
}
