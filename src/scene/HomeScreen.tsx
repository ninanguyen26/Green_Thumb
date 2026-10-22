import { useEffect } from "react";
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Canvas, Group, Image, Path, useImage } from "@shopify/react-native-skia";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { theme } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LEAVES = [
  { phase: 0.03, y: 0.18, scale: 0.8, speed: 1, color: "#8f9b69" },
  { phase: 0.12, y: 0.68, scale: 1.1, speed: 1, color: "#b3ad76" },
  { phase: 0.21, y: 0.32, scale: 0.7, speed: 2, color: "#829365" },
  { phase: 0.29, y: 0.82, scale: 1, speed: 1, color: "#a5a575" },
  { phase: 0.38, y: 0.12, scale: 0.65, speed: 1, color: "#a8b17c" },
  { phase: 0.46, y: 0.56, scale: 0.9, speed: 2, color: "#8f9b69" },
  { phase: 0.54, y: 0.75, scale: 0.75, speed: 1, color: "#b3ad76" },
  { phase: 0.62, y: 0.24, scale: 1, speed: 1, color: "#829365" },
  { phase: 0.71, y: 0.87, scale: 0.85, speed: 2, color: "#a5a575" },
  { phase: 0.79, y: 0.43, scale: 0.7, speed: 1, color: "#a8b17c" },
  { phase: 0.87, y: 0.64, scale: 1.05, speed: 1, color: "#8f9b69" },
  { phase: 0.95, y: 0.36, scale: 0.8, speed: 2, color: "#b3ad76" },
];

const BUTTERFLIES = [
  { phase: 0.05, x: 0.29, y: 0.52, color: "#deb772", accent: "#f2d9a6" },
  { phase: 0.39, x: 0.55, y: 0.66, color: "#a8b8ca", accent: "#d6deea" },
  { phase: 0.73, x: 0.73, y: 0.38, color: "#c4a4b5", accent: "#e4ccd6" },
];

function DriftingLeaf({ motion, width, height, leaf }: {
  motion: SharedValue<number>;
  width: number;
  height: number;
  leaf: (typeof LEAVES)[number];
}) {
  const transform = useDerivedValue(() => {
    const progress = (motion.value * leaf.speed + leaf.phase) % 1;
    return [
      { translateX: -24 + progress * (width + 48) },
      { translateY: height * leaf.y + Math.sin(progress * Math.PI * 4) * 14 },
      { rotate: Math.sin(progress * Math.PI * 6) * 0.6 + 0.4 },
      { scale: leaf.scale },
    ];
  });
  const opacity = useDerivedValue(() => {
    const progress = (motion.value * leaf.speed + leaf.phase) % 1;
    return Math.min(1, progress * 12, (1 - progress) * 12) * 0.8;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path path="M -9 0 Q -2 -8 9 0 Q 2 7 -9 0 Z" color={leaf.color} />
      <Path path="M -8 0 Q 0 -1 7 0" color="#727e55" style="stroke" strokeWidth={0.6} />
    </Group>
  );
}

function FlutteringButterfly({ motion, width, height, butterfly }: {
  motion: SharedValue<number>;
  width: number;
  height: number;
  butterfly: (typeof BUTTERFLIES)[number];
}) {
  const transform = useDerivedValue(() => {
    const angle = (motion.value + butterfly.phase) * Math.PI * 2;
    return [
      { translateX: width * butterfly.x + Math.cos(angle * 2) * Math.min(width * 0.11, 110) },
      { translateY: height * butterfly.y + Math.sin(angle * 4) * Math.min(height * 0.07, 35) },
      { rotate: Math.sin(angle * 2) * 0.3 },
    ];
  });
  const wings = useDerivedValue(() => [
    { scaleX: 0.18 + Math.abs(Math.sin((motion.value + butterfly.phase) * Math.PI * 224)) * 0.82 },
  ]);
  return (
    <Group transform={transform} opacity={0.9}>
      <Group transform={wings}>
        <Path
          path="M -1 1 C -17 -17 -16 5 -4 5 C -14 5 -9 17 -1 5 Z M 1 1 C 17 -17 16 5 4 5 C 14 5 9 17 1 5 Z"
          color={butterfly.color}
        />
        <Path
          path="M -3 1 Q -13 -9 -10 1 Q -7 5 -3 1 Z M 3 1 Q 13 -9 10 1 Q 7 5 3 1 Z"
          color={butterfly.accent}
        />
      </Group>
      <Path
        path="M 0 -3 Q -1 2 0 8 M 0 -2 Q -2 -5 -4 -5 M 0 -2 Q 2 -5 4 -5"
        color="#77644f"
        style="stroke"
        strokeWidth={1.2}
        strokeCap="round"
      />
    </Group>
  );
}

export function HomeScreen({ onEnter, returning }: { onEnter: () => void; returning: boolean }) {
  const { width, height } = useWindowDimensions();
  const breeze = useSharedValue(0);
  const pulse = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const buttonMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2 * pulse.value },
      { scale: (1 + 0.025 * pulse.value) * pressScale.value },
    ],
  }));
  const still = useImage(require("../../assets/background/home-street-cozy.png"));

  useEffect(() => {
    const updateMotion = (active: boolean) => {
      cancelAnimation(breeze);
      if (active) {
        // A full turn preserves each leaf's position when motion resumes.
        breeze.value = withRepeat(
          withTiming(breeze.value + 1, { duration: 28000, easing: Easing.linear }),
          -1,
          false,
        );
      }
      cancelAnimation(pulse);
      pulse.value = active
        ? withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true)
        : 0;
    };
    updateMotion(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      updateMotion(state === "active");
    });
    return () => {
      subscription.remove();
      cancelAnimation(pulse);
      cancelAnimation(pressScale);
      cancelAnimation(breeze);
    };
  }, [breeze, pulse, pressScale]);

  return (
    <View style={styles.fill}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image image={still} x={0} y={0} width={width} height={height} fit="cover" />
        {LEAVES.map((leaf) => (
          <DriftingLeaf key={leaf.phase} motion={breeze} width={width} height={height} leaf={leaf} />
        ))}
        {BUTTERFLIES.map((butterfly) => (
          <FlutteringButterfly key={butterfly.phase} motion={breeze} width={width} height={height} butterfly={butterfly} />
        ))}
      </Canvas>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={returning ? "Continue your shop" : "Enter your shop"}
        onPress={onEnter}
        onPressIn={() => {
          pressScale.value = withSpring(0.94, { damping: 14, stiffness: 240 });
        }}
        onPressOut={() => {
          pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
        }}
        style={[styles.enter, { bottom: Math.max(12, height * 0.02) }, buttonMotion]}
      >
        <Text style={styles.label}>{returning ? "Continue" : "Enter shop"}</Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: theme.colors.surface },
  enter: {
    position: "absolute",
    alignSelf: "center",
    minWidth: 158,
    minHeight: 44,
    paddingHorizontal: 28,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.outline,
    borderWidth: 2,
    borderRadius: 14,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  label: { fontFamily: "Cause_700Bold", fontSize: 18, color: theme.colors.onPrimary },
});
