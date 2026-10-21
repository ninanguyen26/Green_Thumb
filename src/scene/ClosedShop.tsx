import { theme } from "../theme";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import {
  speciesById,
  POT_TIERS,
  POT_TIER_ORDER,
  WATER_LABEL,
  type PotTier,
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

export function OpenShopButton({ show, onOpen, top }: { show: boolean; onOpen: () => void; top: number }) {
  if (!show) return null;
  return (
    <TouchableOpacity style={[styles.openBtn, { top }]} onPress={onOpen}>
      <Text style={styles.openText}>☀️ Open Shop</Text>
    </TouchableOpacity>
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
  // design (shelves)
  shelfPanelOpen: boolean;
  onCloseDesign: () => void;
  zoneShelves: Record<string, PlacedShelf | null>;
  shelfStorage: string[];
  zoneHasPlants: (zoneId: string) => boolean;
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
      />
      <DesignModal
        W={W}
        H={H}
        shelfPanelOpen={p.shelfPanelOpen}
        onCloseDesign={p.onCloseDesign}
        zoneShelves={p.zoneShelves}
        shelfStorage={p.shelfStorage}
        zoneHasPlants={p.zoneHasPlants}
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
    alignSelf: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  openText: { fontSize: 18, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  openBtn2: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
});
