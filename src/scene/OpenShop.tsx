import { theme } from "../theme";
import { StyleSheet, View, Text } from "react-native";
import { speciesById, requestText, type Request } from "../data/plants";
import type { PotData } from "./PotSprite";

// Open-phase overlay surfaces, split out of ShopScene (2026-10-20): the
// customer dialogue bubble, the presented-plant pill, and its water button.
// Rendered by ShopScene at the same tree positions as before.

// Serve flow: tap a plant -> it presents HERE (fraction of screen, hovering
// in front of the counter, right of the customer).
export const PRESENT_POS = { x: 0.48, y: 0.54 };

export interface OpenCustomer {
  request: Request;
  mood: "waiting" | "happy" | "angry";
  note: string | null;
}

export function CustomerBubble({
  W,
  H,
  customer,
  patience,
  pipColor,
}: {
  W: number;
  H: number;
  customer: OpenCustomer | null;
  patience: number;
  pipColor: string;
}) {
  if (!customer) return null;
  return (
    <View pointerEvents="none" style={[styles.bubble, { top: H * 0.08, left: W * 0.04, width: W * 0.46 }]}>
      <Text style={styles.bubbleText}>{customer.note ?? requestText(customer.request)}</Text>
      {customer.mood === "waiting" && (
        <View style={styles.pips}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                { backgroundColor: i < Math.ceil(patience * 10) ? pipColor : theme.colors.disabled },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export function PresentedPill({
  W,
  H,
  presentedPlant,
}: {
  W: number;
  H: number;
  presentedPlant: PotData | null;
}) {
  if (!presentedPlant) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.presentPill, { left: 0, top: 0, width: 120 }]}
    >
      <Text style={styles.presentText}>
        {speciesById(presentedPlant.speciesId).name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleText: { fontSize: 15, fontFamily: "Cause_600SemiBold", color: theme.colors.text, textAlign: "center" },
  pips: { flexDirection: "row", marginTop: 6, gap: 3 },
  pip: { width: 14, height: 8, borderRadius: 3 },
  presentPill: {
    position: "absolute",
    backgroundColor: theme.colors.presentSurface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  presentText: { fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.textInverse },
});
