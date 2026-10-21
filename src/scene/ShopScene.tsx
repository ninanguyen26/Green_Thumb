import { theme } from "../theme";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image, useWindowDimensions } from "react-native";
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
import { CustomerBubble, PresentedPill, PRESENT_POS } from "./OpenShop";
import { OpenShopButton, ClosedModals } from "./ClosedShop";
import { ShelfSprite } from "./ShelfSprite";
import {
  shelfById,
  ZONES,
  zoneById,
  zoneLight,
  type PlacedShelf,
} from "../data/shelves";
import { CUSTOMER_COUNT, type CustomerMood } from "./customerSprites";
import { ALBUM } from "../data/album";
import CoinIcon from "../../assets/icons/coin-icon.svg";
import XpIcon from "../../assets/icons/xp-icon.svg";
import SunIcon from "../../assets/icons/sun-icon.svg";
import MoonIcon from "../../assets/icons/half-moon-icon.svg";
import PauseIcon from "../../assets/icons/pause-icon.svg";
import ResumeIcon from "../../assets/icons/resume-icon.svg";
import ExitIcon from "../../assets/icons/exit-icon.svg";
import HomeIcon from "../../assets/icons/home-icon.svg";
import SettingsIcon from "../../assets/icons/settings-icon.svg";
import {
  SPECIES,
  speciesById,
  matchTraits,
  requestText,
  refuseText,
  randomSpeciesId,
  pick,
  POT_TIERS,
  STAGE_LABEL,
  WATER_DRAIN,
  WATER_MAX,
  WATER_PER_TAP,
  BAD_LIGHT_BADGE_S,
  BAD_LIGHT_DROOP_S,
  lightGap,
  stageSeconds,
  conditionFactor,
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
// Serve flow (open): tap a plant -> it presents at PRESENT_POS (OpenShop);
// drag it the short hop into the customer to serve. The watering can tool
// sits at CAN_POS.
const CAN_POS = { x: 0.925, y: 0.855 };
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

export function ShopScene({ active, onHome }: { active: boolean; onHome: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const L = layout(W, H);
  const bg = useImage(require("../../assets/background/background.png"));
  const bgNight = useImage(require("../../assets/background/background_night.png"));

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
        badLight: 0,
        pot: "nursery",
      };
    });
    return o;
  });
  const pots = useSharedValue(initialPots);

  const [coins, setCoins] = useState(100);
  const [hearts, setHearts] = useState(0); // earned from happy customers (stars), spent on Album unlocks
  const [albumOpen, setAlbumOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALBUM.filter((a) => a.playable).map((a) => [a.slug, true]))
  );
  const [phase, setPhase] = useState<"open" | "closed">("closed");
  const [day, setDay] = useState(1);
  const [servedCount, setServedCount] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [patience, setPatience] = useState(1);
  const [paused, setPaused] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);
  const pausedRef = useRef(false);
  const pausedSv = useSharedValue(false); // gesture handlers read this (always current)
  function setPausedBoth(v: boolean) {
    pausedRef.current = v;
    pausedSv.value = v;
    setPaused(v);
  }
  useEffect(() => {
    setPausedBoth(!active);
  }, [active]);

  function goHome() {
    setPausedBoth(true);
    onHome();
  }
  const [inventory, setInventory] = useState<Record<string, number>>({});
  // lifetime sales per species (the Album's sold stat; session-only for now)
  const [soldCounts, setSoldCounts] = useState<Record<string, number>>({});
  // Shop list (the notebook): staged plants, bought all at once. Lives in
  // scene state so it survives the Shop modal closing.
  const [cart, setCart] = useState<Record<string, number>>({});
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [slotModal, setSlotModal] = useState<number | null>(null);
  const [placePot, setPlacePot] = useState<PotTier>("nursery");
  const [daySummary, setDaySummary] = useState<null | { coins: number; happy: number; angry: number }>(null);
  const [, setTick] = useState(0);
  const [dragPid, setDragPid] = useState<string | null>(null); // mirrors dragId for slot light tinting

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
  const [shelfStorage, setShelfStorage] = useState<string[]>(["showcase-3"]); // one spare to learn with
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
  // The tend interval runs in an effect with no deps — it reads slots via this ref.
  const slotsRef = useRef(slots);
  slotsRef.current = slots;

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
    // no duplicates: a piece is owned once — in storage or placed (Ngoc's rule)
    if (shelfStorage.includes(defId)) return;
    if (Object.values(zoneShelves).some((s) => s?.defId === defId)) return;
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

  const pendingActions = useRef(new Set<{ remaining: number; fn: () => void }>());
  const custCount = useRef(0);
  const dayStats = useRef({ coins: 0, happy: 0, angry: 0 });
  const resolvedRef = useRef(false); // customer already served/timed out? blocks double-sale race
  // Delayed arrivals/departures keep their remaining time while paused or at home.
  useEffect(() => {
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const elapsed = now - previous;
      previous = now;
      if (pausedRef.current) return;
      const due: (() => void)[] = [];
      for (const action of pendingActions.current) {
        action.remaining -= elapsed;
        if (action.remaining <= 0) {
          pendingActions.current.delete(action);
          due.push(action.fn);
        }
      }
      due.forEach((fn) => fn());
    }, 50);
    return () => clearInterval(timer);
  }, []);
  function later(ms: number, fn: () => void) {
    pendingActions.current.add({ remaining: ms, fn });
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
    if (pausedRef.current) {
      later(1000, spawnCustomer); // paused: check again in a second
      return;
    }
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
    setPausedBoth(false);
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

  // Pause-menu exit: quit the shift (same as the old Close button).
  function exitShift() {
    setPausedBoth(false);
    closeShop();
  }

  function leaveAndNext() {
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
  }

  function handleTimeout() {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    customerSv.value = null; // close the serve gate immediately
    dayStats.current.angry += 1;
    setCustomer((c) => (c ? { ...c, mood: "angry", note: "Never mind, I'm leaving." } : c));
    // departure is scheduled by the resolved-customer effect below
  }

  function handleSale(plantId: string, stars: number, price: number) {
    if (resolvedRef.current) return; // this customer was already served (double-drop race)
    resolvedRef.current = true;
    customerSv.value = null; // close the serve gate NOW, not after the leave delay
    setCoins((c) => c + price);
    setHearts((h) => h + stars); // happiness pays hearts: 1/2/3 by stars
    dayStats.current.coins += price;
    dayStats.current.happy += 1;
    setCustomer((c) =>
      c
        ? { ...c, mood: "happy", note: stars === 3 ? "Perfect, thank you!" : "This'll do, thanks!" }
        : c
    );
    const soldSpecies = pots.value[plantId]?.speciesId;
    if (soldSpecies) setSoldCounts((m) => ({ ...m, [soldSpecies]: (m[soldSpecies] ?? 0) + 1 }));
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
    // departure is scheduled by the resolved-customer effect below
  }

  function handleRefuse(note: string) {
    setCustomer((c) => (c ? { ...c, note } : c));
    later(1500, () => {
      setCustomer((c) => (c && c.mood === "waiting" ? { ...c, note: null } : c));
    });
  }

  function handleWater(plantId: string) {
    const p = pots.value[plantId];
    if (!p) return;
    // +0.5 per watering (two taps from empty = full). Past 1 the plant is
    // waterlogged — it droops and growth pauses until the excess drains.
    const cap = WATER_MAX[speciesById(p.speciesId).water];
    const water = Math.min(cap, p.water + WATER_PER_TAP);
    if (water === p.water) return;
    pots.value = { ...pots.value, [plantId]: { ...p, water } };
    setTick((t) => t + 1);
  }

  function unlockSpecies(slug: string, cost: number) {
    if (unlocked[slug] || hearts < cost) return;
    setHearts((h) => h - cost);
    setUnlocked((u) => ({ ...u, [slug]: true }));
  }

  function buyPlant(speciesId: string) {
    const sp = speciesById(speciesId);
    if (coins < sp.buy) return;
    setCoins((c) => c - sp.buy);
    setInventory((inv) => ({ ...inv, [speciesId]: (inv[speciesId] ?? 0) + 1 }));
  }

  // The shop price pills stage plants onto the notebook list instead of
  // buying outright — nothing is spent until buyCart.
  function addToCart(speciesId: string) {
    setCart((c) => ({ ...c, [speciesId]: (c[speciesId] ?? 0) + 1 }));
  }

  function setCartQty(speciesId: string, qty: number) {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[speciesId];
      else next[speciesId] = qty;
      return next;
    });
  }

  function buyCart() {
    const entries = Object.entries(cart);
    const total = entries.reduce((s, [sid, q]) => s + speciesById(sid).buy * q, 0);
    if (entries.length === 0 || total > coins) return;
    setCoins((c) => c - total);
    setInventory((inv) => {
      const next = { ...inv };
      for (const [sid, q] of entries) next[sid] = (next[sid] ?? 0) + q;
      return next;
    });
    setCart({});
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
        badLight: 0,
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

  function bumpTick() {
    setTick((t) => t + 1);
  }

  // water drain + light-gated growth + bad-light tracking (runs in both phases)
  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef.current) return; // paused: no drain, no growth
      let changed = false;
      const next = { ...pots.value };
      for (const id in next) {
        const p = next[id];
        const sp = speciesById(p.speciesId);
        let { water, stage, growth, badLight } = p;
        // drain by water group: low 300s / med 180s / high 120s for a full meter
        water = Math.max(0, water - 1 / WATER_DRAIN[sp.water]);
        const waterlogged = water > 1;
        // light: zone level vs the species' tolerated band (mature plants exempt)
        const zoneId = slotsRef.current[p.slot]?.zone;
        const gap = lightGap(sp, zoneId ? zoneLight(zoneId) : 2);
        // bad light accrues only while CLOSED (the arranging phase) — frozen
        // while open, when the player can't move plants anyway
        if (phaseSv.value === "closed") {
          if (stage < 2 && gap >= 2) badLight += 1;
          else if (badLight > 0) badLight = Math.max(0, badLight - 2);
        }
        // growth: only when watered and not waterlogged; in range = full,
        // one tier out = half, two+ out = paused (the plant waits, no death)
        if (stage < 2 && water > 0 && !waterlogged) {
          const speed = gap === 0 ? 1 : gap === 1 ? 0.5 : 0;
          growth += speed / stageSeconds(sp);
          if (growth >= 1) {
            growth = 0;
            stage = (stage + 1) as 0 | 1 | 2;
          }
        }
        if (water !== p.water || stage !== p.stage || growth !== p.growth || badLight !== p.badLight) {
          next[id] = { ...p, water, stage, growth, badLight };
          changed = true;
        }
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
    if (!customer || customer.mood !== "waiting" || paused) return;
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
  }, [customer?.id, customer?.mood, paused]);

  // Departure, owned by the customer's resolved STATE rather than a
  // one-shot timer inside the sale/timeout handlers: a happy/angry customer
  // always has a leave timer armed, so a timer lost to a hot reload in the
  // 1.5s window can't leave her standing at the counter forever.
  useEffect(() => {
    if (!customer || customer.mood === "waiting" || paused) return;
    const t = setTimeout(() => leaveAndNext(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, customer?.mood, paused]);

  // Tap = water/manage (dedicated Tap gesture, reliable). Pan = drag to move/serve.
  // Modals render OUTSIDE the GestureDetector; this switch-off is belt-and-
  // braces so a stray scene tap can never water a plant behind an open modal.
  const anyModalOpen = supplierOpen || slotModal !== null || shelfPanelOpen || albumOpen;
  const gesture = useMemo(() => {
    const tap = Gesture.Tap()
      .maxDuration(500)
      .maxDistance(24)
      .enabled(!anyModalOpen)
      .onEnd((e) => {
        if (anyModalOpen || pausedSv.value) return;
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
            spawnBurst(parts, clock.value, e.x, e.y, theme.colors.water);
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
          if (best >= 0 && !potIdInSlot(pots.value, best)) runOnJS(openSlotModal)(best);
        }
      });

    const pan = Gesture.Pan()
      .minDistance(24)
      .enabled(!anyModalOpen)
      .onStart((e) => {
          // The grab is claimed HERE, at activation — not onBegin. onBegin
          // fires on every touch-down, so claiming there let plain taps set
          // dragId; when the tap then won the Race, the pan was cancelled
          // (onFinalize only, no onEnd) and dragId stayed stuck, silently
          // blocking presentPlant ("tap does nothing" until a drag's onEnd
          // happened to clear it).
          if (anyModalOpen || pausedSv.value) return;
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
              runOnJS(setDragPid)(id);
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
              const droop = p.water > 1 || p.badLight >= BAD_LIGHT_DROOP_S;
              const price = Math.round(
                sp.sell *
                  [0, 0.5, 0.75, 1][stars] *
                  [0.3, 0.6, 1][p.stage] *
                  (1 + POT_TIERS[p.pot].bonus) *
                  conditionFactor(p.stage, p.water, droop)
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
        })
        .onFinalize(() => {
          // A cancelled pan never runs onEnd — if it had claimed a drag,
          // release it here and spring the plant home, or dragId stays
          // stuck and blocks presentPlant. (After a normal onEnd, dragId
          // is already null and this is a no-op.)
          if (dragId.value) {
            dragDX.value = withSpring(0, SPRING);
            dragDY.value = withSpring(0, SPRING);
            dragScale.value = withSpring(1, SPRING);
            dragId.value = null;
          }
          runOnJS(setDragPid)(null);
        });

    return Gesture.Race(tap, pan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyModalOpen, slots]);

  const pipColor = patience > 0.5 ? theme.colors.success : patience > 0.25 ? theme.colors.warning : theme.colors.danger;
  const potBySlot: Record<number, string> = {};
  for (const id in pots.value) potBySlot[pots.value[id].slot] = id;
  const totalInv = Object.values(inventory).reduce((a, b) => a + b, 0);
  // Owned per species (Album rows): unplaced inventory + plants on shelves.
  const ownedCounts: Record<string, number> = { ...inventory };
  for (const pot of Object.values(pots.value)) {
    ownedCounts[pot.speciesId] = (ownedCounts[pot.speciesId] ?? 0) + 1;
  }
  // presented plant draws on top of everything else
  const potIds = Object.keys(pots.value);
  const orderedIds =
    presentedId && potIds.includes(presentedId)
      ? [...potIds.filter((i) => i !== presentedId), presentedId]
      : potIds;
  const presentedPlant = presentedId ? pots.value[presentedId] : null;
  // While dragging in closed phase, slot markers tint by light match for the
  // dragged species: green = in range, amber = one tier out, red = far out.
  const dragSp = dragPid && pots.value[dragPid] ? speciesById(pots.value[dragPid].speciesId) : null;
  const GAP_TINT = [theme.colors.success, theme.colors.warning, theme.colors.danger];
  const spriteMood: CustomerMood =
    customer?.mood === "happy" ? "happy" : customer?.mood === "angry" ? "upset" : "neutral";

  if (!active) return null;

  return (
    <View style={styles.fill}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>
          <Canvas style={styles.fill}>
            <SkImage image={phase === "open" ? bg : bgNight} x={0} y={0} width={W} height={H} fit="cover" />
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
          <CustomerBubble W={W} H={H} customer={customer} patience={patience} pipColor={pipColor} />

          {/* top bar: phase controls (left), day (center), coins (right) */}
          {/* top bar, center: coin pill + heart pill */}
          <View pointerEvents="none" style={[styles.topBar, { top: H * 0.03 }]}>
            <View style={styles.coins}>
              <CoinIcon width={20} height={20} />
              <Text style={styles.coinText}> {coins}</Text>
            </View>
            <View style={styles.coins}>
              <XpIcon width={20} height={20} />
              <Text style={styles.coinText}> {hearts}</Text>
            </View>
          </View>
          {/* watering mode banner: unmistakable, so taps never surprise */}
          {canMode && (
            <View pointerEvents="none" style={[styles.wateringBanner, { top: H * 0.095 }]}>
              <Text style={styles.wateringText}>💧 Watering — tap plants, tap the can to put it away</Text>
            </View>
          )}
          {/* bottom-left menu: 3 columns of icon buttons (Ngoc's icon art) */}
          <View style={[styles.menuRow, { bottom: H * 0.01 }]}>
            {phase === "closed" && !daySummary && (
              <TouchableOpacity style={styles.menuBtn} onPress={() => setSupplierOpen(true)}>
                <Image source={require("../../assets/icons/shopping-icon.png")} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Shop{totalInv > 0 ? ` (${totalInv})` : ""}</Text>
              </TouchableOpacity>
            )}
            {phase === "closed" && !daySummary && (
              <TouchableOpacity style={styles.menuBtn} onPress={() => setShelfPanelOpen(true)}>
                <Image source={require("../../assets/icons/interior-design-icon.png")} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Design</Text>
              </TouchableOpacity>
            )}
            {phase === "closed" && !daySummary && (
              <TouchableOpacity style={styles.menuBtn} onPress={() => setAlbumOpen(true)}>
                <Image source={require("../../assets/icons/album-icon.png")} style={styles.menuIcon} />
                <Text style={styles.menuLabel}>Album</Text>
              </TouchableOpacity>
            )}
          </View>
          {/* top bar, left: customer pill (open only) + day pill */}
          <View pointerEvents="none" style={[styles.leftBar, { top: H * 0.03 }]}>
            <View style={styles.dayPill}>
              {phase === "open" ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
              <Text style={styles.dayText}>
                Day {day} • {phase === "open" ? "Open" : "Closed"}
              </Text>
            </View>
            {phase === "open" && (
              <View style={styles.customerPill}>
                <Image source={require("../../assets/icons/happy-face-icon.png")} style={styles.customerIcon} />
                <Text style={styles.coinText}>{servedCount}/{CUSTOMERS_PER_DAY}</Text>
              </View>
            )}
          </View>
          {/* open-phase top-right: pause button. Paused: it becomes resume,
              with exit / home / settings appearing to its left. */}
          {phase === "open" && (
            <View style={[styles.pauseRow, { top: H * 0.03 }]}>
              {paused && (
                <>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => setExitConfirm(true)}>
                    <ExitIcon width={28} height={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={goHome} accessibilityRole="button" accessibilityLabel="Home">
                    <HomeIcon width={28} height={28} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn}>
                    <SettingsIcon width={28} height={28} />
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.iconBtn} onPress={() => setPausedBoth(!paused)}>
                {paused ? <ResumeIcon width={28} height={28} /> : <PauseIcon width={28} height={28} />}
              </TouchableOpacity>
            </View>
          )}
          {phase === "closed" && (
            <View style={[styles.pauseRow, { top: H * 0.03 }]}>
              <TouchableOpacity style={styles.iconBtn} onPress={goHome} accessibilityRole="button" accessibilityLabel="Home">
                <HomeIcon width={28} height={28} />
              </TouchableOpacity>
            </View>
          )}
          {/* shelf hint toast (e.g. "Clear the shelf first!") */}
          {shelfHint && (
            <View pointerEvents="none" style={[styles.wateringBanner, { top: H * 0.095 }]}>
              <Text style={styles.wateringText}>{shelfHint}</Text>
            </View>
          )}

          {/* open-shop button (closed phase) */}
          <OpenShopButton show={phase === "closed" && !daySummary} onOpen={openShop} top={H * 0.12} />

          {/* shelf name markers */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid || pid === presentedId) return null;
            const tint =
              phase === "closed" && dragSp && pid !== dragPid
                ? GAP_TINT[lightGap(dragSp, zoneLight(s.zone))]
                : null;
            return (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  styles.marker,
                  { left: s.x - 44, top: s.y + 46 },
                  tint ? { borderWidth: 2, borderColor: tint } : null,
                ]}
              >
                <Text style={styles.markerText}>{speciesById(pots.value[pid].speciesId).name}</Text>
              </View>
            );
          })}

          {/* "!" attention markers: blue = thirsty, dark-blue = waterlogged */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid || pid === presentedId) return null;
            const w = pots.value[pid]?.water ?? 1;
            const thirsty = w < 0.35;
            const waterlogged = w > 1;
            if (!thirsty && !waterlogged) return null;
            return (
              <View
                key={`alert${i}`}
                pointerEvents="none"
                style={[
                  styles.alert,
                  { left: s.x + 31, top: s.y + 33 },
                  waterlogged && { backgroundColor: theme.colors.waterlogged },
                ]}
              >
                <Text style={styles.alertText}>!</Text>
              </View>
            );
          })}

          {/* amber sun badge + hint: growing plant stuck in far-bad light (60s+, closed-phase time) */}
          {slots.map((s, i) => {
            const pid = potBySlot[i];
            if (!pid || pid === presentedId) return null;
            const p = pots.value[pid];
            if (!p || p.stage >= 2 || p.badLight < BAD_LIGHT_BADGE_S) return null;
            const sp = speciesById(p.speciesId);
            const lvl = zoneLight(s.zone);
            const hint = lvl < sp.lightMin ? "needs more light" : "too much sun";
            return (
              <Fragment key={`sun${i}`}>
                <View pointerEvents="none" style={[styles.sunBadge, { left: s.x - 43, top: s.y - 178 }]}>
                  <Text style={styles.sunBadgeText}>☀</Text>
                </View>
                <View pointerEvents="none" style={[styles.lightHint, { left: s.x - 55, top: s.y + 68 }]}>
                  <Text style={styles.lightHintText}>{hint}</Text>
                </View>
              </Fragment>
            );
          })}

          {/* water gauges (watering mode): every plant shows its level */}
          {canMode &&
            Object.values(pots.value).map((p) => (
              <View
                key={`gauge${p.id}`}
                pointerEvents="none"
                style={[styles.gauge, { left: p.wx + 42, top: p.wy - 36 }]}
              >
                <View
                  style={[
                    styles.gaugeFill,
                    { height: Math.max(2, 66 * Math.min(p.water, 1)) },
                    p.water > 1 ? { backgroundColor: theme.colors.waterlogged } : null,
                  ]}
                />
              </View>
            ))}

          {/* presented plant: name + stage pill at the spot */}
          <PresentedPill W={W} H={H} presentedPlant={presentedPlant} />

          {/* empty-slot "+" markers (closed phase): tap to plant from inventory */}
          {phase === "closed" &&
            slots.map((s, i) => {
              if (potBySlot[i]) return null;
              const tint = dragSp ? GAP_TINT[lightGap(dragSp, zoneLight(s.zone))] : null;
              return (
                <View
                  key={`empty${i}`}
                  pointerEvents="none"
                  style={[
                    styles.emptySlot,
                    { left: s.x - 24, top: s.y - 24 },
                    tint ? { borderColor: tint, backgroundColor: tint + "33" } : null,
                  ]}
                >
                  <Text style={styles.emptyText}>+</Text>
                </View>
              );
            })}

        </View>
      </GestureDetector>

      {/* modals live OUTSIDE the GestureDetector — inside it, the scene's Pan
          handler swallows drags, so a modal ScrollView can never scroll */}

      <ClosedModals
        W={W}
        H={H}
        supplierOpen={supplierOpen}
        onCloseSupplier={() => setSupplierOpen(false)}
        inventory={inventory}
        coins={coins}
        totalInv={totalInv}
        onBuyPlant={buyPlant}
        cart={cart}
        onAddToCart={addToCart}
        onSetCartQty={setCartQty}
        onBuyCart={buyCart}
        shelfPanelOpen={shelfPanelOpen}
        onCloseDesign={() => setShelfPanelOpen(false)}
        zoneShelves={zoneShelves}
        shelfStorage={shelfStorage}
        onAssignShelf={assignShelfToZone}
        onRemoveShelf={removeShelfFromZone}
        onBuyShelf={buyShelf}
        slotModal={slotModal}
        onCloseSlot={() => setSlotModal(null)}
        placePot={placePot}
        onSelectPot={setPlacePot}
        onPlacePlant={placePlant}
        albumOpen={albumOpen}
        onCloseAlbum={() => setAlbumOpen(false)}
        unlocked={unlocked}
        hearts={hearts}
        onUnlock={unlockSpecies}
        owned={ownedCounts}
        sold={soldCounts}
        daySummary={daySummary}
        onCloseSummary={() => setDaySummary(null)}
        day={day}
      />

      {/* exit confirm card: rendered LAST so it stacks above the plant
          name markers (they sit over anything earlier in the tree) */}
      {exitConfirm && phase === "open" && (
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmCard, { width: W * 0.52 }]}>
            <Text style={styles.confirmTitle}>End today's shift?</Text>
            <Text style={styles.confirmText}>
              The current customer will leave, and the day ends now. You'll get today's summary and move on to the next day.
            </Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={styles.confirmGhost}
                onPress={() => {
                  setExitConfirm(false);
                  setPausedBoth(false);
                }}
              >
                <Text style={styles.confirmGhostText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPrimary}
                onPress={() => {
                  setExitConfirm(false);
                  exitShift();
                }}
              >
                <Text style={styles.confirmPrimaryText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { position: "absolute", alignSelf: "center", flexDirection: "row", gap: 8 },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    paddingHorizontal: 12,
    height: 27,
  },
  dayText: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text },
  coins: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    paddingHorizontal: 12,
    height: 27,
  },
  coinText: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.text },
  supplierBtn: {
    position: "absolute",
    left: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  supplierText: { fontSize: 14, fontFamily: "Cause_700Bold", color: theme.colors.text },
  marker: {
    position: "absolute",
    width: 88,
    backgroundColor: theme.colors.labelSurface,
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  markerText: { fontSize: 10, color: theme.colors.textInverse, fontFamily: "Cause_600SemiBold", textAlign: "center" },
  alert: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.water,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  alertText: { fontSize: 16, fontFamily: "Cause_700Bold", color: theme.colors.text },
  sunBadge: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sunBadgeText: { fontSize: 14, fontFamily: "Cause_400Regular", color: theme.colors.onWarning },
  lightHint: {
    position: "absolute",
    width: 110,
    backgroundColor: theme.colors.warningSurface,
    borderRadius: 6,
    paddingVertical: 2,
    alignItems: "center",
  },
  lightHintText: { fontSize: 10, color: theme.colors.onWarning, fontFamily: "Cause_700Bold", textAlign: "center" },
  emptySlot: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.colors.emptyOutline,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 26, fontFamily: "Cause_700Bold", color: theme.colors.emptyText },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  slotCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  slotCellCur: { backgroundColor: theme.colors.selected },
  gauge: {
    position: "absolute",
    width: 10,
    height: 70,
    borderRadius: 5,
    backgroundColor: theme.colors.gaugeTrack,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  gaugeFill: { width: 10, backgroundColor: theme.colors.water },
  wateringBanner: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: theme.colors.utilitySurface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  wateringText: { fontSize: 13, fontFamily: "Cause_700Bold", color: theme.colors.onUtility },
  decorateBtn: {
    position: "absolute",
    left: 12,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  leftBar: { position: "absolute", left: 45, flexDirection: "row", alignItems: "center", gap: 8 },
  customerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    paddingHorizontal: 12,
    height: 27,
  },
  customerIcon: { width: 20, height: 20 },
  pauseRow: { position: "absolute", right: 45, flexDirection: "row", alignItems: "center", gap: 8 },
  // No background/border: Ngoc's SVGs are drawn as complete buttons.
  iconBtn: { height: 28, width: 36, alignItems: "center", justifyContent: "center" },
  confirmBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.backdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.outline,
    paddingHorizontal: 22,
    paddingVertical: 18,
    alignItems: "center",
  },
  confirmTitle: { fontSize: 20, fontFamily: "Cause_700Bold", color: theme.colors.text, marginBottom: 8 },
  confirmText: { fontSize: 14, color: theme.colors.text, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  confirmRow: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  confirmGhost: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmGhostText: { fontSize: 15, fontFamily: "Cause_700Bold", color: theme.colors.onPrimary },
  confirmPrimary: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.reward,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmPrimaryText: { fontSize: 15, fontFamily: "Cause_700Bold", color: theme.colors.text },
  menuRow: { position: "absolute", left: 50, flexDirection: "row", gap: 10 },
  menuBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    paddingVertical: 2,
  },
  menuIcon: { width: 30, height: 30 },
  menuLabel: { fontSize: 10, fontFamily: "Cause_700Bold", color: theme.colors.text, marginTop: 0.5 },
});
