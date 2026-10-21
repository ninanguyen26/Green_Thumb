import { theme } from "../theme";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SHELF_DEFS, shelfById, ZONES, type PlacedShelf } from "../data/shelves";
import CoinIcon from "../../assets/icons/coin-icon.svg";

// Design modal — one shelf per light zone (an upgrade), plus shelf buying.
// Split out of ClosedShop (2026-10-20); rendered via ClosedModals.

export interface DesignModalProps {
  W: number;
  H: number;
  shelfPanelOpen: boolean;
  onCloseDesign: () => void;
  zoneShelves: Record<string, PlacedShelf | null>;
  shelfStorage: string[];
  zoneHasPlants: (zoneId: string) => boolean;
  onAssignShelf: (zoneId: string, defId: string) => void;
  onRemoveShelf: (zoneId: string) => void;
  onBuyShelf: (defId: string) => void;
  coins: number;
}

export function DesignModal(p: DesignModalProps) {
  const { W, H } = p;
  return (
    <>
      {/* shelves panel: one shelf per light zone (an upgrade) */}
      {p.shelfPanelOpen && (
        <View style={styles.backdrop}>
          <View style={[styles.modal, { width: W * 0.72 }]}>
            <Text style={styles.modalTitle}>🎨 Design</Text>
            <ScrollView style={{ maxHeight: H * 0.55 }} showsVerticalScrollIndicator={false}>
              {ZONES.map((zone) => {
                const placed = p.zoneShelves[zone.id];
                const curName = placed ? shelfById(placed.defId).name : zone.starterName;
                const curSlots = placed ? shelfById(placed.defId).slots.length : zone.starter.length;
                const occupied = p.zoneHasPlants(zone.id);
                const storageTypes = [...new Set(p.shelfStorage)];
                return (
                  <View key={zone.id} style={styles.zoneBlock}>
                    <Text style={styles.rowName}>
                      {zone.name} · {zone.lightLabel} · Lv{zone.light}
                    </Text>
                    <Text style={styles.rowSub}>
                      Now: {curName} • {curSlots} spots
                      {occupied ? " • plants here — move them off to change" : ""}
                    </Text>
                    <View style={styles.zoneBtns}>
                      {storageTypes.map((defId) => (
                        <TouchableOpacity
                          key={defId}
                          style={styles.zoneBtn}
                          onPress={() => p.onAssignShelf(zone.id, defId)}
                        >
                          <Text style={styles.zoneBtnText}>Use {shelfById(defId).name}</Text>
                        </TouchableOpacity>
                      ))}
                      {placed && (
                        <TouchableOpacity style={styles.zoneBtn} onPress={() => p.onRemoveShelf(zone.id)}>
                          <Text style={styles.zoneBtnText}>Remove</Text>
                        </TouchableOpacity>
                      )}
                      {storageTypes.length === 0 && !placed && (
                        <Text style={styles.hint}>Buy a shelf from the supplier to upgrade.</Text>
                      )}
                    </View>
                  </View>
                );
              })}
              <Text style={styles.sectionLabel}>Buy shelves:</Text>
              {SHELF_DEFS.map((def) => {
                const inStorage = p.shelfStorage.filter((d) => d === def.id).length;
                return (
                  <View key={def.id} style={styles.row}>
                    <Text style={styles.rowName}>{def.name}</Text>
                    <Text style={styles.rowSub}>{def.blurb} • </Text>
                    <CoinIcon width={12} height={12} />
                    <Text style={styles.rowSub}>
                      {def.price}
                      {inStorage > 0 && ` • in storage ${inStorage}`}
                    </Text>
                    <TouchableOpacity
                      style={[styles.buyBtn, p.coins < def.price && styles.disabledBtn]}
                      onPress={() => p.onBuyShelf(def.id)}
                      disabled={p.coins < def.price}
                    >
                      <Text style={[styles.buyText, p.coins < def.price && styles.disabledText]}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={p.onCloseDesign}>
              <Text style={styles.closeText}>Close</Text>
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
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
  hint: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginVertical: 8 },
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
  sectionLabel: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text, marginTop: 10, marginBottom: 6 },
  zoneBlock: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 8,
  },
  zoneBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneBtnText: { color: theme.colors.onSecondary, fontFamily: "Cause_700Bold", fontSize: 12 },
  zoneBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
});
