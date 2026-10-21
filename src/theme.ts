/** Shared Green Thumb palette. UI and procedural art should use theme roles below. */
export const palette = {
  cream: "#F6EBD8",
  sage: "#A8B58D",
  leaf: "#526B45",
  clay: "#B9785E",
  wood: "#DDA766",
  periwinkle: "#93ACE3",
  gold: "#E8C76B",
  cocoa: "#4B352B",
} as const;

/** Mix palette colors for shading without introducing unrelated hues. */
function mix(base: string, tint: string, amount: number): string {
  const a = parseInt(base.slice(1), 16);
  const b = parseInt(tint.slice(1), 16);
  const channel = (shift: number) => Math.round(
    ((a >> shift) & 255) * (1 - amount) + ((b >> shift) & 255) * amount
  ).toString(16).padStart(2, "0");
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

export const theme = {
  colors: {
    surface: palette.cream,
    surfaceRaised: alpha(palette.cream, 0.92),
    surfaceMuted: mix(palette.cream, palette.sage, 0.18),
    text: palette.cocoa,
    textMuted: mix(palette.cocoa, palette.cream, 0.2),
    textInverse: palette.cream,
    border: mix(palette.cream, palette.cocoa, 0.3),
    outline: palette.cocoa,
    primary: palette.leaf,
    onPrimary: palette.cream,
    secondary: palette.sage,
    onSecondary: palette.cocoa,
    utility: palette.periwinkle,
    onUtility: palette.cocoa,
    selected: mix(palette.cream, palette.gold, 0.4),
    selectedBorder: palette.clay,
    disabled: mix(palette.cream, palette.cocoa, 0.3),
    success: palette.leaf,
    warning: palette.gold,
    onWarning: palette.cocoa,
    // Dark clay keeps cream alert text readable while matching terracotta artwork.
    danger: mix(palette.clay, palette.cocoa, 0.4),
    onDanger: palette.cream,
    reward: palette.gold,
    water: mix(palette.periwinkle, palette.cream, 0.6),
    waterlogged: palette.periwinkle,
    shadow: palette.cocoa,
    backdrop: alpha(palette.cocoa, 0.55),
    labelSurface: alpha(palette.cocoa, 0.85),
    presentSurface: alpha(palette.cocoa, 0.88),
    warningSurface: alpha(palette.gold, 0.92),
    utilitySurface: alpha(palette.periwinkle, 0.92),
    emptyOutline: alpha(palette.cream, 0.75),
    emptyText: alpha(palette.cream, 0.9),
    gaugeTrack: alpha(palette.cocoa, 0.3),
    locked: palette.cocoa,
  },
  art: {
    leaf: palette.leaf,
    leafDark: mix(palette.leaf, palette.cocoa, 0.2),
    leafLight: mix(palette.leaf, palette.sage, 0.5),
    leafPale: palette.sage,
    nursery: mix(palette.wood, palette.cocoa, 0.5),
    nurseryRim: mix(palette.wood, palette.cocoa, 0.7),
    terracotta: palette.clay,
    terracottaRim: mix(palette.clay, palette.cocoa, 0.25),
    ceramic: palette.cream,
    ceramicRim: mix(palette.cream, palette.cocoa, 0.25),
    designer: palette.periwinkle,
    designerRim: mix(palette.periwinkle, palette.cocoa, 0.3),
    wood: palette.wood,
    woodDark: mix(palette.wood, palette.cocoa, 0.35),
    woodLight: mix(palette.wood, palette.cream, 0.3),
    woodBack: mix(palette.wood, palette.cocoa, 0.5),
  },
} as const;
