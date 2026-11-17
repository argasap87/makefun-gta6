// Solmar City's map: a grid of roads, blocks of buildings, a park, a beach and the ocean.
// Generated once from a seed so every playthrough (and every screenshot) shares the layout.
import { WORLD, ROAD_STEP, ROAD_HALF, ROAD_FIRST, BLOCK, COLORS } from './config.js';
import { mulberry32, pick, range, rangeInt } from './random.js';

export const ROAD_LINES = [];
for (let v = ROAD_FIRST; v < WORLD; v += ROAD_STEP) ROAD_LINES.push(v);

export function isOnRoad(x, y) {
  for (const l of ROAD_LINES) {
    if (Math.abs(x - l) < ROAD_HALF + 6) return true;
    if (Math.abs(y - l) < ROAD_HALF + 6) return true;
  }
  return false;
}

// Snap a point to the nearest road centre line (used to spawn cars and missions on roads).
export function nearestRoadPoint(x, y) {
  let best = null, bd = 1e18;
  for (const l of ROAD_LINES) {
    const d = Math.abs(x - l);
    if (d < bd) { bd = d; best = { x: l, y }; }
    const d2 = Math.abs(y - l);
    if (d2 < bd) { bd = d2; best = { x, y: l }; }
  }
  return best;
}

export function buildCity(seed = 20261117) {
  const rng = mulberry32(seed);
  const buildings = [];
  const palms = [];
  const parks = [];
  const signs = []; // neon shop signs on building fronts
  const signWords = ['TACOS', 'PIER 9', 'HOTEL', '24H', 'BAR', 'SURF', 'CAFE', 'NEON', 'GYM', 'CLUB', 'PIZZA', 'DANCE'];
  const signColors = ['#ff5e8a', '#37e0c8', '#ffd23e', '#7ab8ff', '#ff8a3d'];

  // Beach strip along the south edge, ocean beyond it.
  const beach = { y: WORLD - 190, h: 190 };

  for (let bx = 0; bx < 9; bx++) {
    for (let by = 0; by < 9; by++) {
      const x0 = ROAD_FIRST + bx * ROAD_STEP + ROAD_HALF + 8;
      const y0 = ROAD_FIRST + by * ROAD_STEP + ROAD_HALF + 8;
      const w = BLOCK - 16, h = BLOCK - 16;
      if (y0 > WORLD - 260) continue; // beach blocks stay sand
      // Central park block.
      if (bx === 4 && by === 4) { parks.push({ x: x0, y: y0, w, h }); continue; }
      // Marina / docks block on the east edge.
      if (bx === 8 && by === 7) { parks.push({ x: x0, y: y0, w, h, marina: true }); continue; }
      const n = rangeInt(rng, 2, 4);
      if (n === 2) {
        buildings.push(makeBuilding(rng, x0, y0, w, h));
        buildings.push(makeBuilding(rng, x0, y0 + h / 2 + 6, w, h / 2 - 6));
      } else {
        const cols = rangeInt(rng, 2, 3);
        const cw = w / cols;
        for (let c = 0; c < cols; c++) {
          buildings.push(makeBuilding(rng, x0 + c * cw + 2, y0, cw - 4, h));
        }
      }
      // Palm trees along the block's sidewalk corners.
      for (let p = 0; p < 3; p++) {
        palms.push({
          x: x0 + range(rng, 0, w), y: y0 + (rng() < 0.5 ? -10 : h + 10),
          r: range(rng, 5, 8), sway: range(rng, 0, Math.PI * 2),
        });
      }
    }
  }
  for (const b of buildings) {
    if (rng() < 0.45) {
      signs.push({
        x: b.x + b.w / 2, y: b.y + b.h + 4, text: pick(rng, signWords),
        color: pick(rng, signColors), w: range(rng, 34, 62),
      });
    }
  }
  // Extra palms along the beach.
  for (let i = 0; i < 26; i++) {
    palms.push({ x: 60 + i * 125 + range(rng, -20, 20), y: WORLD - 210 + range(rng, -8, 8), r: 7, sway: range(rng, 0, 6) });
  }
  return { buildings, palms, parks, signs, beach };
}

function makeBuilding(rng, x, y, w, h) {
  return {
    x, y, w, h,
    color: pick(rng, COLORS.buildingTop),
    height: rangeInt(rng, 1, 3),
    roof: rng() < 0.25,
    windows: rangeInt(rng, 2, 5),
  };
}

// Point inside any building (for collision): buildings are solid rectangles.
export function hitBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}
