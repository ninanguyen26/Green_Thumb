import { Dimensions } from "react-native";
import { Image as SkImage, useImage } from "@shopify/react-native-skia";
import { customerSprite, type CustomerMood } from "./customerSprites";

const { width: W, height: H } = Dimensions.get("window");

// Customer bust sprite (384x384 PNG, head centered ~38% down). Stands behind the counter.
// All 3 moods pre-loaded so waiting->happy/upset swaps instantly.
export function CustomerSprite({
  custId,
  mood,
  x,
  headY,
}: {
  custId: number;
  mood: CustomerMood;
  x: number;
  headY: number;
}) {
  const happy = useImage(customerSprite(custId, "happy"));
  const neutral = useImage(customerSprite(custId, "neutral"));
  const upset = useImage(customerSprite(custId, "upset"));
  const img = mood === "happy" ? happy : mood === "upset" ? upset : neutral;

  const S = H * 0.42; // sprite display size
  const ix = x - S / 2;
  const iy = headY - S * 0.38; // head center lands on headY
  return <SkImage image={img} x={ix} y={iy} width={S} height={S} fit="contain" />;
}
