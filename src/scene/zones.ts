export interface ZoneDef {
  id: string;
  name: string;
  light: "low" | "medium" | "high";
  bg: string;
  shelf: string;
}

// The shop is ONE fixed room, GPGP-style: everything visible at once.
// Back wall = brick (left) | glass storefront (center) | timber (right),
// plus the center court table in the foreground. No camera, no panning.
export const ZONES: ZoneDef[] = [
  { id: "brick", name: "Brick Wall", light: "low", bg: "#4a3a30", shelf: "#6b5546" },
  { id: "glass", name: "Glass Storefront", light: "high", bg: "#8fb8cc", shelf: "#c4dde9" },
  { id: "timber", name: "Timber Wall", light: "low", bg: "#33402f", shelf: "#4d6046" },
  { id: "center", name: "Center Court", light: "medium", bg: "#c7a06b", shelf: "#e0c193" },
];
