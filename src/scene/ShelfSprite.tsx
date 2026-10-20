import { theme } from "../theme";
import { RoundedRect } from "@shopify/react-native-skia";
import { shelfById } from "../data/shelves";

// PLACEHOLDER shelf art — Ngoc to replace with sprites (same deal as the
// watering can). x = left edge, baseY = base line, sc = H/390 scale.
// Drawn in shelf-local space: the shelf body spans y in [baseY-height, baseY].

const WOOD = theme.art.wood;
const WOOD_DARK = theme.art.woodDark;
const WOOD_LIGHT = theme.art.woodLight;
const BACK = theme.art.woodBack;

export function ShelfSprite({
  defId,
  x,
  baseY,
  sc,
  opacity = 1,
}: {
  defId: string;
  x: number;
  baseY: number;
  sc: number;
  opacity?: number;
}) {
  const def = shelfById(defId);
  const w = def.width * sc;
  const h = def.height * sc;
  const top = baseY - h;

  if (defId === "ledge") {
    return (
      <>
        <RoundedRect x={x} y={top} width={w} height={h} r={4 * sc} color={WOOD} opacity={opacity} />
        <RoundedRect x={x} y={top} width={w} height={5 * sc} r={3 * sc} color={WOOD_LIGHT} opacity={opacity} />
        {/* brackets */}
        <RoundedRect x={x + 18 * sc} y={baseY} width={9 * sc} height={12 * sc} r={3 * sc} color={WOOD_DARK} opacity={opacity} />
        <RoundedRect x={x + w - 27 * sc} y={baseY} width={9 * sc} height={12 * sc} r={3 * sc} color={WOOD_DARK} opacity={opacity} />
      </>
    );
  }

  if (defId === "bookcase") {
    // tier boards sit just under each slot row (slots at dy -32 / -92 / -152)
    const boards = [-32, -92, -152];
    return (
      <>
        <RoundedRect x={x} y={top} width={w} height={h} r={6 * sc} color={BACK} opacity={opacity} />
        <RoundedRect x={x} y={top} width={7 * sc} height={h} color={WOOD} opacity={opacity} />
        <RoundedRect x={x + w - 7 * sc} y={top} width={7 * sc} height={h} color={WOOD} opacity={opacity} />
        <RoundedRect x={x} y={top} width={w} height={8 * sc} color={WOOD} opacity={opacity} />
        {boards.map((dy) => (
          <RoundedRect
            key={dy}
            x={x + 4 * sc}
            y={baseY + (dy + 6) * sc}
            width={w - 8 * sc}
            height={8 * sc}
            color={WOOD_LIGHT}
            opacity={opacity}
          />
        ))}
      </>
    );
  }

  // display stand (checkout)
  return (
    <>
      <RoundedRect x={x - 6 * sc} y={top} width={w + 12 * sc} height={12 * sc} r={4 * sc} color={WOOD_LIGHT} opacity={opacity} />
      <RoundedRect x={x + w / 2 - 15 * sc} y={top + 12 * sc} width={30 * sc} height={h - 24 * sc} color={WOOD} opacity={opacity} />
      <RoundedRect x={x + w / 2 - 32 * sc} y={baseY - 12 * sc} width={64 * sc} height={12 * sc} r={4 * sc} color={WOOD_DARK} opacity={opacity} />
    </>
  );
}
