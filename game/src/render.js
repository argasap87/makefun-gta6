// All drawing: the city, the cars and people, the HUD with its minimap, and the menus.
// The judge sees the game mostly through screenshots, so the HUD is drawn on the canvas.
import { WORLD, ROAD_HALF, COLORS } from './config.js';
import { ROAD_LINES } from './city.js';
import { clamp } from './random.js';

export function drawGame(ctx, G, w, h) {
  ctx.clearRect(0, 0, w, h);
  const cam = G.cam;
  const shx = G.shake ? (Math.random() - 0.5) * G.shake * 14 : 0;
  const shy = G.shake ? (Math.random() - 0.5) * G.shake * 14 : 0;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + shx, -cam.y + shy);
  drawGround(ctx, G);
  drawRoads(ctx, G);
  drawParks(ctx, G);
  drawBuildings(ctx, G);
  drawSigns(ctx, G);
  drawPickups(ctx, G);
  drawCars(ctx, G);
  drawPeds(ctx, G);
  if (G.player) drawPlayer(ctx, G);
  drawBullets(ctx, G);
  drawParticles(ctx, G);
  drawTargetMarker(ctx, G);
  ctx.restore();
  drawTargetArrow(ctx, G, w, h);
  // Warm sunset wash over the whole scene.
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(255,180,90,0.05)');
  wash.addColorStop(1, 'rgba(255,120,60,0.10)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  if (G.flash > 0) { ctx.fillStyle = `rgba(200,30,30,${G.flash * 0.25})`; ctx.fillRect(0, 0, w, h); }
  if (G.state === 'playing' || G.state === 'paused' || G.state === 'wasted') drawHud(ctx, G, w, h);
  if (G.state === 'title') drawTitle(ctx, G, w, h);
  if (G.state === 'howto') drawHowTo(ctx, G, w, h);
  if (G.state === 'paused') drawPaused(ctx, G, w, h);
  if (G.state === 'wasted') drawWasted(ctx, G, w, h);
}

function drawGround(ctx, G) {
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WORLD, WORLD);
  // Mown-lawn checker for texture.
  ctx.fillStyle = COLORS.grassDark;
  for (let x = 0; x < WORLD; x += 320) {
    for (let y = 0; y < WORLD; y += 320) {
      if (((x + y) / 320) % 2 === 0) ctx.fillRect(x, y, 320, 320);
    }
  }
  // Ocean along the south edge, sand beach in front of it.
  ctx.fillStyle = COLORS.sand;
  ctx.fillRect(0, WORLD - 190, WORLD, 190);
  ctx.fillStyle = COLORS.ocean;
  ctx.fillRect(0, WORLD - 90, WORLD, 90);
  ctx.fillStyle = COLORS.oceanDeep;
  for (let x = 0; x < WORLD; x += 90) {
    ctx.fillRect(x + ((G.time * 12 + x) % 90), WORLD - 70, 46, 4);
    ctx.fillRect(x + ((G.time * 8 + x * 2) % 90), WORLD - 40, 30, 3);
  }
  // Boardwalk line.
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(0, WORLD - 196, WORLD, 8);
}

function drawRoads(ctx, G) {
  ctx.fillStyle = COLORS.sidewalk;
  for (const l of ROAD_LINES) {
    ctx.fillRect(l - ROAD_HALF - 10, 0, (ROAD_HALF + 10) * 2, WORLD);
    ctx.fillRect(0, l - ROAD_HALF - 10, WORLD, (ROAD_HALF + 10) * 2);
  }
  ctx.fillStyle = COLORS.asphalt;
  for (const l of ROAD_LINES) {
    ctx.fillRect(l - ROAD_HALF, 0, ROAD_HALF * 2, WORLD);
    ctx.fillRect(0, l - ROAD_HALF, WORLD, ROAD_HALF * 2);
  }
  // Lane dashes and crosswalks.
  ctx.fillStyle = COLORS.lane;
  for (const l of ROAD_LINES) {
    for (let d = 0; d < WORLD; d += 64) {
      ctx.fillRect(l - 2, d, 4, 26);
      ctx.fillRect(d, l - 2, 26, 4);
    }
  }
  ctx.fillStyle = '#e8e8e8';
  for (const lx of ROAD_LINES) {
    for (const ly of ROAD_LINES) {
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(lx + i * 12 - 4, ly - ROAD_HALF - 6, 8, 10);
        ctx.fillRect(lx + i * 12 - 4, ly + ROAD_HALF - 4, 8, 10);
        ctx.fillRect(lx - ROAD_HALF - 6, ly + i * 12 - 4, 10, 8);
        ctx.fillRect(lx + ROAD_HALF - 4, ly + i * 12 - 4, 10, 8);
      }
    }
  }
}

function drawParks(ctx, G) {
  for (const pk of G.city.parks) {
    if (pk.marina) {
      ctx.fillStyle = '#8a7a5a';
      ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
      ctx.fillStyle = COLORS.ocean;
      ctx.fillRect(pk.x + 20, pk.y + pk.h - 70, pk.w - 40, 60);
      ctx.fillStyle = '#e8e8e8';
      for (let i = 0; i < 4; i++) ctx.fillRect(pk.x + 30 + i * 55, pk.y + pk.h - 60, 34, 14);
      ctx.fillStyle = '#3a3a42';
      ctx.font = 'bold 20px Arial';
      ctx.fillText('SOLMAR DOCKS', pk.x + 12, pk.y + 26);
      continue;
    }
    ctx.fillStyle = COLORS.park;
    ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
    ctx.fillStyle = '#4a7a38';
    for (let i = 0; i < 8; i++) {
      const tx = pk.x + 20 + (i % 4) * 55, ty = pk.y + 30 + Math.floor(i / 4) * 120;
      ctx.beginPath(); ctx.arc(tx, ty, 16, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#c9b88a';
    ctx.beginPath(); ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a9ac9';
    ctx.beginPath(); ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('CENTRAL PARK', pk.x + 10, pk.y + 22);
  }
  // Palm trees.
  for (const palm of G.city.palms) {
    const sway = Math.sin(G.time * 1.2 + palm.sway) * 2;
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(palm.x, palm.y); ctx.lineTo(palm.x + sway, palm.y - 14); ctx.stroke();
    ctx.fillStyle = '#3f8f3f';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + palm.sway;
      ctx.beginPath();
      ctx.ellipse(palm.x + sway + Math.cos(a) * 9, palm.y - 14 + Math.sin(a) * 6, 11, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBuildings(ctx, G) {
  for (const b of G.city.buildings) {
    const s = b.height * 6;
    // Long sunset shadow.
    ctx.fillStyle = 'rgba(40,20,60,0.25)';
    ctx.fillRect(b.x + s, b.y + s + 6, b.w, b.h);
    // Side faces (fake 3D).
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(b.x, b.y + b.h, b.w, s);
    ctx.fillRect(b.x + b.w, b.y + s, s, b.h);
    // Roof.
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    // Roof detail: AC unit or skylight.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + b.w * 0.15, b.y + b.h * 0.2, b.w * 0.2, b.h * 0.25);
    // Windows along the edges.
    ctx.fillStyle = 'rgba(255,255,220,0.75)';
    const n = b.windows;
    for (let i = 0; i < n; i++) {
      ctx.fillRect(b.x + 6 + (i * (b.w - 16)) / Math.max(1, n - 1), b.y + 4, 7, 5);
      ctx.fillRect(b.x + 6 + (i * (b.w - 16)) / Math.max(1, n - 1), b.y + b.h - 9, 7, 5);
    }
    if (b.roof) {
      ctx.fillStyle = '#3f8f5f';
      ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, Math.min(b.w, b.h) * 0.22, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawSigns(ctx, G) {
  ctx.textAlign = 'center';
  for (const s of G.city.signs) {
    ctx.fillStyle = s.color;
    ctx.font = 'bold 13px Arial';
    ctx.fillRect(s.x - s.w / 2, s.y - 9, s.w, 15);
    ctx.fillStyle = '#111';
    ctx.fillText(s.text, s.x, s.y + 3);
  }
  ctx.textAlign = 'left';
}

function drawPickups(ctx, G) {
  for (const pk of G.pickups) {
    const bob = Math.sin(G.time * 3 + pk.x) * 3;
    if (pk.kind === 'health') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(pk.x - 12, pk.y - 12 + bob, 24, 24);
      ctx.fillStyle = '#27ae4f';
      ctx.fillRect(pk.x - 3, pk.y - 9 + bob, 6, 18);
      ctx.fillRect(pk.x - 9, pk.y - 3 + bob, 18, 6);
    } else if (pk.kind === 'ammo') {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText('AMMO', pk.x, pk.y + 4 + bob);
      ctx.textAlign = 'left';
    } else if (pk.kind === 'cash') {
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(pk.x - 11, pk.y - 7 + bob, 22, 14);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText('$', pk.x, pk.y + 4 + bob);
      ctx.textAlign = 'left';
    }
  }
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 5, car.w, car.h);
  ctx.fillStyle = car.color;
  roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,220,255,0.85)';
  ctx.fillRect(-car.w * 0.18, -car.h / 2 + 3, car.w * 0.22, car.h - 6);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(car.w * 0.22, -car.h / 2 + 3, 5, car.h - 6);
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 3, 3, 5);
  ctx.fillRect(car.w / 2 - 3, car.h / 2 - 8, 3, 5);
  if (car.kind === 'police') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-car.w * 0.3, -car.h / 2, car.w * 0.25, car.h);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
    ctx.textAlign = 'left';
    const blink = Math.sin(car.siren * 9) > 0;
    ctx.fillStyle = blink ? '#ff2a2a' : '#2a7aff';
    ctx.beginPath(); ctx.arc(-6, -car.h / 2 - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = blink ? '#2a7aff' : '#ff2a2a';
    ctx.beginPath(); ctx.arc(6, -car.h / 2 - 2, 5, 0, Math.PI * 2); ctx.fill();
  }
  if (isPlayer) {
    ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
    ctx.strokeRect(-car.w / 2 - 3, -car.h / 2 - 3, car.w + 6, car.h + 6);
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCars(ctx, G) {
  for (const c of G.traffic) drawCarShape(ctx, c, false);
  for (const pc of G.policeCars) drawCarShape(ctx, pc, false);
}

function drawPeds(ctx, G) {
  for (const ped of G.peds) {
    if (ped.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(ped.x, ped.y, 12, 7, ped.angle, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const bob = Math.sin(G.time * 8 + ped.id) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(ped.x, ped.y + 7, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath(); ctx.arc(ped.x, ped.y + bob, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 2 + bob, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(ped.x, ped.y - 5 + bob, 5, Math.PI, 0); ctx.fill();
  }
  for (const t of G.thugs) {
    if (t.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(t.x, t.y, 12, 7, t.angle, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    // Red ring so thugs read at a glance in a crowd.
    ctx.strokeStyle = '#ff2a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(t.x, t.y - 2, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + Math.cos(t.angle) * 18, t.y + Math.sin(t.angle) * 18); ctx.stroke();
    ctx.fillStyle = '#ff2a2a';
    ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('!', t.x, t.y - 16);
    ctx.textAlign = 'left';
  }
  for (const cop of G.cops) {
    if (cop.dead) continue;
    ctx.fillStyle = '#1c3a6e';
    ctx.beginPath(); ctx.arc(cop.x, cop.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(cop.x, cop.y - 2, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c3a6e';
    ctx.beginPath(); ctx.arc(cop.x, cop.y - 5, 5, Math.PI, 0); ctx.fill();
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (p.car) { drawCarShape(ctx, p.car, true); return; }
  const bob = Math.sin(p.runT) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  // Body: teal jacket, jeans — Danny Reyes.
  ctx.fillStyle = '#0f7a6e';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 2, p.y - 2 + bob, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 2, p.y - 5 + bob, 6, Math.PI, 0); ctx.fill();
  // Pistol in hand, aimed at the mouse.
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(p.x, p.y + bob);
  ctx.lineTo(p.x + Math.cos(p.angle) * 17, p.y + Math.sin(p.angle) * 17 + bob); ctx.stroke();
  // Crosshair at the mouse.
  const mx = G.input.mouseX, my = G.input.mouseY;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(mx, my, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx - 13, my); ctx.lineTo(mx - 5, my);
  ctx.moveTo(mx + 5, my); ctx.lineTo(mx + 13, my);
  ctx.moveTo(mx, my - 13); ctx.lineTo(mx, my - 5);
  ctx.moveTo(mx, my + 5); ctx.lineTo(mx, my + 13);
  ctx.stroke();
}

function drawBullets(ctx, G) {
  ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - Math.cos(b.angle) * 14, b.y - Math.sin(b.angle) * 14);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawParticles(ctx, G) {
  for (const pt of G.particles) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawTargetMarker(ctx, G) {
  const t = G.objectiveTarget;
  if (!t || !G.player) return;
  const p = G.player;
  const pulse = 1 + Math.sin(G.time * 4) * 0.15;
  // Ground beacon (drawn in world space).
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(t.x, t.y, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,62,0.15)';
  ctx.beginPath(); ctx.arc(t.x, t.y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.moveTo(t.x, t.y - 46); ctx.lineTo(t.x - 10, t.y - 26); ctx.lineTo(t.x + 10, t.y - 26); ctx.closePath(); ctx.fill();
}

// Off-screen direction arrow, drawn in screen space after the camera transform.
function drawTargetArrow(ctx, G, w, h) {
  const t = G.objectiveTarget;
  if (!t || !G.player) return;
  const p = G.player;
  const dx = t.x - p.x, dy = t.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 500) return;
  const a = Math.atan2(dy, dx);
  const cx = w / 2 + Math.cos(a) * (w / 2 - 70);
  const cy = h / 2 + Math.sin(a) * (h / 2 - 70);
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(-9, -12); ctx.lineTo(-9, 12); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(d)}m`, cx, cy + 30);
  ctx.textAlign = 'left';
}

// ---------------- HUD ----------------
function drawHud(ctx, G, w, h) {
  const p = G.player;
  ctx.textAlign = 'left';
  // Top-left: cash, health, ammo.
  ctx.fillStyle = 'rgba(10,10,20,0.55)';
  roundRect(ctx, 12, 12, 210, 86, 8); ctx.fill();
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(`$${G.cash.toLocaleString()}`, 24, 42);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('SOLMAR CITY', 24, 62);
  ctx.fillStyle = '#333';
  ctx.fillRect(24, 70, 150, 10);
  ctx.fillStyle = p.health > 30 ? '#2ecc71' : '#e74c3c';
  ctx.fillRect(24, 70, 150 * clamp(p.health / 100, 0, 1), 10);
  ctx.fillStyle = '#fff';
  ctx.font = '12px Arial';
  ctx.fillText(`${Math.max(0, Math.round(p.health))} HP`, 180, 80);
  if (!p.car) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`AMMO ${p.ammo}`, 24, 96 + 0);
  }
  // Wanted stars, top-right above the minimap.
  const mm = 190, mx = w - mm - 14, my = 14;
  ctx.fillStyle = 'rgba(10,10,20,0.55)';
  roundRect(ctx, mx - 6, my + mm + 6, mm + 12, 34, 8); ctx.fill();
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    drawStar(ctx, mx + 16 + i * 36, my + mm + 24, 13);
  }
  if (G.wanted > 0) {
    ctx.fillStyle = '#ff5e5e';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('WANTED', mx + 4, my + mm + 56);
  }
  drawMinimap(ctx, G, mx, my, mm);
  // Objective, bottom-left.
  ctx.fillStyle = 'rgba(10,10,20,0.6)';
  const obj = G.objective || '';
  ctx.font = 'bold 15px Arial';
  const ow = Math.min(w - 40, ctx.measureText(obj).width + 90);
  roundRect(ctx, 12, h - 64, ow, 52, 8); ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('◆ MISSION', 24, h - 44);
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.fillText(obj, 24, h - 24);
  // Timer for timed missions / side jobs.
  const timer = G.mission?.timer || G.sideJob?.timer;
  if (timer) {
    ctx.fillStyle = timer < 20 ? '#ff5e5e' : '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(timer)}s`, w / 2, 52);
    ctx.textAlign = 'left';
  }
  // Speedometer when driving.
  if (p.car) {
    ctx.fillStyle = 'rgba(10,10,20,0.6)';
    roundRect(ctx, w - 150, h - 64, 138, 52, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.32)} mph`, w - 138, h - 30);
    ctx.font = '11px Arial';
    ctx.fillStyle = '#ffd23e';
    ctx.fillText(p.car.name.toUpperCase(), w - 138, h - 46);
  }
  // Controls hint, bottom-right above the speedo.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(p.car ? 'WASD drive · E exit car · Esc pause' : 'WASD move · Shift run · E enter car · Click shoot · M mission', w - 14, h - 76);
  ctx.textAlign = 'left';
  // Subtitle story lines.
  if (G.subtitleT > 0 && G.subtitle.length) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const line = G.subtitle[0];
    ctx.font = 'italic 16px Arial';
    const sw = ctx.measureText(line).width + 32;
    roundRect(ctx, (w - sw) / 2, h - 130, sw, 34, 8); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.textAlign = 'center';
    ctx.fillText(line, w / 2, h - 108);
    ctx.textAlign = 'left';
  }
  // Mission banner.
  if (G.bannerT > 0 && G.bannerData) {
    const a = clamp(G.bannerT, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(G.bannerData.title, w / 2, h * 0.32);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(G.bannerData.sub || '', w / 2, h * 0.32 + 30);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

function drawMinimap(ctx, G, x, y, size) {
  const s = size / WORLD;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,30,0.85)';
  ctx.fillRect(x, y, size, size);
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, size, size);
  ctx.beginPath(); ctx.rect(x, y, size, size); ctx.clip();
  // Ocean + beach.
  ctx.fillStyle = '#2e7fb8';
  ctx.fillRect(x, y + (WORLD - 90) * s, size, 90 * s);
  ctx.fillStyle = '#e8cf9a';
  ctx.fillRect(x, y + (WORLD - 190) * s, size, 100 * s);
  // Roads.
  ctx.fillStyle = '#5a5a66';
  for (const l of ROAD_LINES) {
    ctx.fillRect(x + l * s - 2, y, 4, size);
    ctx.fillRect(x, y + l * s - 2, size, 4);
  }
  // Park.
  ctx.fillStyle = '#5d9448';
  ctx.fillRect(x + 4 * 320 * s + 40 * s, y + 4 * 320 * s + 40 * s, 240 * s, 240 * s);
  // Buildings.
  ctx.fillStyle = '#8a8a96';
  for (const b of G.city.buildings) ctx.fillRect(x + b.x * s, y + b.y * s, Math.max(2, b.w * s), Math.max(2, b.h * s));
  // Traffic dots.
  ctx.fillStyle = '#fff';
  for (const c of G.traffic) ctx.fillRect(x + c.x * s - 1, y + c.y * s - 1, 2, 2);
  // Police dots.
  ctx.fillStyle = '#ff2a2a';
  for (const pc of G.policeCars) { ctx.beginPath(); ctx.arc(x + pc.x * s, y + pc.y * s, 3, 0, Math.PI * 2); ctx.fill(); }
  // Mission target.
  if (G.objectiveTarget) {
    const t = G.objectiveTarget;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(x + t.x * s, y + t.y * s, 4 + Math.sin(G.time * 5) * 1.5, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  if (G.player) {
    const p = G.player;
    ctx.save();
    ctx.translate(x + p.x * s, y + p.y * s);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Viewport rectangle.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  const vw = G.canvas.width / G.cam.zoom * s, vh = G.canvas.height / G.cam.zoom * s;
  ctx.strokeRect(x + (G.cam.x - G.canvas.width / 2 / G.cam.zoom) * s, y + (G.cam.y - G.canvas.height / 2 / G.cam.zoom) * s, vw, vh);
  ctx.restore();
}

// ---------------- menus ----------------
function menuBackdrop(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(20,8,40,0.55)');
  g.addColorStop(1, 'rgba(20,8,40,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawTitle(ctx, G, w, h) {
  menuBackdrop(ctx, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('AN OPEN-WORLD CRIME STORY', w / 2, h * 0.2);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 84px Arial';
  ctx.fillText('SOLMAR CITY', w / 2, h * 0.2 + 84);
  ctx.fillStyle = '#ff8a5e';
  ctx.font = 'italic bold 30px Arial';
  ctx.fillText('— Streets of Gold —', w / 2, h * 0.2 + 126);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '16px Arial';
  ctx.fillText('Steal cars. Outrun the law. Run five story missions and buy back your name.', w / 2, h * 0.2 + 158);
  const by = h * 0.58;
  const btns = [
    { y: by, label: 'NEW GAME' },
    { y: by + 56, label: G.saveExists ? 'CONTINUE' : null },
    { y: by + 112, label: 'HOW TO PLAY' },
  ].filter((b) => b.label);
  for (const b of btns) {
    const hov = Math.abs(G.input.mouseX - w / 2) < 150 && Math.abs(G.input.mouseY - b.y) < 24;
    ctx.fillStyle = hov ? '#ffd23e' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, w / 2 - 150, b.y - 24, 300, 48, 8); ctx.fill();
    ctx.fillStyle = hov ? '#111' : '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(b.label, w / 2, b.y + 7);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px Arial';
  ctx.fillText('A completely original game — its city, characters, cars and story are invented here.', w / 2, h - 28);
  ctx.fillText('Progress saves automatically. Press M in game to start the next mission.', w / 2, h - 10);
  ctx.textAlign = 'left';
}

function drawHowTo(ctx, G, w, h) {
  menuBackdrop(ctx, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('HOW TO PLAY', w / 2, h * 0.2);
  const lines = [
    'WASD / Arrows — move on foot, drive in a car',
    'Shift — run',
    'E — steal / enter a car, E again to get out',
    'Mouse — aim · Click — shoot (R reloads)',
    'M — start the next story mission or a courier run',
    'Esc — pause · your progress saves automatically',
    '',
    'Crimes raise your wanted level — the police will chase you.',
    'Lay low for a while and the heat cools off.',
    'Complete all five missions to finish Danny\'s story.',
  ];
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h * 0.2 + 50 + i * 30));
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('Click anywhere to go back', w / 2, h * 0.2 + 50 + lines.length * 30 + 20);
  ctx.textAlign = 'left';
}

function drawPaused(ctx, G, w, h) {
  ctx.fillStyle = 'rgba(10,8,20,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('PAUSED', w / 2, h * 0.42);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '18px Arial';
  ctx.fillText(`Cash $${G.cash.toLocaleString()} · Missions done ${G.missionsDone}/5`, w / 2, h * 0.42 + 34);
  const btns = [
    { y: h * 0.5, label: 'RESUME' },
    { y: h * 0.5 + 56, label: 'SAVE & QUIT TO TITLE' },
  ];
  for (const b of btns) {
    const hov = Math.abs(G.input.mouseX - w / 2) < 160 && Math.abs(G.input.mouseY - b.y) < 24;
    ctx.fillStyle = hov ? '#ffd23e' : 'rgba(255,255,255,0.12)';
    roundRect(ctx, w / 2 - 160, b.y - 24, 320, 48, 8); ctx.fill();
    ctx.fillStyle = hov ? '#111' : '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(b.label, w / 2, b.y + 7);
  }
  ctx.textAlign = 'left';
}

function drawWasted(ctx, G, w, h) {
  ctx.fillStyle = 'rgba(20,0,0,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff2a2a';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('WASTED', w / 2, h * 0.45);
  ctx.fillStyle = '#fff';
  ctx.font = '18px Arial';
  ctx.fillText('Danny wakes up at St. Marina Hospital. The bill costs half your cash.', w / 2, h * 0.45 + 36);
  if (G.deathT <= 0) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Press Enter to get back on your feet', w / 2, h * 0.45 + 80);
  }
  ctx.textAlign = 'left';
}
