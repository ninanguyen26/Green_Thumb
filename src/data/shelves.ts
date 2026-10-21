// Light zones + shelf (furniture) definitions.
//
// The shop has 4 light zones. Each zone holds ONE shelf (a fixed spot) —
// buying a shelf and assigning it to a zone gives that zone its plant
// slots. No dragging furniture.
//
// Shelves are PER-ZONE (Ngoc's art, 2026-10-21): each def belongs to one
// zone (def.zone) and can only be assigned there. Art lives in
// assets/interior/shelves/<file>.png, wired in ShelfSprite.tsx.
//
// There are NO starter spots (Ngoc 2026-10-21): a zone has plant slots
// only while a shelf is placed in it. Buy the furniture -> put the plants
// on. Shelf slot ids come from a counter in ShopScene, never reused.
//
// Dimensions are px at a 390pt-tall canvas; the scene scales by H/390.
// The art is 1:1 (square canvases), so every def's width EQUALS its height —
// one size per piece; a non-square box would stretch the art (fit="fill").
// Shelf slots are local (dx from shelf left edge, dy from shelf base line).
// Slot positions are first-pass off the art — tuned on device.

export interface ShelfSlotDef {
  dx: number;
  dy: number;
}

export interface ShelfDef {
  id: string;
  zone: string; // the zone this shelf belongs to (assignable only there)
  name: string;
  price: number;
  width: number;
  height: number;
  slots: ShelfSlotDef[];
  blurb: string;
}

export interface PlacedShelf {
  uid: string;
  defId: string;
  slotIds: number[];
}

export const SHELF_DEFS: ShelfDef[] = [
  {
    id: "window-1",
    zone: "window",
    name: "Iron Console",
    price: 30,
    width: 184,
    height: 184,
    slots: [
      { dx: 55, dy: -160 },
      { dx: 129, dy: -160 },
    ],
    blurb: "One wide top. 2 plants.",
  },
  {
    id: "leftwall-1",
    zone: "left",
    name: "Mint Step Stand",
    price: 90,
    width: 192,
    height: 192,
    slots: [
      { dx: 54, dy: -177 },
      { dx: 138, dy: -177 },
      { dx: 54, dy: -125 },
      { dx: 138, dy: -125 },
      { dx: 54, dy: -77 },
      { dx: 138, dy: -77 },
    ],
    blurb: "Three steps. 6 plants.",
  },
  {
    id: "leftwall-2",
    zone: "left",
    name: "Iron Arch Stand",
    price: 90,
    width: 200,
    height: 200,
    slots: [
      { dx: 100, dy: -189 },
      { dx: 26, dy: -111 },
      { dx: 174, dy: -111 },
      { dx: 100, dy: -80 },
      { dx: 30, dy: -42 },
      { dx: 170, dy: -42 },
    ],
    blurb: "Six platforms. 6 plants.",
  },
  {
    id: "rightwall-1",
    zone: "right",
    name: "Tall Bookcase",
    price: 75,
    width: 232,
    height: 232,
    slots: [
      { dx: 108, dy: -202 },
      { dx: 108, dy: -158 },
      { dx: 108, dy: -114 },
      { dx: 108, dy: -70 },
      { dx: 108, dy: -26 },
    ],
    blurb: "Five boards. 5 plants.",
  },
  {
    id: "rightwall-2",
    zone: "right",
    name: "Step Towers",
    price: 165,
    width: 224,
    height: 224,
    slots: [
      { dx: 29, dy: -160 },
      { dx: 85, dy: -181 },
      { dx: 141, dy: -160 },
      { dx: 195, dy: -125 },
      { dx: 29, dy: -121 },
      { dx: 85, dy: -121 },
      { dx: 141, dy: -121 },
      { dx: 29, dy: -48 },
      { dx: 85, dy: -48 },
      { dx: 141, dy: -48 },
      { dx: 195, dy: -48 },
    ],
    blurb: "Eleven spots across four towers.",
  },
  {
    id: "rightwall-3",
    zone: "right",
    name: "Corner Steps",
    price: 120,
    width: 200,
    height: 200,
    slots: [
      { dx: 44, dy: -180 },
      { dx: 110, dy: -146 },
      { dx: 170, dy: -116 },
      { dx: 44, dy: -116 },
      { dx: 110, dy: -100 },
      { dx: 44, dy: -34 },
      { dx: 110, dy: -34 },
      { dx: 170, dy: -34 },
    ],
    blurb: "Eight spots across three towers.",
  },
  {
    id: "showcase-1",
    zone: "showcase",
    name: "Bobbin Pedestals",
    price: 60,
    width: 168,
    height: 168,
    slots: [
      { dx: 84, dy: -160 },
      { dx: 121, dy: -125 },
      { dx: 52, dy: -94 },
    ],
    blurb: "Three pedestals. 3 plants.",
  },
  {
    id: "showcase-2",
    zone: "showcase",
    name: "Iron Tier Stand",
    price: 60,
    width: 232,
    height: 232,
    slots: [
      { dx: 116, dy: -209 },
      { dx: 116, dy: -130 },
      { dx: 116, dy: -42 },
    ],
    blurb: "Three trays. 3 plants.",
  },
  {
    id: "showcase-3",
    zone: "showcase",
    name: "Iron Two-Tier",
    price: 40,
    width: 192,
    height: 192,
    slots: [
      { dx: 96, dy: -165 },
      { dx: 96, dy: -42 },
    ],
    blurb: "Two trays. 2 plants.",
  },
  {
    id: "showcase-4",
    zone: "showcase",
    name: "Iron Round Table",
    price: 40,
    width: 160,
    height: 160,
    slots: [
      { dx: 51, dy: -144 },
      { dx: 109, dy: -144 },
    ],
    blurb: "One round top. 2 plants.",
  },
];

export function shelfById(id: string): ShelfDef {
  const d = SHELF_DEFS.find((s) => s.id === id);
  if (!d) throw new Error(`unknown shelf ${id}`);
  return d;
}

export interface ZoneDef {
  id: string;
  name: string;
  lightLabel: string;
  light: number; // 1 low .. 4 direct — gates growth vs species' tolerated band
  cx: number; // shelf anchor: the placed shelf is centered here (fraction of W)
  baseY: number; // shelf base line (fraction of H)
}

export const ZONES: ZoneDef[] = [
  {
    id: "window",
    name: "Window",
    lightLabel: "Bright direct light",
    light: 4,
    cx: 0.4165,
    baseY: 0.56,
  },
  {
    id: "left",
    name: "Left Wall",
    lightLabel: "Bright indirect light",
    light: 3,
    cx: 0.15,
    baseY: 0.58,
  },
  {
    id: "right",
    name: "Right Wall",
    lightLabel: "Medium light",
    light: 2,
    cx: 0.85,
    baseY: 0.62,
  },
  {
    id: "showcase",
    name: "Showcase",
    lightLabel: "Low light",
    light: 1,
    cx: 0.641,
    baseY: 0.95,
  },
];

export function zoneById(id: string): ZoneDef {
  const z = ZONES.find((zz) => zz.id === id);
  if (!z) throw new Error(`unknown zone ${id}`);
  return z;
}

export function zoneLight(id: string): number {
  "worklet";
  const z = ZONES.find((zz) => zz.id === id);
  return z ? z.light : 2;
}
