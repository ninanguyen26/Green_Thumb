import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Pressable, ScrollView, useWindowDimensions } from "react-native";
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
import { buildSlots, layout, type Slot } from "./zones";
import { PotSprite, type PotData } from "./PotSprite";
import { ParticleLayer, spawnBurst, type Particle } from "./Particles";
import { CustomerSprite } from "./CustomerSprite";
import { WateringCan } from "./WateringCan";
import { ShelfSprite } from "./ShelfSprite";
import {
  SHELF_DEFS,
  shelfById,
  ZONES,
  zoneById,
  type PlacedShelf,
} from "../data/shelves";
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
// Serve flow (open): tap a plant -> it presents HERE (fraction of screen,
// hovering in front of the counter, right of the customer); drag it the short
// hop into the customer to serve. The watering can tool sits at CAN_POS.
const PRESENT_POS = { x: 0.48, y: 0.54 };
const CAN_POS = { x: 0.55, y: 0.66 };
const CAN_R = 58; // tap radius for the can

interface Customer {
  id: number;
  custId: number; // sprite id 1..41
  request: Request;
  mood: "waiting" | "happy" | "angry";
  note: string | null;
}

// A plant slot: built-ins (shelfUid null) or one owned by a placed shelf.
interface SceneSlot extends Slot {
  id: number;
  shelfUid: string | null;
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
  const bg = useImage(require("../../assets/background/background.png"));

  const clock = useSharedValue(0);
  const dragId = useSharedValue<string | null>(null);
  const dragDX = useSharedValue(0);
  const dragDY = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const grabDX = useSharedValue(0);
  const grabDY = useSharedValue(0);
  // Present/dismiss glide offsets (separate from the drag's, so a glide never
  // fights an active drag). Always applied in PotSprite, spring to 0.
  const glideDX = useSharedValue(0);
  const glideDY = useSharedValue(0);
  const glideIdSv = useSharedValue<string | null>(null);
  const parts = useSharedValue<Particle[]>([]);
  const customerSv = useSharedValue<Request | null>(null);
  const phaseSv = useSharedValue<"open" | "closed">("closed");
  // Watering can tool state. canOnSv is the LOGIC (instant boolean — a spring
  // value read mid-flight made taps water after you'd already stowed the can).
  // canModeSv is only the cosmetic spring driving the can's glow.
  const canOnSv = useSharedValue(false);
  const canModeSv = useSharedValue(0);
  const [canMode, setCanMode] = useState(false);
  // The plant currently presented on the counter for serving (open phase).
  const presentedIdSv = useSharedValue<string | null>(null);
  const [presentedId, setPresentedId] = useState<string | null>(null);

  // Day 1 starters: 4 mature plants, one per zone. The other 4 slots are
  // empty so buying/placing is part of the first day.
  // (Built-in slot positions; the dynamic `slots` is derived later in this
  // component, so we can't reference it here.)
  const [initialPots] = useState<Record<string, PotData>>(() => {
    const builtin = buildSlots(W, H);
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
        wx: builtin[slot].x,
        wy: builtin[slot].y,
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

  // --- Shelves & light zones ---
  // 4 zones, each with ONE shelf spot. A zone shows its starter surface
  // (built-in slots, ids 0-7) until a bought shelf is assigned — an upgrade
  // that swaps in the shelf's own slots. Assigning/removing is only allowed
  // while the zone is EMPTY (same "clear it first" rule), so a plant never
  // references a slot that stopped existing.
  const SC = H / 390; // shelf art scale (dims are px @390H)
  const [zoneShelves, setZoneShelves] = useState<Record<string, PlacedShelf | null>>(() =>
    Object.fromEntries(ZONES.map((z) => [z.id, null]))
  );
  const [shelfStorage, setShelfStorage] = useState<string[]>(["ledge"]); // one spare to learn with
  const [shelfPanelOpen, setShelfPanelOpen] = useState(false);
  const [shelfHint, setShelfHint] = useState<string | null>(null);
  const slotIdCounter = useRef(8);
  const slots: SceneSlot[] = useMemo(() => {
    const arr: SceneSlot[] = [];
    for (const zone of ZONES) {
      const placed = zoneShelves[zone.id];
      if (placed) {
        const def = shelfById(placed.defId);
        const left = W * zone.cx - (def.width * SC) / 2;
        def.slots.forEach((sd, k) => {
          const id = placed.slotIds[k];
          arr[id] = { x: left + sd.dx * SC, y: H * zone.baseY + sd.dy * SC, zone: zone.id, id, shelfUid: placed.uid };
        });
      } else {
        for (const ss of zone.starter) {
          arr[ss.slotId] = { x: W * ss.x, y: H * ss.y, zone: zone.id, id: ss.slotId, shelfUid: null };
        }
      }
    }
    return arr;
  }, [zoneShelves, W, H, SC]);

  function zoneSlotIds(zoneId: string): number[] {
    const placed = zoneShelves[zoneId];
    if (placed) return placed.slotIds;
    return zoneById(zoneId).starter.map((s) => s.slotId);
  }
  function zoneHasPlants(zoneId: string): boolean {
    return zoneSlotIds(zoneId).some((sid) => potIdInSlotJs(pots.value, sid));
  }
  function flashShelfHint(msg: string) {
    setShelfHint(msg);
    later(1700, () => setShelfHint(null));
  }
  function buyShelf(defId: string) {
    const def = shelfById(defId);
    if (coins < def.price) return;
    setCoins((c) => c - def.price);
    setShelfStorage((prev) => [...prev, defId]);
  }
  // Assign a storage shelf to a zone (an upgrade). Only when the zone is
  // empty; the zone's old shelf (if any) returns to storage.
  function assignShelfToZone(zoneId: string, defId: string) {
    if (zoneHasPlants(zoneId)) {
      flashShelfHint("Move the plants off first!");
      return;
    }
    const def = shelfById(defId);
    const old = zoneShelves[zoneId];
    const slotIds = def.slots.map(() => slotIdCounter.current++);
    const placed: PlacedShelf = { uid: `s${Date.now()}`, defId, slotIds };
    setZoneShelves((prev) => ({ ...prev, [zoneId]: placed }));
    setShelfStorage((prev) => {
      const i = prev.indexOf(defId);
      const next = i < 0 ? [...prev] : [...prev.slice(0, i), ...prev.slice(i + 1)];
      if (old) next.push(old.defId);
      return next;
    });
  }
  function removeShelfFromZone(zoneId: string) {
    const old = zoneShelves[zoneId];
    if (!old) return;
    if (zoneHasPlants(zoneId)) {
      flashShelfHint("Move the plants off first!");
      return;
    }
    setZoneShelves((prev) => ({ ...prev, [zoneId]: null }));
    setShelfStorage((prev) => [...prev, old.defId]);
  }

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
    dismissPresented(); // a presented plant goes home for the night
    setDaySummary({ ...dayStats.current });
    setPhaseBoth("closed");
    setDay((d) => d + 1);
    custCount.current = 0;
    dayStats.current = { coins: 0, happy: 0, angry: 0 };
    setServedCount(0);
  }

  function openShop() {
    setShelfPanelOpen(false);
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
    if (presentedIdSv.value === plantId) {
      presentedIdSv.value = null;
      setPresentedId(null);
    }
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

  const PRESENT_X = W * PRESENT_POS.x;
  const PRESENT_Y = H * PRESENT_POS.y;

  // Serve flow (open): tap a plant -> it glides to the presentation spot on the
  // counter (via the drag offsets), then the player drags it to the customer.
  // The plant's wx/wy become the spot; home stays in p.slot.
  function presentPlant(plantId: string) {
    if (dragId.value) return; // a drag is in flight; don't hijack its offsets
    const cur = presentedIdSv.value;
    if (cur === plantId) return;
    const doPresent = () => {
      const p = pots.value[plantId];
      if (!p) return;
      const home = slots[p.slot];
      const next = { ...pots.value };
      next[plantId] = { ...p, wx: PRESENT_X, wy: PRESENT_Y };
      pots.value = next;
      glideIdSv.value = plantId;
      glideDX.value = home.x - PRESENT_X;
      glideDY.value = home.y - PRESENT_Y;
      glideDX.value = withSpring(0, SPRING);
      glideDY.value = withSpring(0, SPRING);
      presentedIdSv.value = plantId;
      setPresentedId(plantId);
    };
    if (cur) {
      dismissPresented();
      setTimeout(doPresent, 420); // old one glides home first
    } else {
      doPresent();
    }
  }

  function dismissPresented() {
    const pid = presentedIdSv.value;
    if (!pid) return;
    const p = pots.value[pid];
    if (p) {
      const home = slots[p.slot];
      // Keep the plant visually where it is (spot, or mid-drop at the
      // customer): anchor home, shift the offset to compensate, spring away.
      // (Uses the glide channel; the drag channel is the drop's own offset.)
      const next = { ...pots.value };
      next[pid] = { ...p, wx: home.x, wy: home.y };
      pots.value = next;
      glideIdSv.value = pid;
      glideDX.value = p.wx + dragDX.value - home.x;
      glideDY.value = p.wy + dragDY.value - home.y;
      // the drop's drag offset is spent; clear it so it doesn't double-apply
      dragDX.value = 0;
      dragDY.value = 0;
      glideDX.value = withSpring(0, SPRING);
      glideDY.value = withSpring(0, SPRING);
    }
    presentedIdSv.value = null;
    setPresentedId(null);
  }

  // Water the presented plant in place (it stays presented for serving).
  function waterPresented() {
    const pid = presentedIdSv.value;
    if (!pid || !pots.value[pid]) return;
    spawnBurst(parts, clock.value, W * PRESENT_POS.x, H * PRESENT_POS.y - 70, "#7fc8f2");
    handleWater(pid);
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
  // The modals render INSIDE the GestureDetector, so the scene gesture must be
  // switched off while one is open or taps on the modal water plants behind it.
  const anyModalOpen = supplierOpen || slotModal !== null || shelfPanelOpen;
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(500)
      .maxDistance(24)
      .enabled(!anyModalOpen)
      .onEnd((e) => {
        if (anyModalOpen) return;
        // 1. Watering can: toggles the tool. Checked first so it always wins.
        const canPX = W * CAN_POS.x;
        const canPY = H * CAN_POS.y;
        const cdx = e.x - canPX;
        const cdy = e.y - canPY;
        if (cdx * cdx + cdy * cdy < CAN_R * CAN_R) {
          const on = !canOnSv.value;
          canOnSv.value = on;
          canModeSv.value = withSpring(on ? 1 : 0, SPRING);
          runOnJS(setCanMode)(on);
          return;
        }
        // Plant hit-test on the VISIBLE bounds — foliage sits ~100px above
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
        // 2. Holding the can: taps water plants.
        if (canOnSv.value) {
          if (hitId) {
            spawnBurst(parts, clock.value, e.x, e.y, "#7fc8f2");
            runOnJS(handleWater)(hitId);
          }
          return;
        }
        // 3. Normal taps.
        if (phaseSv.value === "open") {
          // select / present; tap the presented plant (or empty space) to dismiss
          if (hitId) {
            if (hitId === presentedIdSv.value) runOnJS(dismissPresented)();
            else runOnJS(presentPlant)(hitId);
          } else {
            runOnJS(dismissPresented)();
          }
        } else if (!hitId) {
          // closed: tap an EMPTY slot to plant. Tapping a plant does nothing —
          // water is the can, moving is drag (the per-plant modal is gone).
          let best = -1;
          let bestD = HIT_R * HIT_R;
          for (let i = 0; i < slots.length; i++) {
            if (!slots[i]) continue; // retired shelf slot (gap in the id space)
            const dx = e.x - slots[i].x;
            const dy = e.y - slots[i].y;
            const d = dx * dx + dy * dy;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          if (best >= 0 && !potIdInSlot(best)) runOnJS(openSlotModal)(best);
        }
      });

    const pan = Gesture.Pan()
      .minDistance(24)
      .enabled(!anyModalOpen)
      .onBegin((e) => {
          if (anyModalOpen) return;
          // don't grab mid-glide (a present/dismiss is in flight)
          if (
            glideIdSv.value &&
            (Math.abs(glideDX.value) > 2 || Math.abs(glideDY.value) > 2)
          )
            return;
          const ps = pots.value;
          const grabR = phaseSv.value === "open" ? 125 : HIT_R; // presented plant is big
          for (const id in ps) {
            // OPEN: only the presented plant can be dragged (to the customer).
            if (phaseSv.value === "open" && id !== presentedIdSv.value) continue;
            const dx = e.x - ps[id].wx;
            const dy = e.y - ps[id].wy;
            if (dx * dx + dy * dy < grabR * grabR) {
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
              if (!slots[i]) continue; // retired shelf slot
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
              // wrong plant: it flies home from the customer; presentation over
              runOnJS(handleRefuse)(note);
              runOnJS(dismissPresented)();
            }
          } else {
            dragDX.value = withSpring(0, SPRING);
            dragDY.value = withSpring(0, SPRING);
          }
          dragId.value = null;
        });

    return Gesture.Race(tap, pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyModalOpen, slots]);

  const pipColor = patience > 0.5 ? "#4caf50" : patience > 0.25 ? "#ffb300" : "#e53935";
  const potBySlot: Record<number, string> = {};
  for (const id in pots.value) potBySlot[pots.value[id].slot] = id;
  const totalInv = Object.values(inventory).reduce((a, b) => a + b, 0);
  // presented plant draws on top of everything else
  const potIds = Object.keys(pots.value);
  const orderedIds =
    presentedId && potIds.includes(presentedId)
      ? [...potIds.filter((i) => i !== presentedId), presentedId]
      : potIds;
  const presentedPlant = presentedId ? pots.value[presentedId] : null;
  const spriteMood: CustomerMood =
    customer?.mood === "happy" ? "happy" : customer?.mood === "angry" ? "upset" : "neutral";

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <Canvas style={styles.fill}>
            <SkImage image={bg} x={0} y={0} width={W} height={H} fit="cover" />
            {/* zone shelves (furniture) — plants sit on their slots above */}
            {ZONES.map((zone) => {
              const placed = zoneShelves[zone.id];
              if (!placed) return null;
              const def = shelfById(placed.defId);
              const x = W * zone.cx - (def.width * SC) / 2;
              const baseY = H * zone.baseY;
              return <ShelfSprite key={zone.id} defId={placed.defId} x={x} baseY={baseY} sc={SC} />;
            })}
            {customer && (
              <CustomerSprite
                custId={customer.custId}
                mood={spriteMood}
                x={L.customerX}
                headY={L.customerHeadY}
              />
            )}
            <WateringCan x={W * CAN_POS.x} y={H * CAN_POS.y} held={canModeSv} />
            {orderedIds.map((id) => (
              <PotSprite
                key={id}
                id={id}
                pots={pots}
                clock={clock}
                dragId={dragId}
                dragDX={dragDX}
                dragDY={dragDY}
                dragScale={dragScale}
                presentedId={presentedIdSv}
                glideId={glideIdSv}
                glideDX={glideDX}
                glideDY={glideDY}
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
          {/* watering mode banner: unmistakable, so taps never surprise */}
          {canMode && (
            <View pointerEvents="none" style={[styles.wateringBanner, { top: H * 0.095 }]}>
              <Text style={styles.wateringText}>💧 Watering — tap plants, tap the can to put it away</Text>
            </View>
          )}
          {/* shelves panel toggle (closed only) */}
          {phase === "closed" && !daySummary && (
            <TouchableOpacity
              style={[styles.decorateBtn, { top: H * 0.11 }]}
              onPress={() => setShelfPanelOpen(true)}
            >
              <Text style={styles.supplierText}>🪑 Shelves</Text>
            </TouchableOpacity>
          )}
          {/* shelf hint toast (e.g. "Clear the shelf first!") */}
          {shelfHint && (
            <View pointerEvents="none" style={[styles.wateringBanner, { top: H * 0.095 }]}>
              <Text style={styles.wateringText}>{shelfHint}</Text>
            </View>
          )}
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
            if (!pid || pid === presentedId) return null;
            return (
              <View key={i} pointerEvents="none" style={[styles.marker, { left: s.x - 44, top: s.y + 46 }]}>
                <Text style={styles.markerText}>{speciesById(pots.value[pid].speciesId).name}</Text>
              </View>
            );
          })}

          {/* "!" attention markers */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid || pid === presentedId) return null;
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

          {/* water gauges (watering mode): every plant shows its level */}
          {canMode &&
            Object.values(pots.value).map((p) => (
              <View
                key={`gauge${p.id}`}
                pointerEvents="none"
                style={[styles.gauge, { left: p.wx + 42, top: p.wy - 36 }]}
              >
                <View style={[styles.gaugeFill, { height: Math.max(2, 66 * p.water) }]} />
              </View>
            ))}

          {/* presented plant: name + stage pill at the spot */}
          {presentedId && presentedPlant && (
            <View
              pointerEvents="none"
              style={[styles.presentPill, { left: W * PRESENT_POS.x - 60, top: H * PRESENT_POS.y + 62, width: 120 }]}
            >
              <Text style={styles.presentText}>
                {speciesById(presentedPlant.speciesId).name} • {STAGE_LABEL[presentedPlant.stage]}
              </Text>
            </View>
          )}

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
            <Pressable style={styles.backdrop} onPress={() => setSupplierOpen(false)}>
              <Pressable style={[styles.modal, { width: W * 0.6 }]} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>🌱 Supplier</Text>
                <Text style={styles.modalCoins}>🪙 {coins}</Text>
                <ScrollView style={{ maxHeight: H * 0.55 }}>
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
                <Text style={styles.sectionLabel}>Shelves (assign them in the 🪑 Shelves panel):</Text>
                {SHELF_DEFS.map((def) => {
                  const inStorage = shelfStorage.filter((d) => d === def.id).length;
                  return (
                    <View key={def.id} style={styles.row}>
                      <Text style={styles.rowName}>{def.name}</Text>
                      <Text style={styles.rowSub}>
                        {def.blurb} • 🪙{def.price}
                        {inStorage > 0 && ` • in storage ${inStorage}`}
                      </Text>
                      <TouchableOpacity
                        style={[styles.buyBtn, coins < def.price && styles.disabledBtn]}
                        onPress={() => buyShelf(def.id)}
                        disabled={coins < def.price}
                      >
                        <Text style={styles.buyText}>Buy</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                </ScrollView>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSupplierOpen(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
                {totalInv > 0 && (
                  <Text style={styles.hint}>Tap an empty shelf (+) to plant your purchases!</Text>
                )}
              </Pressable>
            </Pressable>
          )}

          {/* shelves panel: one shelf per light zone (an upgrade) */}
          {shelfPanelOpen && (
            <View style={styles.backdrop}>
              <View style={[styles.modal, { width: W * 0.72 }]}>
                <Text style={styles.modalTitle}>🪑 Shelves & Light Zones</Text>
                {ZONES.map((zone) => {
                  const placed = zoneShelves[zone.id];
                  const curName = placed ? shelfById(placed.defId).name : zone.starterName;
                  const curSlots = placed ? shelfById(placed.defId).slots.length : zone.starter.length;
                  const occupied = zoneHasPlants(zone.id);
                  const storageTypes = [...new Set(shelfStorage)];
                  return (
                    <View key={zone.id} style={styles.zoneBlock}>
                      <Text style={styles.rowName}>
                        {zone.name} · {zone.lightLabel}
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
                            onPress={() => assignShelfToZone(zone.id, defId)}
                          >
                            <Text style={styles.zoneBtnText}>Use {shelfById(defId).name}</Text>
                          </TouchableOpacity>
                        ))}
                        {placed && (
                          <TouchableOpacity
                            style={styles.zoneBtn}
                            onPress={() => removeShelfFromZone(zone.id)}
                          >
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
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShelfPanelOpen(false)}>
                  <Text style={styles.closeText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* slot modal: plant into an empty slot (tap a "+" while closed) */}
          {slotModal !== null && (
            <View style={styles.backdrop}>
              <View style={[styles.modal, { width: W * 0.6 }]}>
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

      {/* presented plant: water it right here on the counter (outside the
          GestureDetector so its taps never reach the scene Tap) */}
      {presentedId && presentedPlant && presentedPlant.water < 1 && (
        <TouchableOpacity
          style={[styles.waterBtn, { left: W * PRESENT_POS.x + 84, top: H * PRESENT_POS.y - 96 }]}
          onPress={waterPresented}
        >
          <Text style={styles.waterBtnText}>💧</Text>
        </TouchableOpacity>
      )}
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
  gauge: {
    position: "absolute",
    width: 10,
    height: 70,
    borderRadius: 5,
    backgroundColor: "rgba(0,0,0,0.30)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  gaugeFill: { width: 10, backgroundColor: "#4aa3e0" },
  presentPill: {
    position: "absolute",
    backgroundColor: "rgba(46,36,27,0.88)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  presentText: { fontSize: 12, fontWeight: "700", color: "#fff6e6" },
  waterBtn: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  waterBtnText: { fontSize: 22 },
  wateringBanner: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(58,130,190,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wateringText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  decorateBtn: {
    position: "absolute",
    left: 12,
    backgroundColor: "rgba(255,253,248,0.92)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  zoneBlock: {
    borderTopWidth: 1,
    borderTopColor: "#eee3d2",
    paddingVertical: 8,
  },
  zoneBtns: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  zoneBtn: {
    backgroundColor: "#7a9e7e",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
});
