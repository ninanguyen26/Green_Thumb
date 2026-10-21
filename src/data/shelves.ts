// Light zones + shelf (furniture) definitions.
//
// The shop has 4 light zones. Each zone holds ONE shelf (a fixed spot) —
// buying a shelf and assigning it to a zone is an UPGRADE: it replaces the
// zone's starter surface and brings more plant slots. No dragging furniture.
//
// Shelves are PER-ZONE (Ngoc's art, 2026-10-21): each def belongs to one
// zone (def.zone) and can only be assigned there. Art lives in
// assets/interior/shelves/<file>.png, wired in ShelfSprite.tsx.
//
// Starter slots carry the ORIGINAL built-in ids (0-7) so Day-1 plants and
// saved assumptions stay valid. Bought-shelf slots get fresh ids from a
// counter (8+), never reused.
//
// Dimensions are px at a 390pt-tall canvas; the scene scales by H/390.
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
    width: 230,
    height: 220,
    slots: [
      { dx: 69, dy: -191 },
      { dx: 161, dy: -191 },
    ],
    blurb: "One wide top. 2 plants.",
  },
  {
    id: "leftwall-1",
    zone: "left",
    name: "Mint Step Stand",
    price: 90,
    width: 240,
    height: 230,
    slots: [
      { dx: 67, dy: -212 },
      { dx: 173, dy: -212 },
      { dx: 67, dy: -150 },
      { dx: 173, dy: -150 },
      { dx: 67, dy: -92 },
      { dx: 173, dy: -92 },
    ],
    blurb: "Three steps. 6 plants.",
  },
  {
    id: "leftwall-2",
    zone: "left",
    name: "Iron Arch Stand",
    price: 90,
    width: 250,
    height: 240,
    slots: [
      { dx: 125, dy: -226 },
      { dx: 33, dy: -134 },
      { dx: 218, dy: -134 },
      { dx: 125, dy: -96 },
      { dx: 38, dy: -50 },
      { dx: 213, dy: -50 },
    ],
    blurb: "Six platforms. 6 plants.",
  },
  {
    id: "rightwall-1",
    zone: "right",
    name: "Tall Bookcase",
    price: 75,
    width: 150,
    height: 290,
    slots: [
      { dx: 70, dy: -252 },
      { dx: 70, dy: -197 },
      { dx: 70, dy: -142 },
      { dx: 70, dy: -87 },
      { dx: 70, dy: -32 },
    ],
    blurb: "Five boards. 5 plants.",
  },
  {
    id: "rightwall-2",
    zone: "right",
    name: "Step Towers",
    price: 165,
    width: 280,
    height: 270,
    slots: [
      { dx: 36, dy: -192 },
      { dx: 106, dy: -219 },
      { dx: 176, dy: -192 },
      { dx: 244, dy: -151 },
      { dx: 36, dy: -146 },
      { dx: 106, dy: -146 },
      { dx: 176, dy: -146 },
      { dx: 36, dy: -57 },
      { dx: 106, dy: -57 },
      { dx: 176, dy: -57 },
      { dx: 244, dy: -57 },
    ],
    blurb: "Eleven spots across four towers.",
  },
  {
    id: "rightwall-3",
    zone: "right",
    name: "Corner Steps",
    price: 120,
    width: 250,
    height: 240,
    slots: [
      { dx: 55, dy: -216 },
      { dx: 138, dy: -175 },
      { dx: 213, dy: -139 },
      { dx: 55, dy: -139 },
      { dx: 138, dy: -120 },
      { dx: 55, dy: -41 },
      { dx: 138, dy: -41 },
      { dx: 213, dy: -41 },
    ],
    blurb: "Eight spots across three towers.",
  },
  {
    id: "showcase-1",
    zone: "showcase",
    name: "Bobbin Pedestals",
    price: 60,
    width: 210,
    height: 205,
    slots: [
      { dx: 105, dy: -195 },
      { dx: 151, dy: -152 },
      { dx: 65, dy: -115 },
    ],
    blurb: "Three pedestals. 3 plants.",
  },
  {
    id: "showcase-2",
    zone: "showcase",
    name: "Iron Tier Stand",
    price: 60,
    width: 150,
    height: 290,
    slots: [
      { dx: 75, dy: -261 },
      { dx: 75, dy: -162 },
      { dx: 75, dy: -52 },
    ],
    blurb: "Three trays. 3 plants.",
  },
  {
    id: "showcase-3",
    zone: "showcase",
    name: "Iron Two-Tier",
    price: 40,
    width: 170,
    height: 240,
    slots: [
      { dx: 85, dy: -206 },
      { dx: 85, dy: -53 },
    ],
    blurb: "Two trays. 2 plants.",
  },
  {
    id: "showcase-4",
    zone: "showcase",
    name: "Iron Round Table",
    price: 40,
    width: 200,
    height: 190,
    slots: [
      { dx: 64, dy: -171 },
      { dx: 136, dy: -171 },
    ],
    blurb: "One round top. 2 plants.",
  },
];

export function shelfById(id: string): ShelfDef {
  const d = SHELF_DEFS.find((s) => s.id === id);
  if (!d) throw new Error(`unknown shelf ${id}`);
  return d;
}

export interface ZoneStarterSlot {
  x: number; // fraction of W
  y: number; // fraction of H
  slotId: number; // stable built-in id (0-7)
}

export interface ZoneDef {
  id: string;
  name: string;
  lightLabel: string;
  light: number; // 1 low .. 4 direct — gates growth vs species' tolerated band
  cx: number; // shelf anchor: the placed shelf is centered here (fraction of W)
  baseY: number; // shelf base line (fraction of H)
  starterName: string;
  starter: ZoneStarterSlot[];
}

export const ZONES: ZoneDef[] = [
  {
    id: "window",
    name: "Window",
    lightLabel: "Bright direct light",
    light: 4,
    cx: 0.43,
    baseY: 0.56,
    starterName: "Window Sill",
    starter: [
      { x: 0.36, y: 0.37, slotId: 0 },
      { x: 0.5, y: 0.37, slotId: 1 },
    ],
  },
  {
    id: "left",
    name: "Left Wall",
    lightLabel: "Bright indirect light",
    light: 3,
    cx: 0.15,
    baseY: 0.58,
    starterName: "Counter End",
    starter: [
      { x: 0.22, y: 0.69, slotId: 6 },
      { x: 0.42, y: 0.69, slotId: 7 },
    ],
  },
  {
    id: "right",
    name: "Right Wall",
    lightLabel: "Medium light",
    light: 2,
    cx: 0.85,
    baseY: 0.62,
    starterName: "Floor Boards",
    starter: [
      { x: 0.6, y: 0.84, slotId: 2 },
      { x: 0.72, y: 0.84, slotId: 3 },
      { x: 0.83, y: 0.84, slotId: 4 },
      { x: 0.93, y: 0.84, slotId: 5 },
    ],
  },
  {
    id: "showcase",
    name: "Showcase",
    lightLabel: "Low light",
    light: 1,
    cx: 0.56,
    baseY: 0.82,
    starterName: "Bare Floor",
    starter: [],
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
