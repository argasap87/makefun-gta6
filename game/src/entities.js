// Traffic cars, pedestrians, police and the small stuff: bullets, particles, pickups.
// Every entity is a plain object; update functions live here, rendering in render.js.
import { WORLD, ROAD_HALF, TUNING } from './config.js';
import { ROAD_LINES } from './city.js';
import { mulberry32, pick, range, rangeInt, clamp, angleDiff, dist2 } from './random.js';
import { hitBuilding, nearestRoadPoint } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7ad9', '#e8c53d', '#e8e8e8', '#2e2e34', '#7ac9a2', '#c96ad9', '#e88a3d', '#8a9ab0'];
const CAR_NAMES = ['Vesper', 'Comet GT', 'Ranchero', 'Sunbeam', 'Falcon', 'Dune Buggy', 'Civic-9', 'Limo', 'Pickup'];
const PED_COLORS = ['#e84f6a', '#4f9ae8', '#e8a54f', '#7ae8a5', '#c9c9c9', '#e8e84f', '#a54fe8', '#e87ab0'];

export function makeTrafficCar(rng, id) {
  const vertical = rng() < 0.5;
  const line = pick(rng, ROAD_LINES);
  const lane = (rng() < 0.5 ? -1 : 1) * 17;
  const pos = range(rng, 120, WORLD - 120);
  return {
    id, kind: 'traffic',
    x: vertical ? line + lane : pos, y: vertical ? pos : line + lane,
    angle: vertical ? (lane < 0 ? Math.PI / 2 : -Math.PI / 2) : (lane < 0 ? 0 : Math.PI),
    speed: range(rng, 70, 130), targetSpeed: range(rng, 70, 130),
    color: pick(rng, CAR_COLORS), name: pick(rng, CAR_NAMES),
    w: 46, h: 22, stuck: 0,
  };
}

export function makePedestrian(rng, id, city) {
  // Spawn on a sidewalk: near a road, not inside a building.
  for (let tries = 0; tries < 20; tries++) {
    const x = range(rng, 80, WORLD - 80), y = range(rng, 80, WORLD - 260);
    const p = nearestRoadPoint(x, y);
    const sx = p.x + (rng() < 0.5 ? -1 : 1) * (ROAD_HALF + 14);
    const sy = p.y + (rng() < 0.5 ? -1 : 1) * (ROAD_HALF + 14);
    if (!hitBuilding(city, sx, sy, 6)) {
      return {
        id, kind: 'ped', x: sx, y: sy, angle: range(rng, 0, Math.PI * 2),
        speed: range(rng, 22, 48), color: pick(rng, PED_COLORS),
        skin: pick(rng, ['#e8b88a', '#c98a5e', '#8a5a3a', '#f0c8a0']),
        flee: 0, retarget: 0, dead: false, deadT: 0,
      };
    }
  }
  return { id, kind: 'ped', x: 200, y: 200, angle: 0, speed: 30, color: '#e84f6a', skin: '#e8b88a', flee: 0, retarget: 0, dead: false, deadT: 0 };
}

export function makePoliceCar(x, y) {
  return {
    kind: 'police', x, y, angle: 0, speed: 0,
    color: '#1c1c22', name: 'Interceptor', w: 48, h: 23,
    siren: 0, stuck: 0, ramCooldown: 0,
  };
}

export function makeCop(x, y) {
  return { kind: 'cop', x, y, angle: 0, speed: 0, health: 60, punchT: 0, dead: false, deadT: 0 };
}

export function makeThug(x, y) {
  return { kind: 'thug', x, y, angle: 0, speed: 0, health: 100, shootT: Math.random(), dead: false, deadT: 0, color: '#5e2a4f' };
}

// --- traffic update: follow the road grid, turn at intersections, brake for the car ahead ---
export function updateTraffic(car, dt, cars, city, rng) {
  const aheadX = car.x + Math.cos(car.angle) * 46;
  const aheadY = car.y + Math.sin(car.angle) * 46;
  let blocked = hitBuilding(city, aheadX, aheadY, 4) != null;
  for (const o of cars) {
    if (o === car || o.dead) continue;
    if (dist2(aheadX, aheadY, o.x, o.y) < 42 * 42) { blocked = true; break; }
  }
  car.speed += ((blocked ? 0 : car.targetSpeed) - car.speed) * Math.min(1, dt * 1.5);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn.
  const nearLine = ROAD_LINES.find((l) => Math.abs(car.x - l) < 10 || Math.abs(car.y - l) < 10);
  if (nearLine !== undefined && rng() < dt * 0.35) {
    const vertical = Math.abs(car.x - nearLine) < 10;
    const turn = pick(rng, [-Math.PI / 2, Math.PI / 2]);
    car.angle += turn;
    if (vertical) car.x = nearLine + (car.angle === Math.PI / 2 || car.angle === -Math.PI / 2 ? 17 : -17);
    else car.y = nearLine + 17;
  }
  // Wrap around the world edges so traffic never runs out.
  if (car.x < 40) { car.x = WORLD - 60; } if (car.x > WORLD - 40) { car.x = 60; }
  if (car.y < 40) { car.y = WORLD - 60; } if (car.y > WORLD - 40) { car.y = 60; }
}

export function updatePedestrian(p, dt, city, danger, rng) {
  if (p.dead) { p.deadT += dt; return; }
  p.retarget -= dt;
  if (danger && dist2(p.x, p.y, danger.x, danger.y) < 260 * 260) p.flee = 1.2;
  if (p.flee > 0) {
    p.flee -= dt;
    const a = Math.atan2(p.y - danger.y, p.x - danger.x);
    p.angle = a; p.speed = 95;
  } else if (p.retarget <= 0) {
    p.retarget = range(rng, 2, 6);
    p.angle = range(rng, 0, Math.PI * 2);
    p.speed = range(rng, 22, 48);
  }
  const nx = p.x + Math.cos(p.angle) * p.speed * dt;
  const ny = p.y + Math.sin(p.angle) * p.speed * dt;
  if (!hitBuilding(city, nx, ny, 8) && nx > 30 && nx < WORLD - 30 && ny > 30 && ny < WORLD - 230) {
    p.x = nx; p.y = ny;
  } else {
    p.angle += Math.PI / 2; p.retarget = 0.5;
  }
}

// Police car: steer toward the player, ram on contact, give up slowly when far.
export function updatePoliceCar(car, dt, px, py, playerSpeed) {
  const target = Math.atan2(py - car.y, px - car.x);
  const diff = angleDiff(car.angle, target);
  car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
  const want = TUNING.policeCarSpeed * (0.85 + Math.min(0.3, playerSpeed / 1500));
  car.speed += (want - car.speed) * Math.min(1, dt * 0.9);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.siren += dt;
  car.ramCooldown = Math.max(0, car.ramCooldown - dt);
  if (car.x < 20 || car.x > WORLD - 20 || car.y < 20 || car.y > WORLD - 200) {
    // Bounce back into the city instead of leaving it.
    car.angle += Math.PI * 0.9; car.speed *= 0.5;
  }
}

export function updateCop(cop, dt, px, py, city) {
  if (cop.dead) { cop.deadT += dt; return; }
  const d = Math.sqrt(dist2(cop.x, cop.y, px, py));
  cop.angle = Math.atan2(py - cop.y, px - cop.x);
  cop.punchT -= dt;
  if (d > 26) {
    const nx = cop.x + Math.cos(cop.angle) * TUNING.copRunSpeed * dt;
    const ny = cop.y + Math.sin(cop.angle) * TUNING.copRunSpeed * dt;
    if (!hitBuilding(city, nx, ny, 8)) { cop.x = nx; cop.y = ny; }
  }
}

export function updateBullet(b, dt) {
  b.x += Math.cos(b.angle) * b.speed * dt;
  b.y += Math.sin(b.angle) * b.speed * dt;
  b.life -= dt;
  return b.life > 0 && b.x > 0 && b.x < WORLD && b.y > 0 && b.y < WORLD;
}

export function spawnParticles(list, x, y, color, n, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    list.push({ x, y, vx: Math.cos(a) * speed * (0.3 + Math.random() * 0.7), vy: Math.sin(a) * speed * (0.3 + Math.random() * 0.7), life: 0.4 + Math.random() * 0.4, max: 0.8, color, size: 2 + Math.random() * 3 });
  }
}
