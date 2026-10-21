import { Image as SkImage, useImage } from "@shopify/react-native-skia";
import { shelfById } from "../data/shelves";

// Shelf furniture art (Ngoc's sprites, per-zone). x = left edge, baseY =
// base line, sc = H/390 scale. The def's width/height ARE the art's box:
// the image is drawn with fit="fill" into [x, baseY-h, w, h] so the def's
// slot coords (same box space) land on the drawn surfaces.
// Exported for the Design modal's RN <Image> thumbnails (same sources).
export const SHELF_ART: Record<string, number> = {
  "window-1": require("../../assets/interior/shelves/window_1.png"),
  "leftwall-1": require("../../assets/interior/shelves/leftwall_1.png"),
  "leftwall-2": require("../../assets/interior/shelves/leftwall_2.png"),
  "rightwall-1": require("../../assets/interior/shelves/rightwall_1.png"),
  "rightwall-2": require("../../assets/interior/shelves/rightwall_2.png"),
  "rightwall-3": require("../../assets/interior/shelves/rightwall_3.png"),
  "showcase-1": require("../../assets/interior/shelves/showcase_1.png"),
  "showcase-2": require("../../assets/interior/shelves/showcase_2.png"),
  "showcase-3": require("../../assets/interior/shelves/showcase_3.png"),
  "showcase-4": require("../../assets/interior/shelves/showcase_4.png"),
};

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
  const img = useImage(SHELF_ART[defId]);
  if (!img) return null;
  const w = def.width * sc;
  const h = def.height * sc;
  return <SkImage image={img} x={x} y={baseY - h} width={w} height={h} fit="fill" opacity={opacity} />;
}
