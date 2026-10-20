// One fixed room: back wall (3 sections) + checkout counter at the bottom.
// 8 slots: 6 wall shelves + 2 featured on the counter.

export interface Slot {
  x: number;
  y: number;
  zone: string;
}

export const WALL_SECTIONS = [
  { name: "brick", x0: 0.0, x1: 0.3, color: "#8a5a44", label: "Brick Wall" },
  { name: "glass", x0: 0.3, x1: 0.7, color: "#bcd8e8", label: "Glass Storefront" },
  { name: "timber", x0: 0.7, x1: 1.0, color: "#6e4f35", label: "Timber Wall" },
];

export interface RoomLayout {
  wallBottom: number;
  shelfY: number;
  counterTop: number;
  customerX: number;
  customerHeadY: number;
  dropZone: { x0: number; x1: number; y0: number; y1: number };
}

export function layout(W: number, H: number): RoomLayout {
  return {
    wallBottom: H * 0.6,
    shelfY: H * 0.47,
    counterTop: H * 0.78,
    customerX: W * 0.5,
    customerHeadY: H * 0.54,
    // generous rect around the customer for serve drops; clear of all slots
    dropZone: { x0: W * 0.4, x1: W * 0.6, y0: H * 0.45, y1: H * 0.8 },
  };
}

export function buildSlots(W: number, H: number): Slot[] {
  const L = layout(W, H);
  return [
    { x: W * 0.07, y: L.shelfY, zone: "brick" },
    { x: W * 0.19, y: L.shelfY, zone: "brick" },
    { x: W * 0.36, y: L.shelfY, zone: "glass" },
    { x: W * 0.64, y: L.shelfY, zone: "glass" },
    { x: W * 0.81, y: L.shelfY, zone: "timber" },
    { x: W * 0.93, y: L.shelfY, zone: "timber" },
    // featured slots on the counter
    { x: W * 0.25, y: L.counterTop, zone: "counter" },
    { x: W * 0.75, y: L.counterTop, zone: "counter" },
  ];
}
