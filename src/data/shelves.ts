// Light zones + shelf (furniture) definitions.
//
// The shop has 4 light zones. Each zone holds ONE shelf (a fixed spot) —
// buying a shelf and assigning it to a zone is an UPGRADE: it replaces the
// zone's starter surface and brings more plant slots. No dragging furniture.
//
// Starter slots carry the ORIGINAL built-in ids (0-7) so Day-1 plants and
// saved assumptions stay valid. Bought-shelf slots get fresh ids from a
// counter (8+), never reused.
//
// Dimensions are px at a 390pt-tall canvas; the scene scales by H/390.
// Shelf slots are local (dx from shelf left edge, dy from shelf base line).
// Ngoc replaces the placeholder art in ShelfSprite.tsx; the data stays.

export interface ShelfSlotDef {
  dx: number;
  dy: number;
}

export interface ShelfDef {
  id: string;
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
    id: "ledge",
    name: "Wall Ledge",
    price: 25,
    width: 170,
    height: 14,
    slots: [
      { dx: 28, dy: -20 },
      { dx: 142, dy: -20 },
    ],
    blurb: "A simple plank. 2 plants.",
  },
  {
    id: "bookcase",
    name: "Tall Bookcase",
    price: 90,
    width: 200,
    height: 175,
    slots: [
      { dx: 42, dy: -32 },
      { dx: 158, dy: -32 },
      { dx: 42, dy: -92 },
      { dx: 158, dy: -92 },
      { dx: 42, dy: -152 },
      { dx: 158, dy: -152 },
    ],
    blurb: "Three tiers. 6 plants.",
  },
  {
    id: "stand",
    name: "Display Stand",
    price: 60,
    width: 110,
    height: 115,
    slots: [
      { dx: 32, dy: -120 },
      { dx: 78, dy: -120 },
    ],
    blurb: "A pedestal. 2 plants, front and center.",
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
