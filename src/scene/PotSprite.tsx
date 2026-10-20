import { useEffect, useRef, useState } from "react";
import {
  useDerivedValue,
  useSharedValue,
  useAnimatedReaction,
  withTiming,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { RoundedRect, Circle, Image as SkImage, useImage } from "@shopify/react-native-skia";
import { speciesById, POT_TIERS, BAD_LIGHT_DROOP_S, type PotTier } from "../data/plants";
import { PLANT_ART, plantSpriteKey, plantSpriteSource } from "./plantSprites";

export interface PotData {
  id: string;
  wx: number; // room x of pot center
  wy: number; // room y of pot center
  slot: number; // home slot index
  phase: number; // sway phase so pots don't move in sync
  speciesId: string;
  water: number; // 0..WATER_MAX ( > 1 = waterlogged)
  stage: 0 | 1 | 2; // sprout | growing | mature
  growth: number; // 0..1 progress to next stage
  badLight: number; // seconds accumulated in far-bad light (growth paused)
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
  presentedId: SharedValue<string | null>;
  glideId: SharedValue<string | null>;
  glideDX: SharedValue<number>;
  glideDY: SharedValue<number>;
}

// The soil mound ends just inside the pot's front rim (whose top is sy - 68*s).
// Keep this offset tied to the same scale and center as the pot geometry.
const SOIL_OFFSET = 63;

interface LeafDef {
  ox: number;
  oy: number;
  rx: number;
  ry: number;
  shade: number; // multiplier on the species base leaf color
}

// Fallback leaves for species with no art yet (fern, aloe).
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
  gs: SharedValue<number>;
  sway: SharedValue<number>;
}) {
  const cx = useDerivedValue(
    () => sx.value + sway.value * (0.6 + Math.abs(leaf.ox) / 50) + leaf.ox * s.value * gs.value
  );
  const cy = useDerivedValue(() => sy.value + leaf.oy * s.value * gs.value);
  const rx = useDerivedValue(() => leaf.rx * s.value * gs.value);
  const c = useDerivedValue(() => shadeHex(leafBase.value, leaf.shade));
  return <Circle cx={cx} cy={cy} r={rx} color={c} />;
}

function PotBack({
  sx,
  sy,
  s,
  potColor,
}: {
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
  potColor: SharedValue<string>;
}) {
  const bodyX = useDerivedValue(() => sx.value - 32 * s.value);
  const bodyY = useDerivedValue(() => sy.value - 46 * s.value);
  const bodyW = useDerivedValue(() => 64 * s.value);
  const bodyH = useDerivedValue(() => 88 * s.value);
  return <RoundedRect x={bodyX} y={bodyY} width={bodyW} height={bodyH} r={8} color={potColor} />;
}

function PotRim({
  sx,
  sy,
  s,
  potRim,
}: {
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
  potRim: SharedValue<string>;
}) {
  const rimX = useDerivedValue(() => sx.value - 37 * s.value);
  const rimY = useDerivedValue(() => sy.value - 68 * s.value);
  const rimW = useDerivedValue(() => 74 * s.value);
  const rimH = useDerivedValue(() => 22 * s.value);
  return <RoundedRect x={rimX} y={rimY} width={rimW} height={rimH} r={8} color={potRim} />;
}

export function PotSprite({ id, pots, clock, dragId, dragDX, dragDY, dragScale, presentedId, glideId, glideDX, glideDY }: Props) {
  // Which art (if any) + which sprite key. Recomputed on React re-render (tick-driven).
  const pd = pots.value[id];
  const art = pd ? PLANT_ART[pd.speciesId] : undefined;
  const droop = pd ? pd.water > 1 || pd.badLight >= BAD_LIGHT_DROOP_S : false;
  const curSrc =
    pd && art ? plantSpriteSource(pd.speciesId, plantSpriteKey(pd.stage, pd.water, droop)) : null;

  // Crossfade between states: keep the previous sprite and fade it out over
  // the new one. Keep both at full scale so the soil never shrinks or shifts.
  const [shown, setShown] = useState<{ cur: typeof curSrc; prev: typeof curSrc }>({
    cur: curSrc,
    prev: null,
  });
  const lastSrcRef = useRef(curSrc);
  const fade = useSharedValue(1);
  useEffect(() => {
    if (curSrc !== lastSrcRef.current) {
      const prev = lastSrcRef.current;
      lastSrcRef.current = curSrc;
      setShown({ cur: curSrc, prev });
      fade.value = 0;
      fade.value = withTiming(1, { duration: 450 });
    }
  }, [curSrc, fade]);
  const curImg = useImage(shown.cur);
  const prevImg = useImage(shown.prev);
  const curOp = useDerivedValue(() => fade.value);
  const prevOp = useDerivedValue(() => 1 - fade.value);

  const sx = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return -1000;
    return p.wx + (dragId.value === id ? dragDX.value : 0) + (glideId.value === id ? glideDX.value : 0);
  });
  const sy = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return -1000;
    return p.wy + (dragId.value === id ? dragDY.value : 0) + (glideId.value === id ? glideDY.value : 0);
  });
  const s = useDerivedValue(() => {
    if (!pots.value[id]) return 0;
    // presented plant gets emphasis; drag pickup wins via max (no stacking)
    const d = dragId.value === id ? dragScale.value : 1;
    const p = presentedId.value === id ? 1.15 : 1;
    return Math.max(d, p);
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
  // Fallback-leaf growth scale: spring toward the stage target instead of snapping.
  const gsTarget = useDerivedValue(() => {
    const p = pots.value[id];
    if (!p) return 0;
    return [0.55, 0.8, 1][p.stage] ?? 1;
  });
  const gs = useSharedValue(pd ? [0.55, 0.8, 1][pd.stage] ?? 1 : 1);
  useAnimatedReaction(
    () => gsTarget.value,
    (v) => {
      if (v !== gs.value) gs.value = withSpring(v, { damping: 13, stiffness: 110 });
    },
    []
  );
  const potColor = useDerivedValue(() => {
    const p = pots.value[id];
    return p ? POT_TIERS[p.pot].color : "#8a6a4f";
  });
  const potRim = useDerivedValue(() => {
    const p = pots.value[id];
    return p ? POT_TIERS[p.pot].rim : "#6e543d";
  });

  // Plant image geometry: anchor the art's soil point at the pot's soil line.
  // Both crossfade layers share the soil anchor; each sizes from it so the
  // incoming sprite can grow in without sliding.
  // The soil is a fixed point on the pot, including while presenting or
  // dragging. Moving the whole image for idle sway would make it slide on the rim.
  const soilX = useDerivedValue(() => sx.value);
  const soilY = useDerivedValue(() => sy.value - SOIL_OFFSET * s.value);
  const curS = useDerivedValue(() => {
    if (!pots.value[id] || !art) return 0;
    return art.size * s.value;
  });
  const curH = useDerivedValue(() => curS.value / (art ? art.aspectRatio : 1));
  const curX = useDerivedValue(() => soilX.value - (art ? art.ax : 0) * curS.value);
  const curY = useDerivedValue(() => soilY.value - (art ? art.ay : 0) * curH.value);
  const prevS = useDerivedValue(() => {
    if (!pots.value[id] || !art) return 0;
    return art.size * s.value;
  });
  const prevH = useDerivedValue(() => prevS.value / (art ? art.aspectRatio : 1));
  const prevX = useDerivedValue(() => soilX.value - (art ? art.ax : 0) * prevS.value);
  const prevY = useDerivedValue(() => soilY.value - (art ? art.ay : 0) * prevH.value);

  return (
    <>
      <PotBack sx={sx} sy={sy} s={s} potColor={potColor} />
      {art ? (
        <>
          {prevImg && (
            <SkImage image={prevImg} x={prevX} y={prevY} width={prevS} height={prevH} fit="fill" opacity={prevOp} />
          )}
          {curImg && (
            <SkImage image={curImg} x={curX} y={curY} width={curS} height={curH} fit="fill" opacity={curOp} />
          )}
        </>
      ) : (
        LEAVES.map((leaf, i) => (
          <Leaf key={i} leaf={leaf} leafBase={leafBase} sx={sx} sy={sy} s={s} gs={gs} sway={sway} />
        ))
      )}
      <PotRim sx={sx} sy={sy} s={s} potRim={potRim} />
    </>
  );
}
