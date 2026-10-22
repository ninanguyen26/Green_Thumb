import { useEffect } from "react";
import { AppState, Image, Pressable, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { theme } from "../theme";
import {
  speciesById,
  POT_TIERS,
  POT_TIER_ORDER,
  WATER_LABEL,
  type PotTier,
  type Species,
} from "../data/plants";
import { type PlacedShelf } from "../data/shelves";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import { ShopModal } from "./ShopModal";
import { DesignModal } from "./DesignModal";
import { AlbumModal } from "./AlbumModal";

// Closed-phase surfaces, split out of ShopScene (2026-10-20) and by modal
// the same day: Shop -> ShopModal.tsx, Design -> DesignModal.tsx, Album ->
// AlbumModal.tsx. This file keeps the Open Shop button, the slot/place
// modal, and the day summary, and forwards props to the three modals.
// Everything renders OUTSIDE the GestureDetector so ScrollViews can scroll.

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DOOR_SIGN = require("../../assets/background/door-sign.png");
const DOOR_SIGN_OPEN = require("../../assets/background/door-sign-open.png");

// One hang spot shared by both door signs (CLOSED / OPEN) so the sign
// never jumps when the phase flips. Ngoc's size/position tuning lives here.
function signBox(W: number, H: number) {
  const w = W * 0.12;
  return { w, h: w * 0.856, x: W * 0.58, y: H * 0.055 };
}

// Idle motion (2026-10-22): a gentle sway pivoting on the hook, like a
// real hanging sign; a press still gets the spring squash.
export function OpenShopButton({ show, onOpen, camX, camY, camZ, W, H }: { show: boolean; onOpen: () => void; camX: SharedValue<number>; camY: SharedValue<number>; camZ: SharedValue<number>; W: number; H: number }) {
  // Door sign (2026-10-22): replaces the floating pill — a wooden sign
  // hanging on the door, world-anchored with the same math as the plant
  // markers (CamLayer in ShopScene) plus a zoom scale, so it pans and
  // grows with the room instead of floating over it. CLOSED is printed
  // on the PNG itself. The box comes from signBox() above, shared
  // with the OPEN sign so the two always hang in the same spot.
  const sb = signBox(W, H);
  const sway = useSharedValue(-2.4);
  const pressScale = useSharedValue(1);
  const signMotion = useAnimatedStyle(() => {
    const z = camZ.value;
    return {
      width: sb.w * z,
      height: sb.h * z,
      transform: [
        { translateX: camX.value + sb.x * (z - 1) },
        { translateY: camY.value + sb.y * (z - 1) },
        { rotate: `${sway.value}deg` },
        { scale: pressScale.value },
      ],
    };
  });
  useEffect(() => {
    const updateMotion = (active: boolean) => {
      cancelAnimation(sway);
      if (active) {
        sway.value = -2.4;
        sway.value = withRepeat(withTiming(2.4, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true);
      } else {
        sway.value = 0;
      }
    };
    updateMotion(show && AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) => {
      updateMotion(show && state === "active");
    });
    return () => {
      subscription.remove();
      cancelAnimation(sway);
      cancelAnimation(pressScale);
    };
  }, [show, sway, pressScale]);
  if (!show) return null;
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Open Shop"
      onPress={onOpen}
      onPressIn={() => {
        pressScale.value = withSpring(0.96, { damping: 14, stiffness: 240 });
      }}
      onPressOut={() => {
        pressScale.value = withSpring(1, { damping: 12, stiffness: 240 });
      }}
      style={[styles.openBtn, { left: sb.x, top: sb.y, transformOrigin: "50% 5%" }, signMotion]}
    >
      <Image source={DOOR_SIGN} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </AnimatedPressable>
  );
}

// OPEN face of the door sign (2026-10-22): same hang spot (signBox),
// no idle animation and no touch — pure dressing while the shop is open.
// It still tracks the camera (pan/zoom) so it stays on the door.
export function OpenDoorSign({ show, camX, camY, camZ, W, H }: { show: boolean; camX: SharedValue<number>; camY: SharedValue<number>; camZ: SharedValue<number>; W: number; H: number }) {
  const sb = signBox(W, H);
  const motion = useAnimatedStyle(() => {
    const z = camZ.value;
    return {
      width: sb.w * z,
      height: sb.h * z,
      transform: [
        { translateX: camX.value + sb.x * (z - 1) },
        { translateY: camY.value + sb.y * (z - 1) },
      ],
    };
  });
  if (!show) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.openBtn, { left: sb.x, top: sb.y }, motion]}>
      <Image source={DOOR_SIGN_OPEN} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </Animated.View>
  );
}

export interface ClosedModalsProps {
  W: number;
  H: number;
  // supplier
  supplierOpen: boolean;
  onCloseSupplier: () => void;
  inventory: Record<string, number>;
  coins: number;
  totalInv: number;
  onBuyPlant: (speciesId: string) => void;
  cart: Record<string, number>;
  onAddToCart: (speciesId: string) => void;
  onSetCartQty: (speciesId: string, qty: number) => void;
  onBuyCart: () => void;
  shopSpecies: Species[];
  // design (shelves)
  shelfPanelOpen: boolean;
  onCloseDesign: () => void;
  zoneShelves: Record<string, PlacedShelf | null>;
  shelfStorage: string[];
  zoneHasPlants: (zoneId: string) => boolean;
  shelfHint: string | null;
  onAssignShelf: (zoneId: string, defId: string) => void;
  onRemoveShelf: (zoneId: string) => void;
  onBuyShelf: (defId: string) => void;
  // slot / place
  slotModal: number | null;
  onCloseSlot: () => void;
  placePot: PotTier;
  onSelectPot: (t: PotTier) => void;
  onPlacePlant: (slot: number, speciesId: string, pot: PotTier) => void;
  // album
  albumOpen: boolean;
  onCloseAlbum: () => void;
  unlocked: Record<string, boolean>;
  hearts: number;
  onUnlock: (slug: string, hearts: number) => void;
  owned: Record<string, number>;
  sold: Record<string, number>;
  // day summary
  daySummary: { coins: number; happy: number; angry: number } | null;
  onCloseSummary: () => void;
  day: number;
}

export function ClosedModals(p: ClosedModalsProps) {
  const { W, H } = p;
  return (
    <>
      <ShopModal
        W={W}
        H={H}
        supplierOpen={p.supplierOpen}
        onCloseSupplier={p.onCloseSupplier}
        inventory={p.inventory}
        coins={p.coins}
        totalInv={p.totalInv}
        cart={p.cart}
        onAddToCart={p.onAddToCart}
        onSetCartQty={p.onSetCartQty}
        onBuyCart={p.onBuyCart}
        species={p.shopSpecies}
      />
      <DesignModal
        W={W}
        H={H}
        shelfPanelOpen={p.shelfPanelOpen}
        onCloseDesign={p.onCloseDesign}
        zoneShelves={p.zoneShelves}
        shelfStorage={p.shelfStorage}
        zoneHasPlants={p.zoneHasPlants}
        shelfHint={p.shelfHint}
        onAssignShelf={p.onAssignShelf}
        onRemoveShelf={p.onRemoveShelf}
        onBuyShelf={p.onBuyShelf}
        coins={p.coins}
      />
      {/* slot modal: plant into an empty slot (tap a "+" while closed) */}
      {p.slotModal !== null && (
        <View style={styles.backdrop}>
          <View style={[styles.modal, { width: W * 0.6 }]}>
            <Text style={styles.modalTitle}>Empty Shelf</Text>
            {Object.entries(p.inventory).filter(([, c]) => c > 0).length === 0 && (
              <Text style={styles.hint}>No plants in stock — buy from the supplier!</Text>
            )}
            {Object.entries(p.inventory)
              .filter(([, c]) => c > 0)
              .map(([sid, count]) => (
                <View key={sid} style={styles.row}>
                  <Text style={styles.rowName}>
                    {speciesById(sid).name} ×{count} · ☀{speciesById(sid).lightMin}–{speciesById(sid).lightMax} · 💧{WATER_LABEL[speciesById(sid).water]}
                  </Text>
                  <TouchableOpacity style={styles.buyBtn} onPress={() => p.onPlacePlant(p.slotModal!, sid, p.placePot)}>
                    <Text style={styles.buyText}>Plant</Text>
                  </TouchableOpacity>
                </View>
              ))}
            <Text style={styles.sectionLabel}>Pot:</Text>
            <View style={styles.potRow}>
              {POT_TIER_ORDER.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.potChip, p.placePot === t && styles.potChipSel]}
                  onPress={() => p.onSelectPot(t)}
                >
                  <View style={styles.iconRow}>
                    <Text style={styles.potChipText}>{POT_TIERS[t].name}{POT_TIERS[t].price > 0 ? " " : " free "}</Text>
                    {POT_TIERS[t].price > 0 && (
                      <>
                        <CoinIcon width={12} height={12} />
                        <Text style={styles.potChipText}>{POT_TIERS[t].price}</Text>
                      </>
                    )}
                    <Text style={styles.potChipText}> (+{Math.round(POT_TIERS[t].bonus * 100)}%)</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={p.onCloseSlot}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <AlbumModal
        W={W}
        H={H}
        albumOpen={p.albumOpen}
        onCloseAlbum={p.onCloseAlbum}
        unlocked={p.unlocked}
        hearts={p.hearts}
        onUnlock={p.onUnlock}
        owned={p.owned}
        sold={p.sold}
      />
      {/* day summary */}
      {p.daySummary && (
        <View style={styles.backdrop}>
          <View style={[styles.modal, { width: W * 0.5, alignItems: "center" }]}>
            <Text style={styles.modalTitle}>Day {p.day - 1} complete!</Text>
            <View style={styles.iconRow}>
              <Text style={styles.rowSub}>+</Text>
              <CoinIcon width={13} height={13} />
              <Text style={styles.rowSub}>
                {p.daySummary.coins} • 😊 {p.daySummary.happy} • 😞 {p.daySummary.angry}
              </Text>
            </View>
            <TouchableOpacity style={styles.openBtn2} onPress={p.onCloseSummary}>
              <Text style={styles.openText}>Prep for Day {p.day}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontFamily: "Cause_700Bold", color: theme.colors.text, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  rowName: { flex: 1, fontSize: 14, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  rowSub: { fontSize: 12, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginRight: 8 },
  buyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  buyText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  closeBtn: {
    marginTop: 12,
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingVertical: 8,
  },
  closeText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.text },
  hint: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginVertical: 8 },
  sectionLabel: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text, marginTop: 10, marginBottom: 6 },
  iconRow: { flexDirection: "row", alignItems: "center" },
  potRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  potChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  potChipSel: { backgroundColor: theme.colors.selected, borderColor: theme.colors.selectedBorder },
  potChipText: { fontSize: 12, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  openBtn: {
    position: "absolute",
  },
  openText: { fontFamily: "Cause_700Bold", fontSize: 18, color: theme.colors.onPrimary },
  openBtn2: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
});
