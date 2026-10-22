// Album catalog: 44 entries — every entry has sprite art and is playable.
// Built from plant-database.json: the approved Sill species (Ngoc,
// 2026-10-20) plus 15 cultivars/extra species from the 2026-10-22
// dual-site audit (The Sill + Costa Farms). The 12 database species with
// no sprite folder were removed from the catalog 2026-10-22 (Ngoc's call:
// no sprites, no entry). The Album is the collection
// layer: entries unlock by spending hearts earned from happy customers;
// unlocking is NOT owning — playable species still cost coins in the Shop.
// `playable` maps to a plants.ts id for species the Shop stocks today.
// growth/traits/buy/sell come from the database; for playable species the
// prices are plants.ts's real ones (the DB's sell = 2x buy rule differs
// for monstera 35 and snake 25).

export interface AlbumEntry {
  slug: string; // database id (scientific slug)
  name: string;
  scientific: string;
  lightMin: number;
  lightMax: number;
  water: "low" | "medium" | "high";
  hearts: number; // unlock cost (shop species start unlocked)
  growth: "fast" | "mid" | "slow";
  traits: string[];
  buy: number;
  sell: number;
  playable: string | null;
}

export const ALBUM: AlbumEntry[] = [
  { slug: "acanthocereus-tetragonus", name: "Fairy Castle Cactus", scientific: "Acanthocereus tetragonus", lightMin: 3, lightMax: 4, water: "low", hearts: 10, growth: "slow", traits: ["petSafe", "easyCare", "brightLight"], buy: 12, sell: 24, playable: "fairy-castle-cactus" },
  { slug: "aglaonema-commutatum", name: "Chinese Evergreen", scientific: "Aglaonema commutatum", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "slow", traits: ["easyCare", "lowLight"], buy: 14, sell: 28, playable: "chinese-evergreen" },
  { slug: "anthurium-andraeanum", name: "Anthurium", scientific: "Anthurium andraeanum", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["easyCare", "lowLight"], buy: 18, sell: 36, playable: "anthurium" },
  { slug: "araucaria-heterophylla", name: "Norfolk Island Pine", scientific: "Araucaria heterophylla", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "slow", traits: ["easyCare", "lowLight"], buy: 20, sell: 40, playable: "norfolk-island-pine" },
  { slug: "aspidistra-elatior", name: "Cast Iron Plant", scientific: "Aspidistra elatior", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "slow", traits: ["petSafe", "lowLight"], buy: 16, sell: 32, playable: "cast-iron-plant" },
  { slug: "asplenium-nidus", name: "Bird's Nest Fern", scientific: "Asplenium nidus", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["petSafe", "easyCare", "lowLight"], buy: 14, sell: 28, playable: "birds-nest-fern" },
  { slug: "beaucarnea-recurvata", name: "Ponytail Palm", scientific: "Beaucarnea recurvata", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, growth: "slow", traits: ["petSafe", "easyCare", "brightLight"], buy: 22, sell: 44, playable: "ponytail-palm" },
  { slug: "chlorophytum-comosum", name: "Spider Plant", scientific: "Chlorophytum comosum", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, growth: "fast", traits: ["petSafe", "easyCare", "lowLight"], buy: 10, sell: 20, playable: "spider-plant" },
  { slug: "codiaeum-variegatum", name: "Croton", scientific: "Codiaeum variegatum", lightMin: 3, lightMax: 4, water: "high", hearts: 10, growth: "mid", traits: ["brightLight"], buy: 14, sell: 28, playable: "croton" },
  { slug: "coffea-arabica", name: "Coffee Plant", scientific: "Coffea arabica", lightMin: 3, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["brightLight"], buy: 14, sell: 28, playable: "coffee-plant" },
  { slug: "curio-rowleyanus", name: "String of Pearls", scientific: "Curio rowleyanus", lightMin: 3, lightMax: 3, water: "medium", hearts: 5, growth: "mid", traits: ["brightLight"], buy: 12, sell: 24, playable: "string-of-pearls" },
  { slug: "echeveria-elegans", name: "Echeveria", scientific: "Echeveria elegans", lightMin: 3, lightMax: 4, water: "low", hearts: 5, growth: "slow", traits: ["petSafe", "brightLight"], buy: 9, sell: 18, playable: "echeveria" },
  { slug: "epipremnum-aureum", name: "Golden Pothos", scientific: "Epipremnum aureum", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, growth: "fast", traits: ["easyCare", "lowLight"], buy: 10, sell: 20, playable: "pothos" },
  { slug: "epipremnum-aureum-manjula", name: "Manjula Pothos", scientific: "Epipremnum aureum 'Manjula'", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "slow", traits: ["easyCare", "lowLight"], buy: 14, sell: 28, playable: "pothos-manjula" },
  { slug: "epipremnum-aureum-marble-queen", name: "Marble Queen Pothos", scientific: "Epipremnum aureum 'Marble Queen'", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare", "lowLight"], buy: 13, sell: 26, playable: "marble-queen-pothos" },
  { slug: "epipremnum-aureum-neon", name: "Neon Pothos", scientific: "Epipremnum aureum 'Neon'", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, growth: "fast", traits: ["easyCare", "lowLight"], buy: 12, sell: 24, playable: "pothos-neon" },
  { slug: "epipremnum-aureum-njoy", name: "N'Joy Pothos", scientific: "Epipremnum aureum 'N'Joy'", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["easyCare", "lowLight"], buy: 15, sell: 30, playable: "pothos-njoy" },
  { slug: "epipremnum-pinnatum-cebu-blue", name: "Cebu Blue Pothos", scientific: "Epipremnum pinnatum 'Cebu Blue'", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare", "lowLight"], buy: 16, sell: 32, playable: "pothos-cebu-blue" },
  { slug: "euphorbia-trigona", name: "African Milk Tree", scientific: "Euphorbia trigona", lightMin: 3, lightMax: 4, water: "low", hearts: 10, growth: "fast", traits: ["brightLight"], buy: 14, sell: 28, playable: "african-milk-tree" },
  { slug: "ficus-elastica", name: "Rubber Plant", scientific: "Ficus elastica", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "mid", traits: ["easyCare", "lowLight"], buy: 20, sell: 40, playable: "rubber-plant" },
  { slug: "ficus-lyrata", name: "Fiddle Leaf Fig", scientific: "Ficus lyrata", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, growth: "slow", traits: ["brightLight"], buy: 24, sell: 48, playable: "fiddle-leaf-fig" },
  { slug: "hypoestes-phyllostachya", name: "Polka Dot Plant", scientific: "Hypoestes phyllostachya", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, growth: "fast", traits: ["petSafe", "lowLight"], buy: 9, sell: 18, playable: "polka-dot-plant" },
  { slug: "monstera-adansonii", name: "Monstera Adansonii", scientific: "Monstera adansonii", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare", "lowLight"], buy: 14, sell: 28, playable: "monstera-adansonii" },
  { slug: "monstera-deliciosa", name: "Monstera", scientific: "Monstera deliciosa", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare"], buy: 18, sell: 35, playable: "monstera" },
  { slug: "monstera-karstenianum", name: "Monstera Peru", scientific: "Monstera karstenianum", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "mid", traits: ["easyCare"], buy: 20, sell: 40, playable: "monstera-peru" },
  { slug: "nephrolepis-exaltata", name: "Boston Fern", scientific: "Nephrolepis exaltata", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["petSafe", "lowLight"], buy: 14, sell: 28, playable: "fern" },
  { slug: "olea-europaea", name: "Olive Tree", scientific: "Olea europaea", lightMin: 3, lightMax: 4, water: "high", hearts: 20, growth: "slow", traits: ["petSafe", "easyCare", "brightLight"], buy: 26, sell: 52, playable: "olive-tree" },
  { slug: "pachira-aquatica", name: "Money Tree", scientific: "Pachira aquatica", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "fast", traits: ["petSafe", "easyCare", "lowLight"], buy: 20, sell: 40, playable: "money-tree" },
  { slug: "philodendron-billietiae", name: "Philodendron Billietiae", scientific: "Philodendron billietiae", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "slow", traits: [], buy: 24, sell: 48, playable: "philodendron-billietiae" },
  { slug: "philodendron-birkin", name: "Philodendron Birkin", scientific: "Philodendron 'Birkin'", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "slow", traits: ["easyCare"], buy: 14, sell: 28, playable: "philodendron-birkin" },
  { slug: "philodendron-florida-ghost", name: "Philodendron Florida Ghost", scientific: "Philodendron 'Florida Ghost'", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "slow", traits: ["easyCare"], buy: 26, sell: 52, playable: "philodendron-florida-ghost" },
  { slug: "philodendron-golden-crocodile", name: "Philodendron Golden Crocodile", scientific: "Philodendron 'Golden Crocodile'", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "mid", traits: ["easyCare"], buy: 22, sell: 44, playable: "philodendron-golden-crocodile" },
  { slug: "philodendron-hederaceum", name: "Heartleaf Philodendron", scientific: "Philodendron hederaceum", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, growth: "fast", traits: ["easyCare", "lowLight"], buy: 11, sell: 22, playable: "heartleaf-philodendron" },
  { slug: "philodendron-hederaceum-brasil", name: "Philodendron Brasil", scientific: "Philodendron hederaceum 'Brasil'", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare", "lowLight"], buy: 14, sell: 28, playable: "philodendron-brasil" },
  { slug: "philodendron-hederaceum-micans", name: "Philodendron Micans", scientific: "Philodendron hederaceum var. micans", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, growth: "fast", traits: ["easyCare", "lowLight"], buy: 15, sell: 30, playable: "philodendron-micans" },
  { slug: "philodendron-ring-of-fire", name: "Philodendron Ring of Fire", scientific: "Philodendron 'Ring of Fire'", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, growth: "slow", traits: ["easyCare"], buy: 24, sell: 48, playable: "philodendron-ring-of-fire" },
  { slug: "pilea-peperomioides", name: "Pilea", scientific: "Pilea peperomioides", lightMin: 2, lightMax: 4, water: "medium", hearts: 10, growth: "fast", traits: ["petSafe", "easyCare"], buy: 15, sell: 30, playable: "pilea" },
  { slug: "platycerium-bifurcatum", name: "Staghorn Fern", scientific: "Platycerium bifurcatum", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "slow", traits: ["petSafe", "lowLight"], buy: 18, sell: 36, playable: "staghorn-fern" },
  { slug: "sansevieria-trifasciata", name: "Snake Plant", scientific: "Sansevieria trifasciata", lightMin: 1, lightMax: 4, water: "low", hearts: 10, growth: "slow", traits: ["easyCare", "lowLight"], buy: 13, sell: 25, playable: "snake" },
  { slug: "schlumbergera-truncata", name: "Christmas Cactus", scientific: "Schlumbergera truncata", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, growth: "mid", traits: ["petSafe", "easyCare", "lowLight"], buy: 11, sell: 22, playable: "christmas-cactus" },
  { slug: "spathiphyllum-wallisii", name: "Peace Lily", scientific: "Spathiphyllum wallisii", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["lowLight"], buy: 13, sell: 26, playable: "peace-lily" },
  { slug: "strelitzia-nicolai", name: "Bird of Paradise", scientific: "Strelitzia nicolai", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, growth: "mid", traits: ["brightLight"], buy: 24, sell: 48, playable: "bird-of-paradise" },
  { slug: "stromanthe-thalia", name: "Stromanthe Triostar", scientific: "Stromanthe thalia", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, growth: "mid", traits: ["petSafe", "easyCare", "lowLight"], buy: 16, sell: 32, playable: "stromanthe" },
  { slug: "zamioculcas-zamiifolia", name: "ZZ Plant", scientific: "Zamioculcas zamiifolia", lightMin: 1, lightMax: 3, water: "low", hearts: 10, growth: "slow", traits: ["easyCare", "lowLight"], buy: 15, sell: 30, playable: "zz-plant" },
];

export function albumBySlug(slug: string): AlbumEntry | undefined {
  return ALBUM.find((a) => a.slug === slug);
}
