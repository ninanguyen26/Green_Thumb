import { theme } from "../theme";
import { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView, Image, TextInput } from "react-native";
import { ALBUM } from "../data/album";
import { WATER_LABEL } from "../data/plants";
import XpIcon from "../../assets/icons/xp-icon.svg";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import { plantSpriteSource } from "./plantSprites";
import CloseIcon from "../../assets/icons/close-button.svg";

const NOTEBOOK_OPEN = require("../../assets/background/ring-notebook-open-3x2.png");
const CAMERA_ICON = require("../../assets/icons/camera-icon.png");
const SUN_ICON = require("../../assets/icons/half-sun-icon.png");
const SPROUT_ICON = require("../../assets/icons/sprout-icon.png");
const WATER_ICON = require("../../assets/icons/water-drop-icon.png");

// Height of the Album's top block (unlocked count + search bar) — the
// list's explicit height is computed against it (see AlbumModal).
const TOP_H = 64;

// Detail-page display text (the 1-4 light scale and trait names).
const LIGHT_DESC: Record<number, string> = {
  1: "low light",
  2: "medium light",
  3: "bright indirect",
  4: "direct sun",
};
function lightDesc(min: number, max: number): string {
  return min === max ? LIGHT_DESC[min] : `${LIGHT_DESC[min]} to ${LIGHT_DESC[max]}`;
}
const TRAIT_DISPLAY: Record<string, string> = {
  petSafe: "Pet-safe",
  easyCare: "Easy care",
  lowLight: "Low light",
  brightLight: "Bright light",
};
// Sell price by growth stage = the sale formula's maturity factors
// (full stars, nursery pot, healthy) — see ShopScene's serve calc.
const STAGE_SELL: { label: string; f: number }[] = [
  { label: "Sprout", f: 0.3 },
  { label: "Growing", f: 0.6 },
  { label: "Mature", f: 1 },
];


// Album modal — the collection: hearts unlock, coins buy (in the Shop).
// Split out of ClosedShop (2026-10-20); rendered via ClosedModals.

export interface AlbumModalProps {
  W: number;
  H: number;
  albumOpen: boolean;
  onCloseAlbum: () => void;
  unlocked: Record<string, boolean>;
  hearts: number;
  onUnlock: (slug: string, hearts: number) => void;
  owned: Record<string, number>;
  sold: Record<string, number>; // by plants.ts species id (inventory + placed)
}

export function AlbumModal(p: AlbumModalProps) {
  const { W, H } = p;
  // The open notebook is 3:2 — the card keeps that ratio, as large as fits.
  const cardW = Math.min(W * 0.8, H * 0.96 * (3 / 2));
  const cardH = cardW * (2 / 3);
  // The list's height is EXPLICIT (card minus the top/bottom padding).
  // Flex sizing let the ScrollView's frame
  // run past the card's bottom edge twice — no flex on the vertical axis.
  const listH = cardH - cardW * 0.15 - TOP_H;
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? ALBUM.filter((a) => a.name.toLowerCase().includes(q) || a.scientific.toLowerCase().includes(q))
    : ALBUM;
  const unlockedCount = ALBUM.filter((a) => p.unlocked[a.slug]).length;
  // Tapping a row shows that plant's detail on the right page.
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const selected = selectedSlug ? ALBUM.find((a) => a.slug === selectedSlug) ?? null : null;
  const selOpen = selected ? !!p.unlocked[selected.slug] : false;
  const selSprite = selected?.playable ? plantSpriteSource(selected.playable, "sprout-healthy") : null;
  const selOwned = selected?.playable ? (p.owned[selected.playable] ?? 0) : 0;
  const selSold = selected?.playable ? (p.sold[selected.playable] ?? 0) : 0;
  return (
    <>
      {/* album: the collection — hearts unlock, coins buy (in the Shop) */}
      {p.albumOpen && (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={p.onCloseAlbum} />
          <View style={[styles.albumCard, { width: cardW, height: cardH }]}>
            <Image source={NOTEBOOK_OPEN} style={styles.albumBg} resizeMode="cover" />
            <View style={styles.albumContent}>
            <View style={styles.albumTop}>
              <Text style={styles.countText}>{unlockedCount} / {ALBUM.length} unlocked</Text>
              <View style={styles.searchBar}>
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search plants…"
                  placeholderTextColor={theme.colors.textMuted}
                />
                {query.length > 0 && (
                  <TouchableOpacity onPress={() => setQuery("")}>
                    <Text style={styles.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <ScrollView style={{ height: listH }} showsVerticalScrollIndicator={false}>
              {visible.length === 0 && (
                <Text style={styles.noMatch}>{`No plants match "${query.trim()}"`}</Text>
              )}
              {visible.map((a) => {
                const isOpen = !!p.unlocked[a.slug];
                const spriteSrc = a.playable ? plantSpriteSource(a.playable, "sprout-healthy") : null;
                const ownedQty = a.playable ? (p.owned[a.playable] ?? 0) : 0;
                return (
                  <TouchableOpacity
                    key={a.slug}
                    style={[styles.entryWrap, a.slug === selectedSlug && styles.entrySelected]}
                    onPress={() => setSelectedSlug(a.slug)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.row}>
                      {spriteSrc ? (
                        <View style={[styles.albumAvatar, !isOpen && styles.albumSpriteLocked]}>
                          <Image source={spriteSrc} style={styles.albumSprite} resizeMode="contain" />
                        </View>
                      ) : (
                        <View style={[styles.albumDot, isOpen ? styles.albumDotOpen : styles.albumDotLocked]} />
                      )}
                      <Text style={styles.rowName} numberOfLines={1}>{a.name}</Text>
                    </View>
                    {(!isOpen || ownedQty > 0) && (
                      <View style={styles.chipRow}>
                        {ownedQty > 0 && (
                          <View style={styles.qtyChip}>
                            <Text style={styles.qtyText}>Owned ×{ownedQty}</Text>
                          </View>
                        )}
                        {!isOpen && (
                          <>
                            <TouchableOpacity
                              style={[styles.buyBtn, p.hearts < a.hearts && styles.disabledBtn]}
                              onPress={() => p.onUnlock(a.slug, a.hearts)}
                              disabled={p.hearts < a.hearts}
                            >
                              <View style={styles.iconRow}>
                                <XpIcon width={16} height={16} />
                                <Text style={[styles.buyText, p.hearts < a.hearts && styles.disabledText]}> {a.hearts}</Text>
                              </View>
                            </TouchableOpacity>
                            <View style={styles.scanChip}>
                              <View style={styles.iconRow}>
                                <Image source={CAMERA_ICON} style={styles.scanIcon} resizeMode="contain" />
                                <Text style={styles.scanText}> Scan</Text>
                              </View>
                            </View>
                          </>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            </View>
            {/* right page: the tapped plant's detail (scrolls when tall) */}
            <ScrollView style={styles.detailPage} contentContainerStyle={styles.detailPageContent} showsVerticalScrollIndicator={false}>
              {selected ? (
                <>
                {selSprite ? (
                  <View style={[styles.detailAvatar, !selOpen && styles.albumSpriteLocked]}>
                    <Image source={selSprite} style={styles.detailSprite} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={[styles.detailDot, selOpen ? styles.albumDotOpen : styles.albumDotLocked]} />
                )}
                <Text style={styles.detailName} numberOfLines={1}>{selected.name}</Text>
                <Text style={styles.detailSci}>{selected.scientific}</Text>
                <View style={styles.detailInfo}>
                  <View style={styles.detailRowView}>
                    <Image source={SUN_ICON} style={styles.detailIcon} resizeMode="contain" />
                    <Text style={styles.detailRowText}>
                      {selOpen
                        ? `Light  Lv${selected.lightMin}–${selected.lightMax} · ${lightDesc(selected.lightMin, selected.lightMax)}`
                        : `Light  ${selected.lightMin}–${selected.lightMax}`}
                    </Text>
                  </View>
                  <View style={styles.detailRowView}>
                    <Image source={WATER_ICON} style={styles.detailIcon} resizeMode="contain" />
                    <Text style={styles.detailRowText}>{`Water  ${selOpen ? selected.water : WATER_LABEL[selected.water]}`}</Text>
                  </View>
                  {selOpen && (
                    <View style={styles.detailRowView}>
                      <Image source={SPROUT_ICON} style={styles.detailIcon} resizeMode="contain" />
                      <Text style={styles.detailRowText}>{`Growth  ${selected.growth}`}</Text>
                    </View>
                  )}
                  {selOpen && selected.playable ? (
                    <View style={styles.traitChips}>
                      <View style={styles.traitChip}>
                        <Text style={styles.traitChipText}>{`Owned  ×${selOwned}`}</Text>
                      </View>
                      <View style={styles.traitChip}>
                        <Text style={styles.traitChipText}>{`Sold  ×${selSold}`}</Text>
                      </View>
                    </View>
                  ) : null}
                  {selOpen && (
                    <View style={styles.priceBlock}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Buy</Text>
                        <View style={styles.iconRow}>
                          <CoinIcon width={13} height={13} />
                          <Text style={styles.priceValue}> {selected.buy}</Text>
                        </View>
                      </View>
                      {STAGE_SELL.map((s) => (
                        <View key={s.label} style={styles.priceRow}>
                          <Text style={styles.priceLabel}>{`Sell · ${s.label}`}</Text>
                          <View style={styles.iconRow}>
                            <CoinIcon width={13} height={13} />
                            <Text style={styles.priceValue}> {Math.round(selected.sell * s.f)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {selOpen && selected.traits.length > 0 && (
                    <View style={styles.traitChips}>
                      {selected.traits.map((t) => (
                        <View key={t} style={styles.traitChip}>
                          <Text style={styles.traitChipText}>{TRAIT_DISPLAY[t] ?? t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                {!selOpen && (
                  <View style={styles.detailChips}>
                    <TouchableOpacity
                      style={[styles.buyBtn, p.hearts < selected.hearts && styles.disabledBtn]}
                      onPress={() => p.onUnlock(selected.slug, selected.hearts)}
                      disabled={p.hearts < selected.hearts}
                    >
                      <View style={styles.iconRow}>
                        <XpIcon width={16} height={16} />
                        <Text style={[styles.buyText, p.hearts < selected.hearts && styles.disabledText]}> {selected.hearts}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.scanChip}>
                      <View style={styles.iconRow}>
                        <Image source={CAMERA_ICON} style={styles.scanIcon} resizeMode="contain" />
                        <Text style={styles.scanText}> Scan</Text>
                      </View>
                    </View>
                  </View>
                )}
                </>
              ) : (
                <Text style={styles.detailHint}>Tap a plant to see its details</Text>
              )}
            </ScrollView>
          </View>
          {/* close sits at the home-icon spot, same as the Shop modal */}
          <TouchableOpacity style={[styles.albumClose, { top: H * 0.03 }]} onPress={p.onCloseAlbum}>
            <CloseIcon width={38} height={38} />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  albumDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
  },
  albumDotLocked: { backgroundColor: theme.colors.locked },
  albumDotOpen: { backgroundColor: theme.colors.success },
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
  buyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 24,
    justifyContent: "center",
  },
  buyText: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
  iconRow: { flexDirection: "row", alignItems: "center" },
  // overflow hidden is the hard guarantee: rows can never paint outside
  // the notebook, even if the list's sizing misbehaves. marginTop nudges
  // the centered card a touch lower on screen.
  albumCard: { overflow: "hidden", marginTop: 20 },
  albumBg: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
  // content sits on the open pages, inside the cover edges
  // content flows INSIDE the card on the LEFT page only (the spine/rings
  // sit at ~46-54%, hence the big right padding). In-flow on purpose: a
  // flex ScrollView inside an absolutely-positioned overlay was NOT
  // bounded by the card and rows leaked past the notebook's bottom edge.
  albumContent: { 
    flex: 1, 
    overflow: "hidden", 
    paddingLeft: "5%", 
    paddingRight: "56%", 
    paddingTop: "6%", 
    paddingBottom: "9%" 
  },
  albumTop: { height: TOP_H },
  countText: { fontSize: 12, textAlign: "right", fontFamily: "Cause_600SemiBold", color: theme.colors.textMuted, marginBottom: 6 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 34,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.text, padding: 0 },
  clearText: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.textMuted, paddingLeft: 8 },
  noMatch: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, paddingVertical: 10 },
  albumClose: { position: "absolute", right: 45 },
  entrySelected: { backgroundColor: theme.colors.selected },
  // right page detail (absolute over the card's right half, clear of the rings)
  detailPage: { 
    position: "absolute", 
    left: "55%", 
    right: "6%", 
    top: "10%", 
    bottom: "12%"
  },
  detailPageContent: { alignItems: "center", flexGrow: 1 },
  detailAvatar: {
    width: 69,
    height: 69,
    borderRadius: 52,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  detailSprite: { width: 96, height: 129, top: 5 },
  detailDot: {
    width: 75,
    height: 75,
    borderRadius: 52,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    marginTop: 6,
  },
  detailName: { fontSize: 17, fontFamily: "Cause_700Bold", color: theme.colors.text, marginTop: 10, textAlign: "center" },
  detailSci: { fontSize: 12, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginTop: 2, textAlign: "center" },
  detailInfo: { marginTop: 14, alignSelf: "stretch" },
  detailRowView: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  detailRowText: { flex: 1, flexShrink: 1, fontSize: 12, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  detailIcon: { width: 16, height: 16, marginRight: 4 },
  traitChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 3 },
  traitChip: { backgroundColor: theme.colors.surfaceMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  traitChipText: { fontSize: 12, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  priceBlock: { 
    alignSelf: "stretch", 
    marginTop: 4, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.border,
    marginBottom: 2, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  priceLabel: { fontSize: 13, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  priceValue: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text },
  detailChips: { flexDirection: "row", gap: 8, marginTop: 14, justifyContent: "center" },
  detailHint: { fontSize: 13, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, textAlign: "center", marginTop: 24 },
  entryWrap: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  row: { flexDirection: "row", alignItems: "center", paddingLeft: 3 },
  // the two unlock paths, on their own line under the name
  chipRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginLeft: 50, marginTop: 5 },
  scanChip: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 25,
    justifyContent: "center",
  },
  scanIcon: { width: 16, height: 16 },
  scanText: { fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.text },
  rowName: { flex: 1, fontSize: 14, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  qtyChip: {
    backgroundColor: theme.art.leafPale,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 24,
    justifyContent: "center",
  },
  qtyText: { fontSize: 13, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  albumAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  albumSprite: { width: 45.5, height: 59.5, top: 3 },
  albumSpriteLocked: { opacity: 0.35 },
});
