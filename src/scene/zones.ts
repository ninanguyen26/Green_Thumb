// Room is a single background image (assets/background/background.png).
// Plant slots come only from placed furniture (see data/shelves.ts) —
// there are no built-in room slots.

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

