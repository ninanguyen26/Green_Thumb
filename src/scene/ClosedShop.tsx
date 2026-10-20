import { theme } from "../theme";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView, Image } from "react-native";
import {
  SPECIES,
  speciesById,
  POT_TIERS,
  POT_TIER_ORDER,
  WATER_LABEL,
  type PotTier,
} from "../data/plants";
import { SHELF_DEFS, shelfById, ZONES, type PlacedShelf } from "../data/shelves";
import { ALBUM } from "../data/album";
import { plantSpriteSource } from "./plantSprites";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import XpIcon from "../../assets/icons/xp-icon.svg";

// Closed-phase surfaces, split out of ShopScene (2026-10-20): the Open Shop
// button and all the modals (supplier, design, slot/place, album, day
// summary). Rendered by ShopScene at the same tree positions as before —
// modals stay OUTSIDE the GestureDetector so their ScrollViews can scroll.

const SHOP_BG = require("../../assets/background/plant_shop.png");
const PLANK = require("../../assets/background/plank.png");
const CLOSE_BTN = require("../../assets/icons/close-button.png");

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
      {/* supplier modal */}
      {p.supplierOpen && (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={p.onCloseSupplier} />
          <View
            style={[
              styles.shopCard,
              { width: Math.min(W * 0.82, H * 1.22), height: Math.min(W * 0.82, H * 1.22) * 0.75 },
            ]}
          >
            <Image source={SHOP_BG} style={styles.shopBg} resizeMode="stretch" />
            <ScrollView style={styles.shopPanel} showsVerticalScrollIndicator={false}>
              {Array.from({ length: Math.ceil(SPECIES.length / 5) }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.plankRow}>
                  <Image source={PLANK} style={styles.plankImg} resizeMode="stretch" />
                  <View style={styles.plankCells}>
                    {SPECIES.slice(rowIdx * 5, rowIdx * 5 + 5).map((sp) => {
                      const src = plantSpriteSource(sp.id, "sprout-healthy");
                      const own = p.inventory[sp.id] ?? 0;
                      return (
                        <View key={sp.id} style={styles.shopCell2}>
                          <View style={styles.shopImgWrap2}>
                            {src ? (
                              <Image source={src} style={styles.shopImg2} resizeMode="contain" />
                            ) : (
                              <Text style={styles.shopEmoji2}>🌱</Text>
                            )}
                            {own > 0 && (
                              <View style={styles.shopBadge}>
                                <Text style={styles.shopBadgeText}>{own}</Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity
                            style={[styles.shopBuyBtn, p.coins < sp.buy && styles.disabledBtn]}
                            onPress={() => p.onBuyPlant(sp.id)}
                            disabled={p.coins < sp.buy}
                          >
                            <View style={styles.iconRow}>
                              <CoinIcon width={12} height={12} />
                              <Text style={[styles.buyText, p.coins < sp.buy && styles.disabledText]}> {sp.buy}</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            {p.totalInv > 0 && (
              <Text style={styles.shopHint}>Tap an empty shelf (+) to plant your purchases!</Text>
            )}
            <TouchableOpacity style={styles.shopClose} onPress={p.onCloseSupplier}>
              <Image source={CLOSE_BTN} style={styles.shopCloseImg} resizeMode="contain" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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

      {/* album: the collection — hearts unlock, coins buy (in the Shop) */}
      {p.albumOpen && (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={p.onCloseAlbum} />
          <View style={[styles.modal, { width: W * 0.62 }]}>
            <Text style={styles.modalTitle}>📖 Album</Text>
            <View style={styles.hintRow}>
              <Text style={styles.hint}>{ALBUM.filter((a) => p.unlocked[a.slug]).length}/{ALBUM.length} collected · </Text>
              <XpIcon width={12} height={12} />
              <Text style={styles.hint}> {p.hearts} — happy customers earn hearts; hearts unlock plants here, coins buy them in the Shop</Text>
            </View>
            <ScrollView style={{ maxHeight: H * 0.55 }} showsVerticalScrollIndicator={false}>
              {ALBUM.map((a) => {
                const isOpen = !!p.unlocked[a.slug];
                return (
                  <View key={a.slug} style={styles.row}>
                    <View style={[styles.albumDot, isOpen ? styles.albumDotOpen : styles.albumDotLocked]} />
                    <Text style={styles.rowName}>{a.name}</Text>
                    <Text style={styles.rowSub}>
                      {`${a.scientific} • ☀${a.lightMin}–${a.lightMax} • 💧${WATER_LABEL[a.water]}${a.playable ? " • in the Shop" : ""}`}
                    </Text>
                    {!isOpen && (
                      <TouchableOpacity
                        style={[styles.buyBtn, p.hearts < a.hearts && styles.disabledBtn]}
                        onPress={() => p.onUnlock(a.slug, a.hearts)}
                        disabled={p.hearts < a.hearts}
                      >
                        <View style={styles.iconRow}>
                          <XpIcon width={13} height={13} />
                          <Text style={[styles.buyText, p.hearts < a.hearts && styles.disabledText]}> {a.hearts}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={p.onCloseAlbum}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
  backdropTap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
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
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
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
  hintRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  shopCard: {},
  shopBg: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
  shopPanel: {
    position: "absolute",
    left: "4%",
    right: "4%",
    top: "45%",
    bottom: "9%",
  },
  plankRow: { height: 100, justifyContent: "flex-end" },
  plankImg: { position: "absolute", left: 0, right: 0, bottom: 2, width: "100%", height: 40 },
  plankCells: { flexDirection: "row", alignItems: "flex-end" },
  shopCell2: { width: "20%", alignItems: "center" },
  shopImgWrap2: { width: 46, height: 61 },
  shopImg2: { width: 46, height: 61 },
  shopEmoji2: { fontSize: 32, width: 46, height: 61, textAlign: "center" },
  shopClose: { position: "absolute", top: 4, right: 4 },
  shopCloseImg: { width: 38, height: 38 },
  shopHint: {
    position: "absolute",
    left: 12,
    bottom: 12,
    fontSize: 12,
    fontFamily: "Cause_400Regular",
    color: theme.colors.textInverse,
  },
  shopBadge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  shopBadgeText: { color: theme.colors.onDanger, fontSize: 12, fontFamily: "Cause_700Bold" },
  shopBuyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  albumDot: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  albumDotOpen: { backgroundColor: theme.colors.success },
  albumDotLocked: { backgroundColor: theme.colors.locked },
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
  zoneBlock: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingVertical: 8,
  },
  zoneBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  zoneBtn: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneBtnText: { color: theme.colors.onSecondary, fontFamily: "Cause_700Bold", fontSize: 12 },
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
