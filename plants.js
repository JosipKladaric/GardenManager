// ============================================================
//  PLANT DATABASE
//  Each plant has: spacing (cm), companions, antagonists,
//  growth stages (day offsets), yield score, color, icon.
// ============================================================

const PLANTS = [
  {
    id: "tomato",
    name: "Tomato",
    icon: "🍅",
    color: "#e74c3c",
    spacing: 60,         // cm between plants (radius used for heatmap)
    sunlight: "full",    // full | partial | shade
    water: "medium",     // low | medium | high
    daysToMaturity: 75,
    season: ["spring","summer"],
    companions: ["basil","carrot","parsley","marigold","garlic"],
    antagonists: ["fennel","brassica","pepper","potato"],
    yieldScore: 9,
    pollinatorAttraction: 6,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.12, emoji: "🌱" },
      { day: 21,  label: "Seedling",  scale: 0.25, emoji: "🌿" },
      { day: 42,  label: "Vegetative",scale: 0.55, emoji: "🌿" },
      { day: 55,  label: "Flowering", scale: 0.75, emoji: "🌸" },
      { day: 65,  label: "Fruiting",  scale: 0.90, emoji: "🍅" },
      { day: 75,  label: "Harvest",   scale: 1.00, emoji: "🍅" },
      { day: 120, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "basil",
    name: "Basil",
    icon: "🌿",
    color: "#27ae60",
    spacing: 25,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 30,
    season: ["spring","summer"],
    companions: ["tomato","pepper","oregano","marigold"],
    antagonists: ["sage","fennel"],
    yieldScore: 7,
    pollinatorAttraction: 8,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 5,   label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 14,  label: "Seedling",  scale: 0.40, emoji: "🌿" },
      { day: 25,  label: "Mature",    scale: 0.85, emoji: "🌿" },
      { day: 30,  label: "Harvest",   scale: 1.00, emoji: "🌿" },
      { day: 90,  label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "carrot",
    name: "Carrot",
    icon: "🥕",
    color: "#e67e22",
    spacing: 8,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 70,
    season: ["spring","fall"],
    companions: ["tomato","lettuce","onion","rosemary","sage"],
    antagonists: ["dill","beet"],
    yieldScore: 8,
    pollinatorAttraction: 3,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 10,  label: "Sprout",    scale: 0.10, emoji: "🌱" },
      { day: 30,  label: "Seedling",  scale: 0.30, emoji: "🌿" },
      { day: 55,  label: "Growing",   scale: 0.70, emoji: "🥕" },
      { day: 70,  label: "Harvest",   scale: 1.00, emoji: "🥕" },
      { day: 110, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "lettuce",
    name: "Lettuce",
    icon: "🥬",
    color: "#2ecc71",
    spacing: 30,
    sunlight: "partial",
    water: "high",
    daysToMaturity: 45,
    season: ["spring","fall"],
    companions: ["carrot","radish","strawberry","onion","chive"],
    antagonists: ["cabbage","fennel"],
    yieldScore: 6,
    pollinatorAttraction: 2,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.20, emoji: "🌱" },
      { day: 20,  label: "Growing",   scale: 0.60, emoji: "🥬" },
      { day: 35,  label: "Mature",    scale: 0.90, emoji: "🥬" },
      { day: 45,  label: "Harvest",   scale: 1.00, emoji: "🥬" },
      { day: 75,  label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "marigold",
    name: "Marigold",
    icon: "🌼",
    color: "#f39c12",
    spacing: 30,
    sunlight: "full",
    water: "low",
    daysToMaturity: 50,
    season: ["spring","summer","fall"],
    companions: ["tomato","pepper","carrot","basil","cucumber"],
    antagonists: ["bean","cabbage"],
    yieldScore: 3,
    pollinatorAttraction: 10,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 25,  label: "Budding",   scale: 0.60, emoji: "🌿" },
      { day: 40,  label: "Blooming",  scale: 0.90, emoji: "🌼" },
      { day: 50,  label: "Full Bloom",scale: 1.00, emoji: "🌼" },
      { day: 200, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "cucumber",
    name: "Cucumber",
    icon: "🥒",
    color: "#1abc9c",
    spacing: 45,
    sunlight: "full",
    water: "high",
    daysToMaturity: 60,
    season: ["spring","summer"],
    companions: ["bean","pea","radish","sunflower","marigold"],
    antagonists: ["sage","potato","fennel"],
    yieldScore: 8,
    pollinatorAttraction: 7,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 5,   label: "Sprout",    scale: 0.12, emoji: "🌱" },
      { day: 20,  label: "Vine",      scale: 0.40, emoji: "🌿" },
      { day: 40,  label: "Flowering", scale: 0.70, emoji: "🌸" },
      { day: 55,  label: "Fruiting",  scale: 0.90, emoji: "🥒" },
      { day: 60,  label: "Harvest",   scale: 1.00, emoji: "🥒" },
      { day: 120, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "sunflower",
    name: "Sunflower",
    icon: "🌻",
    color: "#f1c40f",
    spacing: 50,
    sunlight: "full",
    water: "low",
    daysToMaturity: 80,
    season: ["summer"],
    companions: ["cucumber","squash","corn","tomato"],
    antagonists: ["potato","bean"],
    yieldScore: 5,
    pollinatorAttraction: 10,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 10,  label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 30,  label: "Growing",   scale: 0.45, emoji: "🌿" },
      { day: 55,  label: "Budding",   scale: 0.75, emoji: "🌿" },
      { day: 70,  label: "Blooming",  scale: 0.95, emoji: "🌻" },
      { day: 80,  label: "Mature",    scale: 1.00, emoji: "🌻" },
      { day: 160, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "pepper",
    name: "Pepper",
    icon: "🫑",
    color: "#c0392b",
    spacing: 45,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 80,
    season: ["summer"],
    companions: ["basil","carrot","parsley","tomato","marigold"],
    antagonists: ["fennel","potato","kohlrabi"],
    yieldScore: 8,
    pollinatorAttraction: 5,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 10,  label: "Sprout",    scale: 0.12, emoji: "🌱" },
      { day: 30,  label: "Seedling",  scale: 0.30, emoji: "🌿" },
      { day: 55,  label: "Vegetative",scale: 0.65, emoji: "🌿" },
      { day: 68,  label: "Flowering", scale: 0.85, emoji: "🌸" },
      { day: 80,  label: "Harvest",   scale: 1.00, emoji: "🫑" },
      { day: 140, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "bean",
    name: "Green Bean",
    icon: "🫘",
    color: "#3d9970",
    spacing: 15,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 55,
    season: ["spring","summer"],
    companions: ["carrot","cucumber","strawberry","pea"],
    antagonists: ["onion","garlic","sunflower","fennel"],
    yieldScore: 7,
    pollinatorAttraction: 6,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.18, emoji: "🌱" },
      { day: 20,  label: "Growing",   scale: 0.45, emoji: "🌿" },
      { day: 38,  label: "Vining",    scale: 0.75, emoji: "🌿" },
      { day: 48,  label: "Podding",   scale: 0.92, emoji: "🫘" },
      { day: 55,  label: "Harvest",   scale: 1.00, emoji: "🫘" },
      { day: 100, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "onion",
    name: "Onion",
    icon: "🧅",
    color: "#9b59b6",
    spacing: 10,
    sunlight: "full",
    water: "low",
    daysToMaturity: 100,
    season: ["spring","fall"],
    companions: ["carrot","tomato","lettuce","strawberry","chamomile"],
    antagonists: ["bean","pea","sage","asparagus"],
    yieldScore: 7,
    pollinatorAttraction: 4,
    stages: [
      { day: 0,   label: "Bulb",      scale: 0.05, emoji: "🧅" },
      { day: 14,  label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 40,  label: "Growing",   scale: 0.40, emoji: "🌿" },
      { day: 75,  label: "Bulbing",   scale: 0.75, emoji: "🧅" },
      { day: 100, label: "Harvest",   scale: 1.00, emoji: "🧅" },
      { day: 150, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "garlic",
    name: "Garlic",
    icon: "🧄",
    color: "#bdc3c7",
    spacing: 15,
    sunlight: "full",
    water: "low",
    daysToMaturity: 240,
    season: ["fall","spring"],
    companions: ["tomato","pepper","carrot","rose","apple"],
    antagonists: ["bean","pea","strawberry"],
    yieldScore: 8,
    pollinatorAttraction: 2,
    stages: [
      { day: 0,   label: "Clove",     scale: 0.05, emoji: "🧄" },
      { day: 21,  label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 60,  label: "Growing",   scale: 0.40, emoji: "🌿" },
      { day: 150, label: "Maturing",  scale: 0.80, emoji: "🧄" },
      { day: 240, label: "Harvest",   scale: 1.00, emoji: "🧄" },
      { day: 280, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "strawberry",
    name: "Strawberry",
    icon: "🍓",
    color: "#e91e63",
    spacing: 30,
    sunlight: "full",
    water: "high",
    daysToMaturity: 60,
    season: ["spring","summer"],
    companions: ["lettuce","onion","thyme","sage","borage"],
    antagonists: ["fennel","garlic","cauliflower"],
    yieldScore: 9,
    pollinatorAttraction: 8,
    stages: [
      { day: 0,   label: "Plant",     scale: 0.10, emoji: "🌱" },
      { day: 14,  label: "Rooting",   scale: 0.20, emoji: "🌿" },
      { day: 30,  label: "Growing",   scale: 0.55, emoji: "🌿" },
      { day: 45,  label: "Flowering", scale: 0.80, emoji: "🌸" },
      { day: 55,  label: "Fruiting",  scale: 0.95, emoji: "🍓" },
      { day: 60,  label: "Harvest",   scale: 1.00, emoji: "🍓" },
      { day: 150, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "lavender",
    name: "Lavender",
    icon: "💜",
    color: "#8e44ad",
    spacing: 60,
    sunlight: "full",
    water: "low",
    daysToMaturity: 90,
    season: ["summer"],
    companions: ["tomato","pepper","rose","carrot","brassica"],
    antagonists: [],
    yieldScore: 4,
    pollinatorAttraction: 10,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 20,  label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 50,  label: "Bushy",     scale: 0.60, emoji: "🌿" },
      { day: 75,  label: "Budding",   scale: 0.85, emoji: "💜" },
      { day: 90,  label: "Blooming",  scale: 1.00, emoji: "💜" },
      { day: 365, label: "Perennial", scale: 0.80, emoji: "💜" }
    ]
  },
  {
    id: "zucchini",
    name: "Zucchini",
    icon: "🫛",
    color: "#16a085",
    spacing: 90,
    sunlight: "full",
    water: "high",
    daysToMaturity: 50,
    season: ["summer"],
    companions: ["bean","pea","corn","nasturtium","marigold"],
    antagonists: ["potato","fennel"],
    yieldScore: 8,
    pollinatorAttraction: 7,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.15, emoji: "🌱" },
      { day: 20,  label: "Seedling",  scale: 0.40, emoji: "🌿" },
      { day: 35,  label: "Flowering", scale: 0.80, emoji: "🌸" },
      { day: 45,  label: "Fruiting",  scale: 0.95, emoji: "🫛" },
      { day: 50,  label: "Harvest",   scale: 1.00, emoji: "🫛" },
      { day: 120, label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "radish",
    name: "Radish",
    icon: "🌰",
    color: "#c0392b",
    spacing: 7,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 25,
    season: ["spring","fall"],
    companions: ["carrot","lettuce","cucumber","pea","tomato"],
    antagonists: ["hyssop"],
    yieldScore: 5,
    pollinatorAttraction: 2,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 4,   label: "Sprout",    scale: 0.20, emoji: "🌱" },
      { day: 12,  label: "Growing",   scale: 0.65, emoji: "🌰" },
      { day: 20,  label: "Maturing",  scale: 0.90, emoji: "🌰" },
      { day: 25,  label: "Harvest",   scale: 1.00, emoji: "🌰" },
      { day: 50,  label: "Done",      scale: 0.00, emoji: "" }
    ]
  },
  {
    id: "pea",
    name: "Pea",
    icon: "🫛",
    color: "#58d68d",
    spacing: 10,
    sunlight: "full",
    water: "medium",
    daysToMaturity: 60,
    season: ["spring","fall"],
    companions: ["carrot","cucumber","bean","corn","turnip"],
    antagonists: ["onion","garlic","shallot","fennel"],
    yieldScore: 7,
    pollinatorAttraction: 5,
    stages: [
      { day: 0,   label: "Seed",      scale: 0.05, emoji: "🌱" },
      { day: 7,   label: "Sprout",    scale: 0.18, emoji: "🌱" },
      { day: 25,  label: "Vining",    scale: 0.50, emoji: "🌿" },
      { day: 42,  label: "Flowering", scale: 0.80, emoji: "🌸" },
      { day: 55,  label: "Podding",   scale: 0.95, emoji: "🫛" },
      { day: 60,  label: "Harvest",   scale: 1.00, emoji: "🫛" },
      { day: 100, label: "Done",      scale: 0.00, emoji: "" }
    ]
  }
];

// Export for module use or attach to window
if (typeof module !== 'undefined') {
  module.exports = PLANTS;
} else {
  window.PLANTS = PLANTS;
}
