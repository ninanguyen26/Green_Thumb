import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { RoundedRect, Circle } from "@shopify/react-native-skia";

export interface PotData {
  id: string;
  wx: number; // room x of pot center
  wy: number; // room y of pot center
  slot: number; // home slot index
  phase: number; // sway phase so pots don't move in sync
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
  c: string;
}

const LEAVES: LeafDef[] = [
  { ox: -42, oy: -118, rx: 19, ry: 33, c: "#4a7c3a" },
  { ox: -22, oy: -136, rx: 20, ry: 37, c: "#5a9448" },
  { ox: 0, oy: -148, rx: 21, ry: 40, c: "#6fae56" },
  { ox: 22, oy: -136, rx: 20, ry: 37, c: "#5a9448" },
  { ox: 42, oy: -118, rx: 19, ry: 33, c: "#4a7c3a" },
];

function Leaf({
  leaf,
  sx,
  sy,
  s,
  sway,
}: {
  leaf: LeafDef;
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
  sway: SharedValue<number>;
}) {
  // outer leaves sway more than inner ones
  const cx = useDerivedValue(
    () => sx.value + sway.value * (0.6 + Math.abs(leaf.ox) / 50) + leaf.ox * s.value
  );
  const cy = useDerivedValue(() => sy.value + leaf.oy * s.value);
  const rx = useDerivedValue(() => leaf.rx * s.value);
  const ry = useDerivedValue(() => leaf.ry * s.value);
  // TEST: Circle instead of Ellipse — is the Ellipse export broken?
  return <Circle cx={cx} cy={cy} r={rx} color={leaf.c} />;
}

function PotBody({
  sx,
  sy,
  s,
}: {
  sx: SharedValue<number>;
  sy: SharedValue<number>;
  s: SharedValue<number>;
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
      <RoundedRect x={bodyX} y={bodyY} width={bodyW} height={bodyH} r={8} color="#c9763f" />
      <RoundedRect x={rimX} y={rimY} width={rimW} height={rimH} r={8} color="#a8562a" />
    </>
  );
}

export function PotSprite({ id, pots, clock, dragId, dragDX, dragDY, dragScale }: Props) {
  // screen pos = home slot + drag offset. Free 2D drag, no camera.
  const sx = useDerivedValue(() => {
    const p = pots.value[id];
    return p.wx + (dragId.value === id ? dragDX.value : 0);
  });
  const sy = useDerivedValue(() => {
    const p = pots.value[id];
    return p.wy + (dragId.value === id ? dragDY.value : 0);
  });
  const s = useDerivedValue(() => (dragId.value === id ? dragScale.value : 1));
  const sway = useDerivedValue(() => Math.sin(clock.value * 1.4 + pots.value[id].phase) * 6);

  return (
    <>
      {LEAVES.map((leaf, i) => (
        <Leaf key={i} leaf={leaf} sx={sx} sy={sy} s={s} sway={sway} />
      ))}
      <PotBody sx={sx} sy={sy} s={s} />
    </>
  );
}
