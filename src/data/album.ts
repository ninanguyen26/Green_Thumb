// Album catalog: the 41 approved species (plant-database.json, The Sill
// cross-check, approved by Ngoc 2026-10-20). The Album is the collection
// layer: entries unlock by spending hearts earned from happy customers;
// unlocking is NOT owning — playable species still cost coins in the Shop.
// `playable` maps to a plants.ts id for species the Shop stocks today.

export interface AlbumEntry {
  slug: string; // database id (scientific slug)
  name: string;
  scientific: string;
  lightMin: number;
  lightMax: number;
  water: "low" | "medium" | "high";
  hearts: number; // unlock cost (shop species start unlocked)
  playable: string | null;
}

export const ALBUM: AlbumEntry[] = [
  { slug: "aglaonema-commutatum", name: "Chinese Evergreen", scientific: "Aglaonema commutatum", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "anthurium-andraeanum", name: "Anthurium", scientific: "Anthurium andraeanum", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "araucaria-heterophylla", name: "Norfolk Island Pine", scientific: "Araucaria heterophylla", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, playable: null },
  { slug: "aspidistra-elatior", name: "Cast Iron Plant", scientific: "Aspidistra elatior", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "asplenium-nidus", name: "Bird's Nest Fern", scientific: "Asplenium nidus", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "beaucarnea-recurvata", name: "Ponytail Palm", scientific: "Beaucarnea recurvata", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, playable: null },
  { slug: "chamaedorea-elegans", name: "Parlor Palm", scientific: "Chamaedorea elegans", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "chlorophytum-comosum", name: "Spider Plant", scientific: "Chlorophytum comosum", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "codiaeum-variegatum", name: "Croton", scientific: "Codiaeum variegatum", lightMin: 3, lightMax: 4, water: "high", hearts: 10, playable: null },
  { slug: "coffea-arabica", name: "Coffee Plant", scientific: "Coffea arabica", lightMin: 3, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "cordyline-fruticosa", name: "Ti Plant", scientific: "Cordyline fruticosa", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "crassula-ovata", name: "Jade Plant", scientific: "Crassula ovata", lightMin: 3, lightMax: 4, water: "low", hearts: 5, playable: null },
  { slug: "curio-rowleyanus", name: "String of Pearls", scientific: "Curio rowleyanus", lightMin: 3, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "dracaena-fragrans", name: "Corn Plant", scientific: "Dracaena fragrans", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "dracaena-reflexa", name: "Dragon Tree", scientific: "Dracaena reflexa", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "echeveria-elegans", name: "Echeveria", scientific: "Echeveria elegans", lightMin: 3, lightMax: 4, water: "low", hearts: 5, playable: null },
  { slug: "epipremnum-aureum", name: "Golden Pothos", scientific: "Epipremnum aureum", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, playable: "pothos" },
  { slug: "euphorbia-trigona", name: "African Milk Tree", scientific: "Euphorbia trigona", lightMin: 3, lightMax: 4, water: "low", hearts: 10, playable: null },
  { slug: "ficus-elastica", name: "Rubber Plant", scientific: "Ficus elastica", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, playable: null },
  { slug: "ficus-lyrata", name: "Fiddle Leaf Fig", scientific: "Ficus lyrata", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, playable: null },
  { slug: "goeppertia-insignis", name: "Rattlesnake Plant", scientific: "Goeppertia insignis", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "guzmania-lingulata", name: "Bromeliad", scientific: "Guzmania lingulata", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "howea-forsteriana", name: "Kentia Palm", scientific: "Howea forsteriana", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, playable: null },
  { slug: "hoya-carnosa", name: "Hoya", scientific: "Hoya carnosa", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "hypoestes-phyllostachya", name: "Polka Dot Plant", scientific: "Hypoestes phyllostachya", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "maranta-leuconeura", name: "Prayer Plant", scientific: "Maranta leuconeura", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "monstera-deliciosa", name: "Monstera", scientific: "Monstera deliciosa", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: "monstera" },
  { slug: "nephrolepis-exaltata", name: "Boston Fern", scientific: "Nephrolepis exaltata", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: "fern" },
  { slug: "olea-europaea", name: "Olive Tree", scientific: "Olea europaea", lightMin: 3, lightMax: 4, water: "high", hearts: 20, playable: null },
  { slug: "pachira-aquatica", name: "Money Tree", scientific: "Pachira aquatica", lightMin: 2, lightMax: 3, water: "medium", hearts: 20, playable: null },
  { slug: "peperomia-obtusifolia", name: "Baby Rubber Plant", scientific: "Peperomia obtusifolia", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "philodendron-erubescens", name: "Blushing Philodendron", scientific: "Philodendron erubescens", lightMin: 2, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "philodendron-hederaceum", name: "Heartleaf Philodendron", scientific: "Philodendron hederaceum", lightMin: 1, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "pilea-peperomioides", name: "Pilea", scientific: "Pilea peperomioides", lightMin: 2, lightMax: 4, water: "medium", hearts: 10, playable: "pilea" },
  { slug: "platycerium-bifurcatum", name: "Staghorn Fern", scientific: "Platycerium bifurcatum", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "sansevieria-trifasciata", name: "Snake Plant", scientific: "Sansevieria trifasciata", lightMin: 1, lightMax: 4, water: "low", hearts: 10, playable: "snake" },
  { slug: "schlumbergera-truncata", name: "Christmas Cactus", scientific: "Schlumbergera truncata", lightMin: 2, lightMax: 3, water: "medium", hearts: 5, playable: null },
  { slug: "spathiphyllum-wallisii", name: "Peace Lily", scientific: "Spathiphyllum wallisii", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "strelitzia-nicolai", name: "Bird of Paradise", scientific: "Strelitzia nicolai", lightMin: 3, lightMax: 4, water: "medium", hearts: 20, playable: null },
  { slug: "stromanthe-thalia", name: "Stromanthe Triostar", scientific: "Stromanthe thalia", lightMin: 1, lightMax: 3, water: "medium", hearts: 10, playable: null },
  { slug: "zamioculcas-zamiifolia", name: "ZZ Plant", scientific: "Zamioculcas zamiifolia", lightMin: 1, lightMax: 3, water: "low", hearts: 10, playable: null },
];

export function albumBySlug(slug: string): AlbumEntry | undefined {
  return ALBUM.find((a) => a.slug === slug);
}
