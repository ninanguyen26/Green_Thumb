import { useDerivedValue, type SharedValue } from "react-native-reanimated";
import { Circle, Line, RoundedRect } from "@shopify/react-native-skia";

// Placeholder art for the watering can tool — Ngoc to replace with a sprite.
// x, y = room position of the can's base center. held = 0..1 (springs).
// When held, a soft glow marks it active (water gauges on the plants do the rest).

const BODY = "#8fb3c9";
const DARK = "#5f7f99";

export function WateringCan({
  x,
  y,
  held,
}: {
  x: number;
  y: number;
  held: SharedValue<number>;
}) {
  const glowOp = useDerivedValue(() => 0.32 * held.value);
  const tipX = x + 48;
  const tipY = y - 30;

  return (
    <>
      <Circle cx={x} cy={y} r={48} color="#7fc8f2" opacity={glowOp} />
      {/* body */}
      <RoundedRect x={x - 29} y={y - 16} width={58} height={44} r={10} color={BODY} />
      <RoundedRect x={x - 29} y={y + 12} width={58} height={16} r={6} color={DARK} opacity={0.45} />
      {/* spout */}
      <Line p1={{ x: x + 16, y: y - 6 }} p2={{ x: tipX, y: tipY }} color={BODY} strokeWidth={11} />
      <Circle cx={tipX} cy={tipY} r={8} color={DARK} />
      {/* handle */}
      <Line p1={{ x: x - 22, y: y - 12 }} p2={{ x: x - 22, y: y - 34 }} color={DARK} strokeWidth={9} />
      <Line p1={{ x: x - 22, y: y - 34 }} p2={{ x: x + 4, y: y - 34 }} color={DARK} strokeWidth={9} />
      {/* fill opening */}
      <RoundedRect x={x - 10} y={y - 20} width={20} height={7} r={3.5} color={DARK} />
    </>
  );
}
