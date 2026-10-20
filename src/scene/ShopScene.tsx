import { useEffect, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Canvas, Rect, RoundedRect } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Easing,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { ZONES } from "./zones";
import { PotSprite, type PotData } from "./PotSprite";
import { ParticleLayer, spawnBurst, type Particle } from "./Particles";

// One fixed room, GPGP-style: everything visible at once, no camera.
// Back wall = 3 sections (brick | glass storefront | timber), each with a
// shelf. Foreground = center court table. Drag pots freely between them.

interface Slot {
  x: number;
  y: number;
  zone: string;
}

const SPRING = { damping: 16, stiffness: 170 };
const HIT_R = 64;
const SNAP_R = 120;

export function ShopScene() {
  const { width: W, height: H } = useWindowDimensions();

  // ---- room layout (fractions of the fixed landscape screen) ----
  const wallBottom = H * 0.58;
  const shelfY = H * 0.48;
  const tableTop = H * 0.74;
  const tableX = W * 0.3;
  const tableW = W * 0.4;
  const third = W / 3;

  const slots: Slot[] = [
    { x: W * 0.09, y: shelfY, zone: "brick" },
    { x: W * 0.22, y: shelfY, zone: "brick" },
    { x: W * 0.41, y: shelfY, zone: "glass" },
    { x: W * 0.59, y: shelfY, zone: "glass" },
    { x: W * 0.78, y: shelfY, zone: "timber" },
    { x: W * 0.91, y: shelfY, zone: "timber" },
    { x: W * 0.4, y: tableTop, zone: "center" },
    { x: W * 0.6, y: tableTop, zone: "center" },
  ];
  const POT_IDS = ["p1", "p2", "p3", "p4", "p5", "p6"];
  // start with empty slots: the shop needs room to grow (new plants!),
  // and swapping covers rearranging.

  const clock = useSharedValue(0);
  const dragId = useSharedValue<string | null>(null);
  const dragDX = useSharedValue(0);
  const dragDY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const grabDX = useSharedValue(0);
  const grabDY = useSharedValue(0);
  const parts = useSharedValue<Particle[]>([]);

  const pots = useSharedValue<Record<string, PotData>>(
    Object.fromEntries(
      [0, 1, 2, 3, 4, 6].map((s, i) => [
        `p${i + 1}`,
        { id: `p${i + 1}`, wx: slots[s].x, wy: slots[s].y, slot: s, phase: i * 1.7 },
      ])
    )
  );

  // Game clock: slow linear sweep; sway + particles derive from it.
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(3600, { duration: 3600 * 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock]);

  // Single pan gesture: grab a pot and drag it anywhere in the room.
  // On drop, snap to the nearest free slot (spring back if none).
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => {
          const ps = pots.value;
          let hit: string | null = null;
          for (const id of POT_IDS) {
            const dx = e.x - ps[id].wx;
            const dy = e.y - ps[id].wy;
            if (dx * dx + dy * dy < HIT_R * HIT_R) {
              hit = id;
              break;
            }
          }
          if (hit) {
            dragId.value = hit;
            grabDX.value = e.x - ps[hit].wx;
            grabDY.value = e.y - ps[hit].wy;
            dragDX.value = 0;
            dragDY.value = 0;
            dragScale.value = withSpring(1.18, SPRING); // pickup pop
          }
        })
        .onUpdate((e) => {
          const did = dragId.value;
          if (!did) return;
          const p = pots.value[did];
          dragDX.value = e.x - grabDX.value - p.wx;
          dragDY.value = e.y - grabDY.value - p.wy;
        })
        .onEnd(() => {
          const did = dragId.value;
          if (!did) return;
          const p = pots.value[did];
          const px = p.wx + dragDX.value;
          const py = p.wy + dragDY.value;
          // nearest slot, occupied or not — dropping on an occupied slot
          // swaps the two pots (GPGP-style rearranging).
          let best = -1;
          let bestD = SNAP_R * SNAP_R;
          slots.forEach((s, i) => {
            const dx = px - s.x;
            const dy = py - s.y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          });
          if (best >= 0 && best !== p.slot) {
            const s = slots[best];
            const otherId = POT_IDS.find(
              (id) => id !== did && pots.value[id].slot === best
            );
            const next = {
              ...pots.value,
              [did]: { ...p, wx: s.x, wy: s.y, slot: best },
            };
            if (otherId) {
              const q = pots.value[otherId];
              const home = slots[p.slot];
              next[otherId] = { ...q, wx: home.x, wy: home.y, slot: p.slot };
              // no sparkle here — feedback belongs to the player's drop only
            }
            pots.value = next;
            spawnBurst(parts, clock.value, s.x, s.y - 40);
            dragDX.value = 0;
            dragDY.value = 0;
            dragId.value = null;
          } else if (best === p.slot) {
            // dropped back home: just settle
            dragDX.value = 0;
            dragDY.value = 0;
            dragId.value = null;
          } else {
            // nowhere near a slot: spring back to the old one
            dragDY.value = withSpring(0, SPRING);
            dragDX.value = withSpring(0, SPRING, () => {
              dragId.value = null;
            });
          }
          dragScale.value = withSpring(1, SPRING); // settle
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [W, H]
  );

  const brick = ZONES[0];
  const glass = ZONES[1];
  const timber = ZONES[2];

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <Canvas style={styles.fill}>
            {/* floor */}
            <Rect x={0} y={wallBottom} width={W} height={H - wallBottom} color="#8a6a4f" />
            {/* back wall: three sections */}
            <Rect x={0} y={0} width={third} height={wallBottom} color={brick.bg} />
            <Rect x={third} y={0} width={third} height={wallBottom} color={glass.bg} />
            <Rect x={third * 2} y={0} width={third} height={wallBottom} color={timber.bg} />
            {/* glass storefront windows */}
            <Rect x={third + 18} y={H * 0.08} width={third - 36} height={H * 0.3} color="#cfe8f2" />
            <Rect x={third + 18} y={H * 0.08} width={(third - 36) * 0.28} height={H * 0.3} color="#ffffff" opacity={0.25} />
            <Rect x={third + 18 + (third - 36) * 0.55} y={H * 0.08} width={(third - 36) * 0.18} height={H * 0.3} color="#ffffff" opacity={0.18} />
            {/* window mullions */}
            <Rect x={third + third / 2 - 4} y={H * 0.08} width={8} height={H * 0.3} color={glass.bg} />
            {/* shelves under each wall section */}
            <Rect x={W * 0.04} y={shelfY + 42} width={W * 0.25} height={12} color={brick.shelf} />
            <Rect x={third + W * 0.04} y={shelfY + 42} width={W * 0.25} height={12} color={glass.shelf} />
            <Rect x={third * 2 + W * 0.04} y={shelfY + 42} width={W * 0.25} height={12} color={timber.shelf} />
            {/* center court table */}
            <RoundedRect x={tableX} y={tableTop + 14} width={tableW} height={H - tableTop} r={10} color="#5d3f27" />
            <Rect x={tableX - 8} y={tableTop} width={tableW + 16} height={16} color="#7d5a3a" />
            {/* pots */}
            {POT_IDS.map((id) => (
              <PotSprite
                key={id}
                id={id}
                pots={pots}
                clock={clock}
                dragId={dragId}
                dragDX={dragDX}
                dragDY={dragDY}
                dragScale={dragScale}
              />
            ))}
            <ParticleLayer parts={parts} clock={clock} />
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
