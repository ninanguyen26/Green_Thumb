import { theme } from "../theme";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { Circle, Image as SkImage, useImage } from "@shopify/react-native-skia";

// Watering can tool — Ngoc's art (assets/tools/watering_can.png, square).
// x, y = room position of the can's base center. held = 0..1 (springs).
// At rest the can sits on its shadow bubble. Picked up (held -> 1) it lifts
// off the ground: rises, scales up, tilts, and the shadow stays behind on
// the floor, smaller and darker. Released: springs back to normal.

const SIZE = 104; // square display size
const LIFT = 12; // px the can rises when picked up
const TILT = -0.09; // rad of tilt when picked up
const GROW = 0.14; // scale gain when picked up

export function WateringCan({
  x,
  y,
  held,
}: {
  x: number;
  y: number;
  held: SharedValue<number>;
}) {
  const img = useImage(require("../../assets/tools/watering_can.png"));
  // Image rect: centered on x, standing on the ground line (base y + 34).
  const imgX = x - SIZE / 2;
  const imgY = y + 34 - SIZE;
  const cx = x;
  const cy = imgY + SIZE / 2;
  const groundY = y + 38;

  // Picked-up transform: lift, then pivot tilt+scale around the can's center.
  const canTransform = useDerivedValue(() => {
    const h = held.value;
    return [
      { translateY: -LIFT * h },
      { translateX: cx },
      { translateY: cy },
      { rotate: TILT * h },
      { scale: 1 + GROW * h },
      { translateX: -cx },
      { translateY: -cy },
    ];
  });
  // Shadow bubble: stays on the floor; shrinks a little as the can lifts.
  const shadowTransform = useDerivedValue(() => {
    const s = 1 - 0.18 * held.value;
    return [
      { translateX: x },
      { translateY: groundY },
      { scaleX: 32 * s },
      { scaleY: 9 * s },
    ];
  });
  const shadowOp = useDerivedValue(() => 0.15 + 0.09 * held.value);

  if (!img) return null;
  return (
    <>
      <Circle cx={0} cy={0} r={1} color={theme.colors.shadow} opacity={shadowOp} transform={shadowTransform} />
      <SkImage image={img} x={imgX} y={imgY} width={SIZE} height={SIZE} fit="fill" transform={canTransform} />
    </>
  );
}
