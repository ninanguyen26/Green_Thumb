// Room is a single background image (assets/background/background.png).
// Slots are positioned as fractions to match the art:
// 2 on the window sill, 4 on the floor (right), 2 on the checkout counter (left).

export interface Slot {
  x: number;
  y: number;
  zone: string;
}

export interface RoomLayout {
  counterTop: number; // y of the counter surface in the image
  customerX: number;
  customerHeadY: number;
  dropZone: { x0: number; x1: number; y0: number; y1: number };
}

export function layout(W: number, H: number): RoomLayout {
  return {
    counterTop: H * 0.72,
    customerX: W * 0.27,
    customerHeadY: H * 0.46,
    // generous rect around the customer/counter for serve drops
    dropZone: { x0: W * 0.14, x1: W * 0.4, y0: H * 0.4, y1: H * 0.74 },
  };
}

export function buildSlots(W: number, H: number): Slot[] {
  const L = layout(W, H);
  return [
    // window sill
    { x: W * 0.36, y: H * 0.37, zone: "sill" },
    { x: W * 0.5, y: H * 0.37, zone: "sill" },
    // floor, right side
    { x: W * 0.6, y: H * 0.84, zone: "floor" },
    { x: W * 0.72, y: H * 0.84, zone: "floor" },
    { x: W * 0.83, y: H * 0.84, zone: "floor" },
    { x: W * 0.93, y: H * 0.84, zone: "floor" },
    // on the checkout counter (left)
    { x: W * 0.22, y: H * 0.69, zone: "counter" },
    { x: W * 0.42, y: H * 0.69, zone: "counter" },
  ];
}
