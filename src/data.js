// Game constants and configuration
export const TILE = 56;
export const GRID_W = 22;
export const GRID_H = 18;

export const T = { GRASS: 0, PATH: 1, ATTRACTION: 2, ENTRANCE: 3, TREE: 4, WATER: 5, DECOR: 6 };

export const ATTRACTIONS = {
  ice_cream: {
    id: 'ice_cream', name: 'Ice Cream Cart', emoji: '🍦',
    cost: 400, size: [1, 1], buildTime: 8, buildersNeeded: 1,
    incomePerVisit: 3, capacity: 3, opCost: 8, power: 1,
    desc: 'Sweet treats keep visitors happy and spending!', col: '#1abc9c', star: 1,
  },
  game_booth: {
    id: 'game_booth', name: 'Game Booth', emoji: '🎯',
    cost: 700, size: [1, 1], buildTime: 10, buildersNeeded: 1,
    incomePerVisit: 5, capacity: 2, opCost: 12, power: 1,
    desc: 'Win prizes! Popular with kids and competitive adults.', col: '#27ae60', star: 1,
  },
  food_stall: {
    id: 'food_stall', name: 'Food Stall', emoji: '🍔',
    cost: 900, size: [2, 1], buildTime: 12, buildersNeeded: 1,
    incomePerVisit: 4, capacity: 5, opCost: 18, power: 2,
    desc: 'Tasty food keeps visitors full and happy!', col: '#f39c12', star: 1,
  },
  carousel: {
    id: 'carousel', name: 'Carousel', emoji: '🎠',
    cost: 1800, size: [2, 2], buildTime: 22, buildersNeeded: 1,
    incomePerVisit: 6, capacity: 6, opCost: 35, power: 3,
    desc: 'Classic merry-go-round. Perfect for families!', col: '#9b59b6', star: 1,
  },
  ferris_wheel: {
    id: 'ferris_wheel', name: 'Ferris Wheel', emoji: '🎡',
    cost: 3000, size: [3, 3], buildTime: 35, buildersNeeded: 2,
    incomePerVisit: 10, capacity: 8, opCost: 55, power: 5,
    desc: 'Classic ferris wheel. Great views attract visitors!', col: '#e74c3c', star: 1,
  },
  balloon_ride: {
    id: 'balloon_ride', name: 'Balloon Ride', emoji: '🎈',
    cost: 3500, size: [2, 2], buildTime: 38, buildersNeeded: 2,
    incomePerVisit: 11, capacity: 4, opCost: 65, power: 4,
    desc: 'Soar high above the park in a colorful balloon!', col: '#e67e22', star: 2,
  },
  haunted_house: {
    id: 'haunted_house', name: 'Haunted House', emoji: '👻',
    cost: 4500, size: [3, 3], buildTime: 48, buildersNeeded: 3,
    incomePerVisit: 14, capacity: 8, opCost: 85, power: 6,
    desc: 'Thrilling scares in a spooky atmosphere!', col: '#6c3483', star: 2,
  },
  roller_coaster: {
    id: 'roller_coaster', name: 'Roller Coaster', emoji: '🎢',
    cost: 9000, size: [5, 4], buildTime: 70, buildersNeeded: 4,
    incomePerVisit: 18, capacity: 12, opCost: 130, power: 10,
    desc: 'The king of thrills! Draws visitors from miles around.', col: '#c0392b', star: 2,
  },
};

export const INVESTOR_TYPES = [
  { id: 'angel',     name: 'Angel Investor',    avatar: '👼', minStar: 1, minVis: 0,   amt: [5000,15000],    eq: [5,12],  days: 30, desc: 'Early believer. Backs the dream with seed capital.' },
  { id: 'venture',   name: 'Venture Capitalist', avatar: '💼', minStar: 2, minVis: 50,  amt: [20000,50000],   eq: [10,18], days: 60, desc: 'Serious money for proven parks with real traction.' },
  { id: 'celebrity', name: 'Celebrity Backer',   avatar: '⭐', minStar: 2, minVis: 100, amt: [25000,60000],   eq: [7,14],  days: 45, desc: 'Fame + funding. Their name brings crowds and cash.' },
  { id: 'corporate', name: 'Corporate Partner',  avatar: '🏢', minStar: 3, minVis: 200, amt: [60000,150000],  eq: [15,25], days: 90, desc: 'Big money. Big expectations. Major league investment.' },
];

export const SKIN_TONES  = ['#FDDBB4','#F4A460','#DEB887','#C19A6B','#8B6914','#5C3317'];
export const HAIR_COLORS = ['#1a1a1a','#8B4513','#DAA520','#DC143C','#4169E1','#808080','#FFD700','#FF6347'];
export const SHIRT_COLS  = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63','#00bcd4'];
export const PANT_COLS   = ['#2c3e50','#34495e','#1a252f','#4a235a','#154360','#1b4332'];

export const RATING_REQ = [
  { star: 1, vis: 0,    att: 0  },
  { star: 2, vis: 80,   att: 3  },
  { star: 3, vis: 250,  att: 6  },
  { star: 4, vis: 700,  att: 10 },
  { star: 5, vis: 1800, att: 15 },
];

export const DAY_SECS     = 60;
export const BUILDER_COST = 550;
export const BUILDER_SAL  = 55;
export const BUILDER_SPD  = 90;  // px/s
export const BUILDER_RATE = 0.018;
export const MAX_BUILDERS = 12;
export const START_MONEY  = 6000;
export const PATH_COST    = 20;
