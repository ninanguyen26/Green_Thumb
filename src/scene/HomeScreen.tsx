import { useEffect } from "react";
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Canvas, Image, useAnimatedImageValue, useImage } from "@shopify/react-native-skia";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { theme } from "../theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HomeScreen({ onEnter, returning }: { onEnter: () => void; returning: boolean }) {
  const { width, height } = useWindowDimensions();
  const paused = useSharedValue(AppState.currentState !== "active");
  const pulse = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const buttonMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: -2 * pulse.value },
      { scale: (1 + 0.025 * pulse.value) * pressScale.value },
    ],
  }));
  const still = useImage(require("../../assets/background/home-street-clean-v1.png"));
  // Skia decodes the local GIF on both platforms without extra native image dependencies.
  const frame = useAnimatedImageValue(require("../../assets/background/home-street-animated.gif"), paused);

  useEffect(() => {
    const updateMotion = (active: boolean) => {
      paused.value = !active;
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
    };
  }, [paused, pulse, pressScale]);

  return (
    <View style={styles.fill}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image image={still} x={0} y={0} width={width} height={height} fit="cover" />
        <Image image={frame} x={0} y={0} width={width} height={height} fit="cover" />
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
