// Game constants
export const TILE   = 56;    // 2D pixel tile size (for pathfinding)
export const T3D    = 3;     // Three.js units per tile
export const GRID_W = 22;
export const GRID_H = 18;

export const T = { GRASS: 0, PATH: 1, ATTRACTION: 2, ENTRANCE: 3, TREE: 4 };

export const ATTRACTIONS = {
  ice_cream: {
    id: 'ice_cream', name: 'Ларёк мороженого', emoji: '🍦',
    cost: 400, size: [1, 1], buildTime: 8, buildersNeeded: 1,
    incomePerVisit: 3, capacity: 3, opCost: 8, power: 1,
    desc: 'Мороженое делает посетителей счастливее!', col: 0x1abc9c, star: 1,
  },
  game_booth: {
    id: 'game_booth', name: 'Тир', emoji: '🎯',
    cost: 700, size: [1, 1], buildTime: 10, buildersNeeded: 1,
    incomePerVisit: 5, capacity: 2, opCost: 12, power: 1,
    desc: 'Выигрывай призы! Популярно у детей.', col: 0x27ae60, star: 1,
  },
  food_stall: {
    id: 'food_stall', name: 'Ларёк с едой', emoji: '🍔',
    cost: 900, size: [2, 1], buildTime: 12, buildersNeeded: 1,
    incomePerVisit: 4, capacity: 5, opCost: 18, power: 2,
    desc: 'Вкусная еда поднимает настроение!', col: 0xf39c12, star: 1,
  },
  carousel: {
    id: 'carousel', name: 'Карусель', emoji: '🎠',
    cost: 1800, size: [2, 2], buildTime: 22, buildersNeeded: 1,
    incomePerVisit: 6, capacity: 6, opCost: 35, power: 3,
    desc: 'Классическая карусель. Идеально для семей!', col: 0x9b59b6, star: 1,
  },
  ferris_wheel: {
    id: 'ferris_wheel', name: 'Колесо обозрения', emoji: '🎡',
    cost: 3000, size: [3, 3], buildTime: 35, buildersNeeded: 2,
    incomePerVisit: 10, capacity: 8, opCost: 55, power: 5,
    desc: 'Огромное колесо с захватывающим видом!', col: 0xe74c3c, star: 1,
  },
  balloon_ride: {
    id: 'balloon_ride', name: 'Воздушный шар', emoji: '🎈',
    cost: 3500, size: [2, 2], buildTime: 38, buildersNeeded: 2,
    incomePerVisit: 11, capacity: 4, opCost: 65, power: 4,
    desc: 'Парите высоко над парком!', col: 0xe67e22, star: 2,
  },
  haunted_house: {
    id: 'haunted_house', name: 'Дом ужасов', emoji: '👻',
    cost: 4500, size: [3, 3], buildTime: 48, buildersNeeded: 3,
    incomePerVisit: 14, capacity: 8, opCost: 85, power: 6,
    desc: 'Жуткие страхи в мрачной атмосфере!', col: 0x6c3483, star: 2,
  },
  roller_coaster: {
    id: 'roller_coaster', name: 'Американские горки', emoji: '🎢',
    cost: 9000, size: [5, 4], buildTime: 70, buildersNeeded: 4,
    incomePerVisit: 18, capacity: 12, opCost: 130, power: 10,
    desc: 'Король аттракционов! Привлекает всех!', col: 0xc0392b, star: 2,
  },
  parking: {
    id: 'parking', name: 'Парковка', emoji: '🚗',
    cost: 1200, size: [3, 2], buildTime: 14, buildersNeeded: 1,
    incomePerVisit: 0, capacity: 0, opCost: 15, power: 0,
    desc: 'Больше места для машин — больше гостей приезжает в парк!', col: 0x7f8c8d, star: 1,
    visitorBonus: 0.15,
  },
};

export const INVESTOR_TYPES = [
  { id: 'angel',     name: 'Бизнес-ангел',      avatar: '👼', minStar: 1, minVis: 0,   amt: [5000,15000],   eq: [5,12],  days: 30, desc: 'Верит в вашу идею с первого дня.' },
  { id: 'venture',   name: 'Венчурный фонд',     avatar: '💼', minStar: 2, minVis: 50,  amt: [20000,50000],  eq: [10,18], days: 60, desc: 'Серьёзные деньги для стабильных парков.' },
  { id: 'celebrity', name: 'Знаменитость',        avatar: '⭐', minStar: 2, minVis: 100, amt: [25000,60000],  eq: [7,14],  days: 45, desc: 'Имя знаменитости = толпы посетителей!' },
  { id: 'corporate', name: 'Корпоративный парт.', avatar: '🏢', minStar: 3, minVis: 200, amt: [60000,150000], eq: [15,25], days: 90, desc: 'Большие деньги, большие ожидания.' },
];

export const SKIN_TONES  = [0xFDDBB4, 0xF4A460, 0xDEB887, 0xC19A6B, 0x8B6914, 0x5C3317];
export const HAIR_COLORS = [0x1a1a1a, 0x8B4513, 0xDAA520, 0xDC143C, 0x4169E1, 0x808080, 0xFFD700];
export const SHIRT_COLS  = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63];
export const PANT_COLS   = [0x2c3e50, 0x34495e, 0x1a252f, 0x4a235a, 0x154360, 0x1b4332];

export const DAY_SECS     = 60;
export const BUILDER_COST = 550;
export const BUILDER_SAL  = 55;
export const BUILDER_SPD  = 90;
export const MAX_BUILDERS = 12;
export const START_MONEY  = 6000;
export const PATH_COST    = 20;

export const STAFF_COST   = 300;
export const STAFF_SAL    = 30;
export const MAX_STAFF    = 12;
export const STAFF_INCOME_MULT = 1.3;

// Upgrade levels: index 0 = level1->2, index 1 = level2->3
export const UPGRADE_COST_MULT   = [0.55, 0.9];
export const UPGRADE_INCOME_MULT = [1, 1.5, 2.1];
export const UPGRADE_CAP_MULT    = [1, 1.35, 1.8];
export const MAX_LEVEL = 3;

// Construction deposit fraction paid upfront; remainder paid gradually as builders work
export const BUILD_DEPOSIT_FRAC = 0.2;
