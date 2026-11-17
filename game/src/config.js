// Solmar City — shared constants: world size, colours, tuning.
// The city is a 3200x3200 grid of blocks split by roads; the south edge is the beach and ocean.
export const WORLD = 3200;
export const ROAD_STEP = 320;      // distance between road centre lines
export const ROAD_HALF = 36;       // half road width
export const ROAD_FIRST = 160;     // first road centre line
export const BLOCK = ROAD_STEP - ROAD_HALF * 2;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#6d9c4c',
  sand: '#e8cf9a',
  ocean: '#2e7fb8',
  oceanDeep: '#1f5f92',
  asphalt: '#3a3a42',
  asphaltDark: '#33333a',
  sidewalk: '#b9b3a4',
  lane: '#e8d44d',
  buildingTop: ['#e8b48c', '#d98a7a', '#8fb8c9', '#e8d29a', '#c9a2c8', '#9ac9a2', '#e8e0d0', '#f0a35e'],
  buildingSide: '#00000033',
  park: '#5d9448',
};

export const TUNING = {
  walkSpeed: 150,
  runSpeed: 235,
  carAccel: 320,
  carTopSpeed: 460,
  carReverse: 160,
  carTurn: 2.6,
  playerHealth: 100,
  pistolDamage: 34,
  pistolRange: 420,
  pistolAmmo: 12,
  wantedDecaySeconds: 28,
  policeCarSpeed: 430,
  copRunSpeed: 205,
};

export const SAVE_KEY = 'solmar-city-save-v1';
