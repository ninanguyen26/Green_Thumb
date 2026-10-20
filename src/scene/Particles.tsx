import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { Circle } from "@shopify/react-native-skia";

export interface Particle {
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  t0: number; // clock time at spawn
  life: number;
  r: number;
  color: string;
}

const MAX = 40;
const GRAVITY = 1100;

// Spawn a sparkle burst at a screen-space point. Call from a worklet.
// Positions are derived from the clock downstream — no per-frame updates.
export function spawnBurst(
  parts: SharedValue<Particle[]>,
  t0: number,
  x: number,
  y: number,
  color: string = "#ffe9a3"
) {
  "worklet";
  const fresh: Particle[] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 170;
    const life = 0.55 + Math.random() * 0.35;
    fresh.push({
      x0: x,
      y0: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 170,
      t0,
      life,
      r: 3 + Math.random() * 3.5,
      color,
    });
  }
  const alive = parts.value.filter((p) => t0 - p.t0 < p.life);
  parts.value = [...alive, ...fresh].slice(-MAX);
}

function Dot({
  parts,
  index,
  clock,
}: {
  parts: SharedValue<Particle[]>;
  index: number;
  clock: SharedValue<number>;
}) {
  const cx = useDerivedValue(() => {
    const p = parts.value[index];
    if (!p) return -100;
    return p.x0 + p.vx * Math.max(0, clock.value - p.t0);
  });
  const cy = useDerivedValue(() => {
    const p = parts.value[index];
    if (!p) return -100;
    const t = Math.max(0, clock.value - p.t0);
    return p.y0 + p.vy * t + 0.5 * GRAVITY * t * t;
  });
  const r = useDerivedValue(() => parts.value[index]?.r ?? 0);
  const c = useDerivedValue(() => parts.value[index]?.color ?? "#ffe9a3");
  const opacity = useDerivedValue(() => {
    const p = parts.value[index];
    if (!p) return 0;
    const t = Math.max(0, clock.value - p.t0);
    return Math.max(0, Math.min(1, 1 - t / p.life));
  });
  return <Circle cx={cx} cy={cy} r={r} opacity={opacity} color={c} />;
}

export function ParticleLayer({
  parts,
  clock,
}: {
  parts: SharedValue<Particle[]>;
  clock: SharedValue<number>;
}) {
  return (
    <>
      {Array.from({ length: MAX }, (_, i) => (
        <Dot key={i} parts={parts} index={i} clock={clock} />
      ))}
    </>
  );
}
