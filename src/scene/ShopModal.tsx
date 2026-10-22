import { theme } from "../theme";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView, Image } from "react-native";
import { useState } from "react";
import { POT_TIERS, POT_TIER_ORDER, type Species } from "../data/plants";
import { plantSpriteSource } from "./plantSprites";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import CloseIcon from "../../assets/icons/close-button.svg";

// Shop (supplier) modal — buy plants. Split out of ClosedShop (2026-10-20);
// still rendered via ClosedModals, OUTSIDE the GestureDetector, so the
// plant grid can scroll.

const SHOP_BG = require("../../assets/background/shop-modal-oatmeal-linen.png");
const PLANK = require("../../assets/background/plank.png");
const NOTEBOOK = require("../../assets/background/ring-notebook-page.png");

// Plant Care tab catalog (from the fertilizer & soil design, DESIGN.md
// 2026-10-20 — designed, not built: no prices or mechanics wired yet).
const CARE_ITEMS = [
  { name: "Fertilizer", text: "One plant grows +50% faster for its current stage." },
  { name: "Standard Soil", text: "No change." },
  { name: "Moisture-retentive Soil", text: "Water drains ~20% slower." },
  { name: "Gritty Soil", text: "Harder to overwater — the waterlogged line rises." },
];

export interface ShopModalProps {
  W: number;
  H: number;
  supplierOpen: boolean;
  onCloseSupplier: () => void;
  inventory: Record<string, number>;
  coins: number;
  totalInv: number;
  cart: Record<string, number>;
  onAddToCart: (speciesId: string) => void;
  onSetCartQty: (speciesId: string, qty: number) => void;
  onBuyCart: () => void;
  // Species the shop may sell (starters + Album-unlocked) — locked species
  // are not shown in the grid at all (species gate, 2026-10-22).
  species: Species[];
}

export function ShopModal(p: ShopModalProps) {
  const { W, H } = p;
  // The stall keeps its old 4:3 size on the left; the notebook page sits at
  // its natural 2:3 ratio on the right (width = card height x 2/3 = stallW
  // x 0.5), so neither artwork is distorted.
  const stallW = Math.min(W * 0.82, H * 1.22);
  const cartList = p.species.filter((sp) => (p.cart[sp.id] ?? 0) > 0);
  const cartTotal = cartList.reduce((s, sp) => s + sp.buy * (p.cart[sp.id] ?? 0), 0);
  const [tab, setTab] = useState<"plants" | "pots" | "care">("plants");
  return (
    <>
      {/* supplier modal */}
      {p.supplierOpen && (
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={p.onCloseSupplier} />
          <View
            style={[
              styles.shopCard,
              { width: stallW * 1.5, height: stallW * 0.75 },
            ]}
          >
            {/* left 3/4: the stall, exactly as before */}
            <View style={{ width: stallW, height: "100%" }}>
            <Image source={SHOP_BG} style={styles.shopBg} resizeMode="stretch" />
            {tab === "plants" && (
            <ScrollView style={styles.shopPanel} showsVerticalScrollIndicator={false}>
              {Array.from({ length: Math.ceil(p.species.length / 5) }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.plankRow}>
                  <Image source={PLANK} style={styles.plankImg} resizeMode="stretch" />
                  <View style={styles.plankCells}>
                    {p.species.slice(rowIdx * 5, rowIdx * 5 + 5).map((sp) => {
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
                            style={styles.shopBuyBtn}
                            onPress={() => p.onAddToCart(sp.id)}
                          >
                            <View style={styles.iconRow}>
                              <CoinIcon width={14} height={14} />
                              <Text style={styles.buyText}> {sp.buy}</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            )}
            {tab === "pots" && (
            <ScrollView style={styles.shopPanel} showsVerticalScrollIndicator={false}>
              <View style={styles.plankRow}>
                <Image source={PLANK} style={styles.plankImg} resizeMode="stretch" />
                <View style={styles.plankCells}>
                  {POT_TIER_ORDER.map((t) => {
                    const tier = POT_TIERS[t];
                    return (
                      <View key={t} style={styles.potCell}>
                        <View style={styles.potDraw}>
                          <View style={[styles.potRimDraw, { backgroundColor: tier.rim }]} />
                          <View style={[styles.potBodyDraw, { backgroundColor: tier.color }]} />
                        </View>
                        <Text style={styles.potName}>{tier.name}</Text>
                        <Text style={styles.potBonus}>
                          {tier.bonus > 0 ? `+${Math.round(tier.bonus * 100)}% sale price` : "No sale bonus"}
                        </Text>
                        <View style={{ marginTop: 3 }}>
                          {tier.price === 0 ? (
                            <Text style={styles.potPrice}>Free</Text>
                          ) : (
                            <View style={styles.iconRow}>
                              <CoinIcon width={12} height={12} />
                              <Text style={styles.potPrice}> {tier.price}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            )}
            {tab === "care" && (
            <ScrollView style={styles.shopPanel} showsVerticalScrollIndicator={false}>
              {CARE_ITEMS.map((item) => (
                <View key={item.name} style={styles.careRow}>
                  <Text style={styles.careName}>{item.name}</Text>
                  <Text style={styles.careText}>{item.text}</Text>
                </View>
              ))}
            </ScrollView>
            )}
            {/* Plants / Pots tabs: card flaps hanging off the stall's
                DRAWN bottom rail. The linen artwork's frame ends at
                95.1% of the box height (measured from the PNG) — the
                flaps sit on that edge, not the layout box's edge. */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "plants" ? styles.tabBtnActive : styles.tabBtnInactive]}
                onPress={() => setTab("plants")}
              >
                <Text style={styles.tabText}>Plants</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "pots" ? styles.tabBtnActive : styles.tabBtnInactive]}
                onPress={() => setTab("pots")}
              >
                <Text style={styles.tabText}>Pots</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, tab === "care" ? styles.tabBtnActive : styles.tabBtnInactive]}
                onPress={() => setTab("care")}
              >
                <Text style={styles.tabText}>Plant Care</Text>
              </TouchableOpacity>
            </View>
            </View>
            {/* right 1/4: notebook page — the hint lives here now */}
            <View style={[styles.noteWrap, { width: stallW * 0.5 }]}>
              <Image source={NOTEBOOK} style={styles.noteBg} resizeMode="stretch" />
              {/* {cartList.length === 0 ? (
                <Text style={styles.noteHint}>
                  {p.totalInv > 0
                    ? "Tap an empty shelf (+) to plant your purchases!"
                    : "Tap a plant's price to add it to your list."}
                </Text>
              ) : ( */}
              <>
                <ScrollView style={styles.noteList} showsVerticalScrollIndicator={false}>
                  {cartList.map((sp) => {
                    const qty = p.cart[sp.id];
                    return (
                      <View key={sp.id} style={styles.noteRow}>
                        <Text style={styles.noteName}>{sp.name}</Text>
                        <View style={styles.stepper}>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => p.onSetCartQty(sp.id, qty - 1)}>
                            <Text style={styles.stepText}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity style={styles.stepBtn} onPress={() => p.onSetCartQty(sp.id, qty + 1)}>
                            <Text style={styles.stepText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.iconRow}>
                          <CoinIcon width={11} height={11} />
                          <Text style={styles.notePrice}> {sp.buy * qty}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={styles.noteFooter}>
                  <View style={styles.noteTotalRow}>
                    <Text style={styles.noteTotalLabel}>Total</Text>
                    <View style={styles.iconRow}>
                      <CoinIcon width={12} height={12} />
                      <Text style={styles.noteTotal}> {cartTotal}</Text>
                    </View>
                  </View>
                  {cartTotal > p.coins && <Text style={styles.noteShort}>Need {cartTotal - p.coins} more</Text>}
                  <TouchableOpacity
                    style={[styles.noteBuyBtn, cartTotal > p.coins && styles.disabledBtn]}
                    onPress={p.onBuyCart}
                    disabled={cartTotal > p.coins}
                  >
                    <Text style={styles.noteBuyText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              </>
            </View>
          </View>
          {/* close sits at the home-icon spot (screen top-right) */}
          <TouchableOpacity style={[styles.shopClose, { top: H * 0.03 }]} onPress={p.onCloseSupplier}>
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
  backdropTap: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  buyText: { fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  disabledBtn: { backgroundColor: theme.colors.disabled },
  disabledText: { color: theme.colors.text },
  iconRow: { flexDirection: "row", alignItems: "center" },
  plankCells: { flexDirection: "row", alignItems: "center", justifyContent: "space-evenly" },
  // bottom 33 lifts the plank so its wood top meets the plants' soil line,
  // with the buy buttons in flow beneath it.
  plankImg: { position: "absolute", alignSelf: "center", bottom: 33, width: "95%", height: 50 },
  plankRow: { height: 134 },
  // Straddles the ARTWORK's top-right corner, not the wrap box's: the
  // contain-fitted art leaves ~25pt of transparent canvas on the right
  // and its top edge sits ~21pt below the wrap's top.
  shopBadge: {
    position: "absolute",
    top: 24,
    right: 16,
    backgroundColor: theme.colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  shopBadgeText: { color: theme.colors.onDanger, fontSize: 10, fontFamily: "Cause_700Bold" },
  shopBg: { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" },
  shopBuyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 1,
    marginTop: 4,
  },
  shopCard: { flexDirection: "row" },
  noteWrap: { height: "100%" },
  noteBg: { 
    position: "absolute", 
    left: 0, 
    top: 0, 
    width: "100%", 
    height: "100%"
  },
  shopCell2: { width: "10%", alignItems: "center" },
  shopClose: { position: "absolute", right: 45 },
  shopEmoji2: { fontSize: 48, width: 72, height: 96, textAlign: "center" },
  // the hint on the notebook page (inset past the ring binding on its left)
  noteHint: {
    position: "absolute",
    left: "16%",
    right: "8%",
    top: "6%",
    fontSize: 12,
    fontFamily: "Cause_400Regular",
    color: theme.colors.text,
  },
  // the shopping list on the notebook page (insets clear the ring binding)
  noteList: { 
    position: "absolute", 
    left: "20%", 
    right: "10%", 
    top: "8%", 
    bottom: "26%" 
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  noteName: { flex: 1, fontSize: 12, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  stepper: { flexDirection: "row", alignItems: "center", gap: 2, marginRight: 6 },
  stepBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.text },
  qtyText: { minWidth: 11, textAlign: "center", fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.text },
  notePrice: { fontSize: 11, fontFamily: "Cause_600SemiBold", color: theme.colors.text, minWidth: 24, textAlign: "right" },
  noteFooter: { position: "absolute", left: "20%", right: "10%", bottom: "10%" },
  noteTotalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  noteTotalLabel: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text },
  noteTotal: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text },
  noteShort: { fontSize: 11, fontFamily: "Cause_400Regular", color: theme.colors.danger, textAlign: "right", marginTop: 2 },
  noteBuyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: "center",
    marginTop: 6,
  },
  noteBuyText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  shopImg2: { width: 115.2, height: 144, top: -12 },
  // Soil line (62.5% down the sprite canvas) lands on the plank's wood top:
  // button 27 + margin 4 + this margin 2 + soil offset 36 = wood top at 69.
  shopImgWrap2: { width: 115.2, height: 144, marginBottom: -63 },
  shopPanel: {
    position: "absolute",
    left: "4%",
    right: "4%",
    top: "57%",
    bottom: "9%",
  },
  // Plants / Pots tabs: card flaps — flat paper rectangles hanging off
  // the stall's bottom edge, no top border so the flap reads as one
  // piece with the panel; active = bright paper, inactive = muted
  tabRow: { position: "absolute", left: 32, top: "95.8%", flexDirection: "row", gap: 4 },
  tabBtn: {
    width: "auto",
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: theme.colors.outline,
    borderTopWidth: 0,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
  },
  tabBtnActive: { backgroundColor: theme.colors.secondary },
  tabBtnInactive: { backgroundColor: theme.colors.surfaceMuted },
  tabText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.text },
  // Pots tab cells: the pot drawn from its tier colors, mirroring the
  // in-scene pot proportions (rim wider than the body)
  potCell: { width: "20%", alignItems: "center" },
  potDraw: { alignItems: "center", marginTop: 2 },
  potRimDraw: { width: 59, height: 18, borderRadius: 8 },
  potBodyDraw: { width: 51, height: 44, borderRadius: 8, marginTop: -2 },
  potName: { fontSize: 12, fontFamily: "Cause_600SemiBold", color: theme.colors.text, marginTop: 6, textAlign: "center" },
  potBonus: { fontSize: 10.5, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginTop: 1, textAlign: "center" },
  potPrice: { fontSize: 12, fontFamily: "Cause_700Bold", color: theme.colors.text },
  // Plant Care tab rows: plain catalog lines on the linen
  careRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  careName: { fontSize: 13, fontFamily: "Cause_600SemiBold", color: theme.colors.text },
  careText: { fontSize: 11.5, fontFamily: "Cause_400Regular", color: theme.colors.textMuted, marginTop: 1 },
});
