import { theme } from "../theme";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { SHELF_ART } from "./ShelfSprite";

import { SHELF_DEFS, shelfById, ZONES, type PlacedShelf } from "../data/shelves";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import CloseIcon from "../../assets/icons/close-button.svg";

// Design modal — one shelf per light zone (an upgrade), plus shelf buying.
// Split out of ClosedShop (2026-10-20); rendered via ClosedModals.

export interface DesignModalProps {
  W: number;
  H: number;
  shelfPanelOpen: boolean;
  onCloseDesign: () => void;
  zoneShelves: Record<string, PlacedShelf | null>;
  shelfStorage: string[];
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
            <View style={styles.headerRow}>
              <Feather name="info" size={13} color={theme.colors.textMuted} />
              <Text style={styles.headerHint}>Shelves can be swapped while a zone is empty.</Text>
            </View>
            <ScrollView style={{ maxHeight: H * 0.72 }} showsVerticalScrollIndicator={false}>
              {ZONES.map((zone) => {
                const placed = p.zoneShelves[zone.id];
                const curName = placed ? shelfById(placed.defId).name : zone.starterName;
                const curSlots = placed ? shelfById(placed.defId).slots.length : zone.starter.length;
                return (
                  <View key={zone.id} style={styles.zoneBlock}>
                    <View style={styles.zoneHead}>
                      <Text style={styles.rowName}>
                        {zone.name} · Lv{zone.light} ({zone.lightLabel})
                      </Text>
                      <Text style={styles.rowSub}>
                        Now: {curName} • {curSlots} spots
                      </Text>
                    </View>
                    {/* this zone's pieces, each a tight display unit: sprite,
                        a plank segment pulled up over its feet, then name +
                        state pill underneath. States: placed (badge + Remove),
                        bought (Use/Swap), unbought (price pill). */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cellsScroll} contentContainerStyle={styles.plankCells}>
                        {SHELF_DEFS.filter((d) => d.zone === zone.id).map((def) => {
                          const isPlaced = placed?.defId === def.id;
                          const inStorage = p.shelfStorage.includes(def.id);
                          return (
                            <View key={def.id} style={styles.cell}>
                              <View style={styles.stage}>
                                <Image source={SHELF_ART[def.id]} style={styles.cellImg} resizeMode="contain" />
                                {isPlaced && (
                                  <View style={styles.inUseBadge}>
                                    <Text style={styles.inUseBadgeText}>✓</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.cellName} numberOfLines={1}>
                                {def.name}
                              </Text>
                              {isPlaced ? (
                                <TouchableOpacity style={[styles.pillBtn, styles.pillBtnMuted]} onPress={() => p.onRemoveShelf(zone.id)}>
                                  <Text style={[styles.buyText, styles.pillTextMuted]}>Remove</Text>
                                </TouchableOpacity>
                              ) : inStorage ? (
                                <TouchableOpacity style={[styles.pillBtn, styles.pillBtnAlt]} onPress={() => p.onAssignShelf(zone.id, def.id)}>
                                  <Text style={[styles.buyText, styles.pillTextAlt]}>{placed ? "Swap" : "Use"}</Text>
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={[styles.pillBtn, p.coins < def.price && styles.disabledBtn]}
                                  onPress={() => p.onBuyShelf(def.id)}
                                  disabled={p.coins < def.price}
                                >
                                  <CoinIcon width={14} height={14} />
                                  <Text style={[styles.buyText, p.coins < def.price && styles.disabledText]}>{def.price}</Text>
                                </TouchableOpacity>
                              )}
                              <Text style={styles.cellSpots}>{def.slots.length} spots</Text>
                            </View>
                          );
                        })}
                    </ScrollView>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          {/* close sits at the home-icon spot (screen top-right), same as Shop/Album */}
          <TouchableOpacity style={[styles.designClose, { top: H * 0.03 }]} onPress={p.onCloseDesign}>
            <CloseIcon width={38} height={38} />
          </TouchableOpacity>
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
  pillBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 1,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pillBtnMuted: { backgroundColor: theme.colors.surfaceMuted },
  pillBtnAlt: { backgroundColor: theme.colors.secondary },
  pillTextAlt: { color: theme.colors.onSecondary },
  pillTextMuted: { color: theme.colors.text },
  buyText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    maxHeight: "100%",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  headerHint: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted },
  designClose: { position: "absolute", right: 45 },
  rowName: { fontSize: 14, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  rowSub: { fontSize: 12, fontFamily: "Cause_400Regular", color: theme.colors.textMuted },
  zoneHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  zoneBlock: {
    borderTopWidth: 2,
    borderTopColor: theme.colors.border,
    marginTop: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // each piece is a display unit: the furniture sprite on a plain tile
  // (it IS furniture — no plank under it), then name + pill underneath
  cellsScroll: { height: 190, marginTop: 6 },
  plankCells: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-start", gap: 12, paddingHorizontal: 2 },
  cell: { alignItems: "center", paddingHorizontal: 2 },
  stage: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 14, padding: 6 },
  cellImg: { width: 112, height: 112 },
  cellName: { fontSize: 12.5, fontFamily: "Cause_600SemiBold", color: theme.colors.text, textAlign: "center", marginTop: 8 },
  cellSpots: { fontSize: 10.5, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginTop: 2 },
  inUseBadge: {
    position: "absolute",
    top: 0,
    right: -4,
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  inUseBadgeText: { color: theme.colors.onPrimary, fontSize: 10, fontFamily: "Cause_700Bold" },
});
