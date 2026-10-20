import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, useWindowDimensions } from "react-native";
import { Canvas, Image as SkImage, useImage } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  Easing,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
  runOnJS,
  type SharedValue,
} from "react-native-reanimated";
import { buildSlots, layout } from "./zones";
import { PotSprite, type PotData } from "./PotSprite";
import { ParticleLayer, spawnBurst, type Particle } from "./Particles";
import { CustomerSprite } from "./CustomerSprite";
import { CUSTOMER_COUNT, type CustomerMood } from "./customerSprites";
import {
  SPECIES,
  speciesById,
  matchTraits,
  requestText,
  refuseText,
  randomSpeciesId,
  pick,
  POT_TIERS,
  POT_TIER_ORDER,
  STAGE_LABEL,
  type Request,
  type TraitKey,
  type PotTier,
} from "../data/plants";

// One fixed room, GPGP-style. Two phases:
// - CLOSED: buy / plant / move / water. No customers. Time still passes.
// - OPEN: 20 customers/day. Serve (drag) + water only. No management.

const SPRING = { damping: 16, stiffness: 170 };
const HIT_R = 70;
const SNAP_R = 120;
const PATIENCE_SEC = 45;
const CUSTOMERS_PER_DAY = 20;

interface Customer {
  id: number;
  custId: number; // sprite id 1..41
  request: Request;
  mood: "waiting" | "happy" | "angry";
  note: string | null;
}

// Worklet: find the pot id living in a slot (pots are deleted on sale).
function potIdInSlot(potsVal: Record<string, PotData>, slot: number): string | null {
  "worklet";
  for (const id in potsVal) {
    if (potsVal[id].slot === slot) return id;
  }
  return null;
}

function potIdInSlotJs(potsVal: Record<string, PotData>, slot: number): string | null {
  for (const id in potsVal) {
    if (potsVal[id].slot === slot) return id;
  }
  return null;
}

export function ShopScene() {
  const { width: W, height: H } = useWindowDimensions();
  const L = layout(W, H);
  const slots = buildSlots(W, H);
  const bg = useImage(require("../../assets/background/background.png"));

  const clock = useSharedValue(0);
  const dragId = useSharedValue<string | null>(null);
  const dragDX = useSharedValue(0);
  const dragDY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const grabDX = useSharedValue(0);
  const grabDY = useSharedValue(0);
  const parts = useSharedValue<Particle[]>([]);
  const customerSv = useSharedValue<Request | null>(null);
  const phaseSv = useSharedValue<"open" | "closed">("closed");

  // Day 1 starters: 4 mature plants, one per zone. The other 4 slots are
  // empty so buying/placing is part of the first day.
  const [initialPots] = useState<Record<string, PotData>>(() => {
    const starters = [
      { slot: 0, speciesId: "pothos" },
      { slot: 2, speciesId: "snake" },
      { slot: 4, speciesId: "fern" },
      { slot: 6, speciesId: "pilea" },
    ];
    const o: Record<string, PotData> = {};
    starters.forEach(({ slot, speciesId }, i) => {
      const id = `p${i + 1}`;
      o[id] = {
        id,
        wx: slots[slot].x,
        wy: slots[slot].y,
        slot,
        phase: slot * 1.7,
        speciesId,
        water: 1,
        stage: 2,
        growth: 0,
        pot: "nursery",
      };
    });
    return o;
  });
  const pots = useSharedValue(initialPots);

  const [coins, setCoins] = useState(100);
  const [phase, setPhase] = useState<"open" | "closed">("closed");
  const [day, setDay] = useState(1);
  const [servedCount, setServedCount] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [patience, setPatience] = useState(1);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [slotModal, setSlotModal] = useState<number | null>(null);
  const [placePot, setPlacePot] = useState<PotTier>("nursery");
  const [daySummary, setDaySummary] = useState<null | { coins: number; happy: number; angry: number }>(null);
  const [, setTick] = useState(0);

  const timeouts = useRef<number[]>([]);
  const custCount = useRef(0);
  const dayStats = useRef({ coins: 0, happy: 0, angry: 0 });
  const resolvedRef = useRef(false); // customer already served/timed out? blocks double-sale race
  useEffect(() => () => {
    timeouts.current.forEach(clearTimeout);
  }, []);
  function later(ms: number, fn: () => void) {
    timeouts.current.push(setTimeout(fn, ms) as unknown as number);
  }
  function setPhaseBoth(p: "open" | "closed") {
    phaseSv.value = p;
    setPhase(p);
  }

  // Game clock
  useEffect(() => {
    clock.value = withRepeat(
      withTiming(3600, { duration: 3600 * 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock]);

  function makeRequest(ids: string[]): Request {
    if (Math.random() < 0.5) {
      return { kind: "specific", speciesId: pick(ids) };
    }
    const union = [...new Set(ids.flatMap((id) => speciesById(id).traits))];
    const wants: TraitKey[] = [];
    while (wants.length < 2 && union.length > 0) {
      wants.push(union.splice(Math.floor(Math.random() * union.length), 1)[0]);
    }
    return { kind: "traits", wants };
  }

  function spawnCustomer() {
    if (phaseSv.value !== "open") return;
    const ids = Object.values(pots.value).map((p) => p.speciesId);
    if (ids.length === 0) {
      later(5000, spawnCustomer); // empty shop: player should close + restock
      return;
    }
    const req = makeRequest(ids);
    customerSv.value = req;
    resolvedRef.current = false;
    setCustomer({
      id: Date.now(),
      custId: 1 + Math.floor(Math.random() * CUSTOMER_COUNT),
      request: req,
      mood: "waiting",
      note: null,
    });
    setPatience(1);
  }

  function endDay() {
    customerSv.value = null;
    setCustomer(null);
    setDaySummary({ ...dayStats.current });
    setPhaseBoth("closed");
    setDay((d) => d + 1);
    custCount.current = 0;
    dayStats.current = { coins: 0, happy: 0, angry: 0 };
    setServedCount(0);
  }

  function openShop() {
    setDaySummary(null);
    setPhaseBoth("open");
    custCount.current = 0;
    dayStats.current = { coins: 0, happy: 0, angry: 0 };
    setServedCount(0);
    later(1000, () => {
      if (phaseSv.value === "open") spawnCustomer();
    });
  }

  function closeShop() {
    endDay(); // early close: current customer just leaves
  }

  function leaveAndNext() {
    later(1500, () => {
      customerSv.value = null;
      setCustomer(null);
      custCount.current += 1;
      setServedCount(custCount.current);
      if (custCount.current >= CUSTOMERS_PER_DAY) {
        endDay();
      } else {
        later(2500, () => {
          if (phaseSv.value === "open") spawnCustomer();
        });
      }
    });
  }

  function handleTimeout() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    customerSv.value = null; // close the serve gate immediately
    dayStats.current.angry += 1;
    setCustomer((c) => (c ? { ...c, mood: "angry", note: "Never mind, I'm leaving." } : c));
    leaveAndNext();
  }

  function handleSale(plantId: string, stars: number, price: number) {
    if (resolvedRef.current) return; // this customer was already served (double-drop race)
    resolvedRef.current = true;
    customerSv.value = null; // close the serve gate NOW, not after the leave delay
    setCoins((c) => c + price);
    dayStats.current.coins += price;
    dayStats.current.happy += 1;
    setCustomer((c) =>
      c
        ? { ...c, mood: "happy", note: stars === 3 ? "Perfect, thank you!" : "This'll do, thanks!" }
        : c
    );
    // sold plant is gone; slot stays empty until replanted (no auto-restock)
    const next = { ...pots.value };
    delete next[plantId];
    pots.value = next;
    setTick((t) => t + 1);
    dragDX.value = 0;
    dragDY.value = 0;
    leaveAndNext();
  }

  function handleRefuse(note: string) {
    setCustomer((c) => (c ? { ...c, note } : c));
    later(1500, () => {
      setCustomer((c) => (c && c.mood === "waiting" ? { ...c, note: null } : c));
    });
  }

  function handleWater(plantId: string) {
    pots.value = {
      ...pots.value,
      [plantId]: { ...pots.value[plantId], water: 1 },
    };
    setTick((t) => t + 1);
  }

  function buyPlant(speciesId: string) {
    const sp = speciesById(speciesId);
    if (coins < sp.buy) return;
    setCoins((c) => c - sp.buy);
    setInventory((inv) => ({ ...inv, [speciesId]: (inv[speciesId] ?? 0) + 1 }));
  }

  function placePlant(slot: number, speciesId: string, pot: PotTier) {
    const potCost = POT_TIERS[pot].price;
    if (coins < potCost) return;
    if ((inventory[speciesId] ?? 0) <= 0) return;
    if (potIdInSlotJs(pots.value, slot)) return; // slot taken
    const nid = `p${Date.now()}`;
    pots.value = {
      ...pots.value,
      [nid]: {
        id: nid,
        wx: slots[slot].x,
        wy: slots[slot].y,
        slot,
        phase: Math.random() * 6,
        speciesId,
        water: 1,
        stage: 0,
        growth: 0,
        pot,
      },
    };
    setInventory((inv) => ({ ...inv, [speciesId]: inv[speciesId] - 1 }));
    setCoins((c) => c - potCost);
    setTick((t) => t + 1);
    setSlotModal(null);
  }

  function movePlant(fromSlot: number, toSlot: number) {
    if (fromSlot === toSlot) {
      setSlotModal(null);
      return;
    }
    const next = { ...pots.value };
    const aId = potIdInSlotJs(next, fromSlot);
    if (!aId) {
      setSlotModal(null);
      return;
    }
    const bId = potIdInSlotJs(next, toSlot);
    const a = next[aId];
    if (bId) {
      const b = next[bId];
      next[aId] = { ...a, slot: toSlot, wx: slots[toSlot].x, wy: slots[toSlot].y };
      next[bId] = { ...b, slot: fromSlot, wx: slots[fromSlot].x, wy: slots[fromSlot].y };
    } else {
      next[aId] = { ...a, slot: toSlot, wx: slots[toSlot].x, wy: slots[toSlot].y };
    }
    pots.value = next;
    setTick((t) => t + 1);
    setSlotModal(null);
  }

  function openSlotModal(slot: number) {
    setPlacePot("nursery");
    setSlotModal(slot);
  }

  function bumpTick() {
    setTick((t) => t + 1);
  }

  // water drain + growth (runs in both phases)
  useEffect(() => {
    const iv = setInterval(() => {
      let changed = false;
      const next = { ...pots.value };
      for (const id in next) {
        const p = next[id];
        if (p.water <= 0) continue;
        let { water, stage, growth } = p;
        water = Math.max(0, water - 1 / 60);
        if (stage < 2) {
          growth += 1 / 25;
          if (growth >= 1) {
            growth = 0;
            stage = (stage + 1) as 0 | 1 | 2;
          }
        }
        next[id] = { ...p, water, stage, growth };
        changed = true;
      }
      if (changed) {
        pots.value = next;
        setTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // patience drain while a customer waits
  useEffect(() => {
    if (!customer || customer.mood !== "waiting") return;
    const iv = setInterval(() => {
      setPatience((p) => {
        const np = p - 0.25 / PATIENCE_SEC;
        if (np <= 0) {
          clearInterval(iv);
          handleTimeout();
          return 0;
        }
        return np;
      });
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, customer?.mood]);

  // Tap = water/manage (dedicated Tap gesture, reliable). Pan = drag to move/serve.
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(500)
      .maxDistance(24)
      .onEnd((e) => {
        // hit-test the PLANT's visible bounds — foliage sits ~100px above
        // the pot, so a slot-point test misses leaf taps.
        let hitId: string | null = null;
        let hitD = Infinity;
        for (const id in pots.value) {
          const p = pots.value[id];
          if (e.x > p.wx - 85 && e.x < p.wx + 85 && e.y > p.wy - 200 && e.y < p.wy + 50) {
            const dx = e.x - p.wx;
            const dy = e.y - (p.wy - 90);
            const d = dx * dx + dy * dy;
            if (d < hitD) {
              hitD = d;
              hitId = id;
            }
          }
        }
        spawnBurst(parts, clock.value, e.x, e.y, "#d9ecff"); // tap landed here
        if (hitId) {
          const pd = pots.value[hitId];
          if (phaseSv.value === "open" || pd.water < 0.35) {
            spawnBurst(parts, clock.value, e.x, e.y, "#7fc8f2");
            runOnJS(handleWater)(hitId);
          } else if (phaseSv.value === "closed") {
            runOnJS(openSlotModal)(pd.slot); // closed + happy plant = manage
          }
        } else if (phaseSv.value === "closed") {
          // no plant hit: nearest slot (empty = place modal)
          let best = -1;
          let bestD = HIT_R * HIT_R;
          for (let i = 0; i < slots.length; i++) {
            const dx = e.x - slots[i].x;
            const dy = e.y - slots[i].y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          if (best >= 0) runOnJS(openSlotModal)(best);
        }
      });

    const pan = Gesture.Pan()
      .minDistance(24)
      .onBegin((e) => {
          const ps = pots.value;
          for (const id in ps) {
            const dx = e.x - ps[id].wx;
            const dy = e.y - ps[id].wy;
            if (dx * dx + dy * dy < HIT_R * HIT_R) {
              dragId.value = id;
              grabDX.value = e.x - ps[id].wx;
              grabDY.value = e.y - ps[id].wy;
              dragDX.value = 0;
              dragDY.value = 0;
              dragScale.value = withSpring(1.18, SPRING);
              break;
            }
          }
        })
        .onUpdate((e) => {
          const did = dragId.value;
          if (!did) return;
          const p = pots.value[did];
          if (!p) return;
          dragDX.value = e.x - grabDX.value - p.wx;
          dragDY.value = e.y - grabDY.value - p.wy;
        })
        .onEnd((e) => {
          const did = dragId.value;
          if (!did) return;
          const p = pots.value[did];
          if (!p) {
            dragId.value = null;
            return;
          }
          dragScale.value = withSpring(1, SPRING);
          if (phaseSv.value === "closed") {
            // CLOSED: drag to a slot = move / swap (no serving)
            let best = -1;
            let bestD = SNAP_R * SNAP_R;
            for (let i = 0; i < slots.length; i++) {
              const dx = e.x - slots[i].x;
              const dy = e.y - slots[i].y;
              const d = dx * dx + dy * dy;
              if (d < bestD) {
                bestD = d;
                best = i;
              }
            }
            if (best >= 0 && best !== p.slot) {
              const next = { ...pots.value };
              const bId = potIdInSlot(next, best);
              const a = next[did];
              if (bId) {
                const b = next[bId];
                next[did] = { ...a, slot: best, wx: slots[best].x, wy: slots[best].y };
                next[bId] = { ...b, slot: p.slot, wx: slots[p.slot].x, wy: slots[p.slot].y };
              } else {
                next[did] = { ...a, slot: best, wx: slots[best].x, wy: slots[best].y };
              }
              pots.value = next;
              dragDX.value = 0;
              dragDY.value = 0;
              spawnBurst(parts, clock.value, slots[best].x, slots[best].y - 40);
              runOnJS(bumpTick)();
            } else {
              dragDX.value = withSpring(0, SPRING);
              dragDY.value = withSpring(0, SPRING);
            }
            dragId.value = null;
            return;
          }
          // OPEN: drag to the customer = serve
          const dz = L.dropZone;
          const inDZ = e.x > dz.x0 && e.x < dz.x1 && e.y > dz.y0 && e.y < dz.y1;
          if (inDZ && customerSv.value) {
            const req = customerSv.value;
            const sid = p.speciesId;
            let stars = 0;
            if (req.kind === "specific") {
              stars = sid === req.speciesId ? 3 : 0;
            } else {
              const m = matchTraits(req.wants, sid);
              stars = m === 0 ? 0 : m >= req.wants.length ? 3 : m === req.wants.length - 1 ? 2 : 1;
            }
            if (stars > 0) {
              const sp = speciesById(sid);
              const price = Math.round(
                sp.sell *
                  [0, 0.5, 0.75, 1][stars] *
                  [0.3, 0.6, 1][p.stage] *
                  (1 + POT_TIERS[p.pot].bonus)
              );
              spawnBurst(parts, clock.value, e.x, e.y - 30);
              runOnJS(handleSale)(did, stars, price);
            } else {
              const note = refuseText(req);
              dragDX.value = withSpring(0, SPRING);
              dragDY.value = withSpring(0, SPRING);
              runOnJS(handleRefuse)(note);
            }
          } else {
            dragDX.value = withSpring(0, SPRING);
            dragDY.value = withSpring(0, SPRING);
          }
          dragId.value = null;
        });

    return Gesture.Race(tap, pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pipColor = patience > 0.5 ? "#4caf50" : patience > 0.25 ? "#ffb300" : "#e53935";
  const potBySlot: Record<number, string> = {};
  for (const id in pots.value) potBySlot[pots.value[id].slot] = id;
  const totalInv = Object.values(inventory).reduce((a, b) => a + b, 0);

  const modalSlotPid = slotModal !== null ? potBySlot[slotModal] ?? null : null;
  const modalSlotPlant = modalSlotPid ? pots.value[modalSlotPid] : null;
  const spriteMood: CustomerMood =
    customer?.mood === "happy" ? "happy" : customer?.mood === "angry" ? "upset" : "neutral";

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <Canvas style={styles.fill}>
            <SkImage image={bg} x={0} y={0} width={W} height={H} fit="cover" />
            {customer && (
              <CustomerSprite
                custId={customer.custId}
                mood={spriteMood}
                x={L.customerX}
                headY={L.customerHeadY}
              />
            )}
            {Object.keys(pots.value).map((id) => (
              <PotSprite
                key={id}
                id={id}
                pots={pots}
                clock={clock}
                dragId={dragId}
                dragDX={dragDX}
                dragDY={dragDY}
                dragScale={dragScale}
              />
            ))}
            <ParticleLayer parts={parts} clock={clock} />
          </Canvas>

          {/* dialogue bubble */}
          {customer && (
            <View pointerEvents="none" style={[styles.bubble, { top: H * 0.08, left: W * 0.04, width: W * 0.46 }]}>
              <Text style={styles.bubbleText}>{customer.note ?? requestText(customer.request)}</Text>
              {customer.mood === "waiting" && (
                <View style={styles.pips}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.pip,
                        { backgroundColor: i < Math.ceil(patience * 10) ? pipColor : "#e8e0d4" },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* top bar: phase controls (left), day (center), coins (right) */}
          <View pointerEvents="none" style={[styles.dayPill, { top: H * 0.03 }]}>
            <Text style={styles.dayText}>
              Day {day} • {phase === "open" ? `Open ${servedCount}/${CUSTOMERS_PER_DAY}` : "Closed"}
            </Text>
          </View>
          <View pointerEvents="none" style={[styles.coins, { top: H * 0.03 }]}>
            <Text style={styles.coinText}>🪙 {coins}</Text>
          </View>
          {phase === "closed" ? (
            <TouchableOpacity style={[styles.supplierBtn, { top: H * 0.03 }]} onPress={() => setSupplierOpen(true)}>
              <Text style={styles.supplierText}>🌱 Supplier{totalInv > 0 ? ` (${totalInv})` : ""}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.supplierBtn, { top: H * 0.03 }]} onPress={closeShop}>
              <Text style={styles.supplierText}>Close</Text>
            </TouchableOpacity>
          )}

          {/* open-shop button (closed phase) */}
          {phase === "closed" && !daySummary && (
            <TouchableOpacity style={[styles.openBtn, { top: H * 0.12 }]} onPress={openShop}>
              <Text style={styles.openText}>☀️ Open Shop</Text>
            </TouchableOpacity>
          )}

          {/* shelf name markers */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid) return null;
            return (
              <View key={i} pointerEvents="none" style={[styles.marker, { left: s.x - 44, top: s.y + 46 }]}>
                <Text style={styles.markerText}>{speciesById(pots.value[pid].speciesId).name}</Text>
              </View>
            );
          })}

          {/* "!" attention markers */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid) return null;
            const thirsty = (pots.value[pid]?.water ?? 1) < 0.35;
            return thirsty ? (
              <View
                key={`alert${i}`}
                pointerEvents="none"
                style={[styles.alert, { left: s.x - 13, top: s.y - 178 }]}
              >
                <Text style={styles.alertText}>!</Text>
              </View>
            ) : null;
          })}

          {/* empty-slot "+" markers (closed phase): tap to plant from inventory */}
          {phase === "closed" &&
            slots.map((s, i) => {
              if (potBySlot[i]) return null;
              return (
                <View
                  key={`empty${i}`}
                  pointerEvents="none"
                  style={[styles.emptySlot, { left: s.x - 24, top: s.y - 24 }]}
                >
                  <Text style={styles.emptyText}>+</Text>
                </View>
              );
            })}

          {/* supplier modal */}
          {supplierOpen && (
            <View style={styles.backdrop}>
              <View style={[styles.modal, { width: W * 0.6 }]}>
                <Text style={styles.modalTitle}>🌱 Supplier</Text>
                <Text style={styles.modalCoins}>🪙 {coins}</Text>
                {SPECIES.map((sp) => (
                  <View key={sp.id} style={styles.row}>
                    <Text style={styles.rowName}>{sp.name}</Text>
                    <Text style={styles.rowSub}>
                      buy 🪙{sp.buy} • sells 🪙{sp.sell}
                      {(inventory[sp.id] ?? 0) > 0 && ` • own ${inventory[sp.id]}`}
                    </Text>
                    <TouchableOpacity
                      style={[styles.buyBtn, coins < sp.buy && styles.disabledBtn]}
                      onPress={() => buyPlant(sp.id)}
                      disabled={coins < sp.buy}
                    >
                      <Text style={styles.buyText}>Buy</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSupplierOpen(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
                {totalInv > 0 && (
                  <Text style={styles.hint}>Tap an empty shelf (+) to plant your purchases!</Text>
                )}
              </View>
            </View>
          )}

          {/* slot modal: place (empty) or manage (occupied) */}
          {slotModal !== null && (
            <View style={styles.backdrop}>
              <View style={[styles.modal, { width: W * 0.6 }]}>
                {!modalSlotPlant ? (
                  <>
                    <Text style={styles.modalTitle}>Empty Shelf</Text>
                    {Object.entries(inventory).filter(([, c]) => c > 0).length === 0 && (
                      <Text style={styles.hint}>No plants in stock — buy from the supplier!</Text>
                    )}
                    {Object.entries(inventory)
                      .filter(([, c]) => c > 0)
                      .map(([sid, count]) => (
                        <View key={sid} style={styles.row}>
                          <Text style={styles.rowName}>
                            {speciesById(sid).name} ×{count}
                          </Text>
                          <TouchableOpacity
                            style={styles.buyBtn}
                            onPress={() => placePlant(slotModal, sid, placePot)}
                          >
                            <Text style={styles.buyText}>Plant</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    <Text style={styles.sectionLabel}>Pot:</Text>
                    <View style={styles.potRow}>
                      {POT_TIER_ORDER.map((t) => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.potChip, placePot === t && styles.potChipSel]}
                          onPress={() => setPlacePot(t)}
                        >
                          <Text style={styles.potChipText}>
                            {POT_TIERS[t].name}
                            {POT_TIERS[t].price > 0 ? ` 🪙${POT_TIERS[t].price}` : " free"} (+{Math.round(POT_TIERS[t].bonus * 100)}%)
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>{speciesById(modalSlotPlant.speciesId).name}</Text>
                    <Text style={styles.rowSub}>
                      {STAGE_LABEL[modalSlotPlant.stage]} • {POT_TIERS[modalSlotPlant.pot].name} • water {Math.round(modalSlotPlant.water * 100)}%
                    </Text>
                    <TouchableOpacity style={styles.buyBtn} onPress={() => handleWater(modalSlotPid!)}>
                      <Text style={styles.buyText}>💧 Water</Text>
                    </TouchableOpacity>
                    <Text style={styles.sectionLabel}>Move to:</Text>
                    <View style={styles.slotGrid}>
                      {slots.map((_, i) => {
                        const occupied = !!potBySlot[i];
                        return (
                          <TouchableOpacity
                            key={i}
                            style={[styles.slotCell, i === slotModal && styles.slotCellCur]}
                            onPress={() => movePlant(slotModal, i)}
                          >
                            <Text>{i === slotModal ? "📍" : occupied ? "🪴" : "⬜"}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSlotModal(null)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* day summary */}
          {daySummary && (
            <View style={styles.backdrop}>
              <View style={[styles.modal, { width: W * 0.5, alignItems: "center" }]}>
                <Text style={styles.modalTitle}>Day {day - 1} complete!</Text>
                <Text style={styles.rowSub}>
                  +🪙{daySummary.coins} • 😊 {daySummary.happy} • 😞 {daySummary.angry}
                </Text>
                <TouchableOpacity style={styles.openBtn2} onPress={() => setDaySummary(null)}>
                  <Text style={styles.openText}>Prep for Day {day}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bubble: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#fffdf8",
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bubbleText: { fontSize: 15, fontWeight: "600", color: "#4a3b2c", textAlign: "center" },
  pips: { flexDirection: "row", marginTop: 6, gap: 3 },
  pip: { width: 14, height: 8, borderRadius: 3 },
  dayPill: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(255,253,248,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayText: { fontSize: 14, fontWeight: "700", color: "#4a3b2c" },
  coins: {
    position: "absolute",
    right: 16,
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coinText: { fontSize: 16, fontWeight: "700", color: "#4a3b2c" },
  supplierBtn: {
    position: "absolute",
    left: 16,
    backgroundColor: "#fffdf8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supplierText: { fontSize: 14, fontWeight: "700", color: "#4a3b2c" },
  openBtn: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#ffb300",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  openText: { fontSize: 18, fontWeight: "800", color: "#4a3b2c" },
  openBtn2: {
    backgroundColor: "#ffb300",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  marker: {
    position: "absolute",
    width: 88,
    backgroundColor: "rgba(93,63,39,0.85)",
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  markerText: { fontSize: 10, color: "#ffe9c4", fontWeight: "600", textAlign: "center" },
  alert: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e53935",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  alertText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  emptySlot: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,253,248,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 26, fontWeight: "700", color: "rgba(255,253,248,0.9)" },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(30,20,12,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: {
    backgroundColor: "#fffdf8",
    borderRadius: 16,
    padding: 16,
    maxHeight: "85%",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#4a3b2c", marginBottom: 4 },
  modalCoins: { fontSize: 14, fontWeight: "700", color: "#4a3b2c", marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee5d5",
  },
  rowName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#4a3b2c" },
  rowSub: { fontSize: 12, color: "#8a7a64", marginRight: 8 },
  buyBtn: {
    backgroundColor: "#4caf50",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  disabledBtn: { backgroundColor: "#bdbdbd" },
  buyText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  closeBtn: {
    marginTop: 12,
    alignItems: "center",
    backgroundColor: "#eee5d5",
    borderRadius: 10,
    paddingVertical: 8,
  },
  closeText: { fontSize: 14, fontWeight: "700", color: "#4a3b2c" },
  hint: { fontSize: 13, color: "#8a7a64", fontStyle: "italic", marginVertical: 8 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#4a3b2c", marginTop: 10, marginBottom: 6 },
  potRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  potChip: {
    borderWidth: 1,
    borderColor: "#d5c8b0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  potChipSel: { backgroundColor: "#ffe9c4", borderColor: "#c9763f" },
  potChipText: { fontSize: 12, fontWeight: "600", color: "#4a3b2c" },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  slotCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f3ecdd",
    alignItems: "center",
    justifyContent: "center",
  },
  slotCellCur: { backgroundColor: "#ffe9c4" },
});
