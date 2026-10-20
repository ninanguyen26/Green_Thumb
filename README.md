# GreenThumb — plant shop game (scaffold)

One continuous Skia scene: 4 shop zones laid out horizontally, a panning camera,
draggable pots with spring physics, idle plant sway, and a sparkle particle pool.
No screens, no navigator — the camera glides between zones.

## Stack

Expo SDK 57 + React Native 0.86 + @shopify/react-native-skia 2.6.2 +
react-native-reanimated 4.5.1 + react-native-gesture-handler 2.32. Same versions
as Glean/Librarian.

## Run it

cd ~/Documents/Projs/Green_Thumb
npm install
npx expo install --fix
npx expo install expo-dev-client
npx expo run:ios --device

(Skia is a native module: no Expo Go. Dev client via `npx expo run:ios --device`,
same as the Librarian flow.)

## Try

- Drag a pot: pickup pop (spring scale), it follows your finger, sparkle burst
  + settle on release.
- Drag empty wall space: the camera pans. Release: it snaps to the nearest
  zone with a spring.
- Don't touch anything: the plants sway gently, each on its own phase.

## What's stubbed

- Pots are Skia-drawn placeholders (rounded rects + ellipses), zero assets.
- One pot per zone, fixed to the shelf line; drag is horizontal only.
- No watering, customers, economy, or seasons yet — this is the feel foundation.
- Bundle ID `com.ngoc.greenthumb` is a placeholder; change in app.json.

## Patterns baked in (from AGENTS.md lessons)

- Shared values only as top-level Skia props, never nested in transform arrays;
  camera offset is computed per-element via useDerivedValue.
- No useComputedValue (removed in Skia v2): Reanimated's useDerivedValue.
- No runOnJS with inline closures; everything here stays on the UI thread.
- Pot positions commit immutably on drop so derived values re-run;
  during drag only the drag-offset shared values change.
