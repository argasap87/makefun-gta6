// Solmar City — the game itself: state, update loop, driving, combat, wanted level,
// police response, pickups, saving. Rendering lives in render.js, missions in missions.js.
import { WORLD, TUNING, SAVE_KEY } from './config.js';
import { mulberry32, clamp, dist2, angleDiff, range } from './random.js';
import { buildCity, hitBuilding, nearestRoadPoint } from './city.js';
import {
  makeTrafficCar, makePedestrian, makePoliceCar, makeCop, makeThug,
  updateTraffic, updatePedestrian, updatePoliceCar, updateCop, updateBullet, spawnParticles,
} from './entities.js';
import { MISSIONS, HIDEOUT, SPOTS, startMission, updateMission, failMission, startSideJob } from './missions.js';
import { Sound } from './audio.js';

export class Game {
  constructor(canvas, input) {
    this.canvas = canvas; this.input = input;
    this.sound = new Sound();
    this.rng = mulberry32(20261117);
    this.city = buildCity(20261117);
    this.state = 'title'; // title | playing | paused | wasted | howto
    this.time = 0;
    this.cash = 250;
    this.missionsDone = 0;
    this.storyDone = false;
    this.wanted = 0;
    this.wantedCooldown = 0;
    this.crimeTimer = 0;
    this.player = null;
    this.traffic = [];
    this.peds = [];
    this.policeCars = [];
    this.cops = [];
    this.thugs = [];
    this.bullets = [];
    this.particles = [];
    this.pickups = [];
    this.mission = null;
    this.sideJob = null;
    this.objective = 'Press Enter to start';
    this.objectiveTarget = null;
    this.bannerData = null; this.bannerT = 0;
    this.subtitle = []; this.subtitleT = 0;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.shake = 0;
    this.deathT = 0;
    this.flash = 0;
    this.saveExists = false;
    try { this.saveExists = !!localStorage.getItem(SAVE_KEY); } catch (e) { /* no storage */ }
    this.resetWorld();
  }

  resetWorld() {
    this.traffic = [];
    this.peds = [];
    for (let i = 0; i < 22; i++) this.traffic.push(makeTrafficCar(this.rng, i));
    for (let i = 0; i < 42; i++) this.peds.push(makePedestrian(this.rng, i, this.city));
    // A few parked cars to steal, lined up along the streets near the hideout.
    for (let i = 0; i < 8; i++) {
      const c = makeTrafficCar(this.rng, 100 + i);
      c.speed = 0; c.targetSpeed = 0; c.parked = true;
      this.traffic.push(c);
    }
    this.policeCars = []; this.cops = []; this.thugs = [];
    this.bullets = []; this.particles = [];
    this.pickups = [
      { x: 1120, y: 760, kind: 'health' }, { x: 2080, y: 1480, kind: 'health' },
      { x: 800, y: 2360, kind: 'health' }, { x: 2720, y: 2400, kind: 'health' },
      { x: 1440, y: 480, kind: 'ammo' }, { x: 2400, y: 2080, kind: 'ammo' },
    ];
  }

  newGame() {
    this.cash = 250; this.missionsDone = 0; this.storyDone = false; this.wanted = 0;
    this.resetWorld();
    this.player = {
      x: HIDEOUT.x, y: HIDEOUT.y + 60, angle: -Math.PI / 2, health: TUNING.playerHealth,
      car: null, ammo: TUNING.pistolAmmo, speed: 0, runT: 0,
    };
    this.state = 'playing';
    this.sound.ensure();
    this.banner('SOLMAR CITY', 'Streets of Gold');
    this.sayLines(['Rosa: "Danny. You are back. One job and the slate is clean — almost."']);
    this.objective = 'Press M to start the first mission';
    this.objectiveTarget = null;
    this.save();
  }

  continueGame() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!s) return this.newGame();
      this.cash = s.cash; this.missionsDone = s.missionsDone; this.storyDone = !!s.storyDone;
      this.resetWorld();
      this.player = {
        x: s.px, y: s.py, angle: -Math.PI / 2, health: s.health ?? 100,
        car: null, ammo: s.ammo ?? 12, speed: 0, runT: 0,
      };
      this.wanted = 0;
      this.state = 'playing';
      this.sound.ensure();
      this.banner('WELCOME BACK', 'Solmar City');
      this.objective = this.missionsDone < MISSIONS.length
        ? 'Press M to continue the story' : 'Free roam — press M for a courier run';
      this.objectiveTarget = null;
    } catch (e) { this.newGame(); }
  }

  save() {
    if (!this.player) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: this.cash, missionsDone: this.missionsDone, storyDone: this.storyDone,
        px: this.player.x, py: this.player.y, health: this.player.health, ammo: this.player.ammo,
      }));
      this.saveExists = true;
    } catch (e) { /* storage unavailable */ }
  }

  banner(title, sub) { this.bannerData = { title, sub }; this.bannerT = 3.2; }
  sayLines(lines) { this.subtitle = lines.slice(); this.subtitleT = 6; }

  // --- mission API (passed to missions.js) ---
  missionApi() {
    return {
      banner: (t, s) => this.banner(t, s),
      sayLines: (l) => this.sayLines(l),
      blip: () => this.sound.pickup(),
      missionDoneSound: () => this.sound.missionDone(),
      failSound: () => this.sound.fail(),
      setWanted: (n) => { this.wanted = Math.max(this.wanted, n); },
      spawnThugs: (x, y) => {
        this.thugs = [makeThug(x - 40, y), makeThug(x + 30, y - 30), makeThug(x + 50, y + 40)];
      },
      spawnMissionCar: (x, y, name, color) => {
        const c = { kind: 'mission', x, y, angle: 0, speed: 0, targetSpeed: 0, color, name, w: 48, h: 23, parked: true };
        this.traffic.push(c);
      },
      save: () => this.save(),
    };
  }

  addWanted(n, reason) {
    if (this.wantedCooldown > 0 && reason === this._lastCrime) return;
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.crimeTimer = 0;
    this.wantedCooldown = 2;
    this._lastCrime = reason;
  }

  update(dt) {
    this.time += dt;
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.subtitleT = Math.max(0, this.subtitleT - dt);
    this.wantedCooldown = Math.max(0, this.wantedCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 2);
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.state === 'title' || this.state === 'howto') { this.updateTitle(dt); this.input.endFrame(); return; }
    if (this.state === 'paused') {
      if (this.input.pressed('Escape')) this.state = 'playing';
      const click = this.input.consumeClick();
      if (click) {
        const w = this.canvas.width, h = this.canvas.height;
        if (Math.abs(click.x - w / 2) < 160 && Math.abs(click.y - h * 0.5) < 24) this.state = 'playing';
        else if (Math.abs(click.x - w / 2) < 160 && Math.abs(click.y - (h * 0.5 + 56)) < 24) {
          this.save(); this.state = 'title'; this.player = null; this.resetWorld();
        }
      }
      this.input.endFrame();
      return;
    }
    if (this.state === 'wasted') {
      this.deathT -= dt;
      if (this.deathT <= 0 && (this.input.pressed('Enter') || this.input.consumeClick())) this.respawn();
      this.input.endFrame();
      return;
    }
    this.updatePlaying(dt);
  }

  updateTitle(dt) {
    // Slow cinematic pan over the city behind the menu.
    this.cam.x = 1600 + Math.cos(this.time * 0.05) * 500;
    this.cam.y = 1600 + Math.sin(this.time * 0.04) * 500;
    this.cam.zoom = 0.55;
    const click = this.input.consumeClick();
    if (this.state === 'title') {
      const w = this.canvas.width, h = this.canvas.height;
      const by = h * 0.58;
      const btns = [
        { y: by, label: 'NEW GAME', act: 'new' },
        { y: by + 56, label: this.saveExists ? 'CONTINUE' : null, act: 'continue' },
        { y: by + 112, label: 'HOW TO PLAY', act: 'howto' },
      ].filter((b) => b.label);
      if (click) {
        for (const b of btns) {
          if (Math.abs(click.x - w / 2) < 150 && Math.abs(click.y - b.y) < 24) {
            if (b.act === 'new') this.newGame();
            else if (b.act === 'continue') this.continueGame();
            else if (b.act === 'howto') this.state = 'howto';
          }
        }
      }
      if (this.input.pressed('Enter')) this.newGame();
    } else if (this.state === 'howto') {
      if (click || this.input.pressed('Escape') || this.input.pressed('Enter')) this.state = 'title';
    }
  }

  respawn() {
    this.player.health = TUNING.playerHealth;
    this.player.x = SPOTS.hospital.x; this.player.y = SPOTS.hospital.y;
    this.player.car = null;
    this.wanted = 0;
    this.policeCars = []; this.cops = [];
    this.cash = Math.floor(this.cash / 2);
    this.state = 'playing';
    this.banner('PATCHED UP', 'St. Marina Hospital — half your cash went to the bill');
  }

  updatePlaying(dt) {
    const inp = this.input, p = this.player;
    if (inp.pressed('Escape')) { this.state = 'paused'; this.input.endFrame(); return; }
    if (inp.pressed('KeyM')) {
      if (!this.mission && this.missionsDone < MISSIONS.length) startMission(this, this.missionsDone, this.missionApi());
      else if (!this.mission) startSideJob(this, this.missionApi());
    }
    if (inp.pressed('KeyR') && !p.car) p.ammo = TUNING.pistolAmmo;

    // --- movement ---
    if (p.car) this.updateDriving(dt);
    else this.updateOnFoot(dt);

    // --- world life ---
    for (const c of this.traffic) if (!c.parked && c.kind !== 'mission') updateTraffic(c, dt, this.traffic, this.city, this.rng);
    const danger = this.bullets.length ? this.bullets[0] : null;
    for (const ped of this.peds) updatePedestrian(ped, dt, this.city, danger, this.rng);
    for (const pc of this.policeCars) updatePoliceCar(pc, dt, p.x, p.y, p.car ? Math.abs(p.car.speed) : 0);
    for (const cop of this.cops) updateCop(cop, dt, p.x, p.y, this.city);
    this.updateThugs(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.updatePickups(dt);
    this.updateWanted(dt);
    if (this.mission) updateMission(this, this.missionApi(), dt);
    if (this.sideJob) this.updateSideJob(dt);

    // --- camera ---
    const targetZoom = p.car ? 0.95 : 1.2;
    this.cam.zoom += (targetZoom - this.cam.zoom) * Math.min(1, dt * 2);
    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 5);
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 5);
    this.cam.x = clamp(this.cam.x, 0, WORLD); this.cam.y = clamp(this.cam.y, 0, WORLD);

    // --- sound ---
    this.sound.setEngine(p.car ? Math.abs(p.car.speed) / TUNING.carTopSpeed : 0, !!p.car);
    this.sound.siren(dt, this.policeCars.length > 0);
    this.sound.music(dt);

    if (p.health <= 0) {
      this.state = 'wasted'; this.deathT = 3.5;
      if (this.mission) failMission(this, this.missionApi(), 'Danny got wasted.');
      this.sound.fail();
    }
    this.input.endFrame();
  }

  updateOnFoot(dt) {
    const inp = this.input, p = this.player;
    // A click is a shot: aim at the click point even if the button is already up.
    const click = inp.consumeClick();
    if (click) { inp.mouseX = click.x; inp.mouseY = click.y; }
    const run = inp.down('ShiftLeft', 'ShiftRight');
    const sp = (run ? TUNING.runSpeed : TUNING.walkSpeed);
    let mx = (inp.down('KeyD', 'ArrowRight') ? 1 : 0) - (inp.down('KeyA', 'ArrowLeft') ? 1 : 0);
    let my = (inp.down('KeyS', 'ArrowDown') ? 1 : 0) - (inp.down('KeyW', 'ArrowUp') ? 1 : 0);
    if (mx || my) {
      const len = Math.hypot(mx, my); mx /= len; my /= len;
      const nx = p.x + mx * sp * dt, ny = p.y + my * sp * dt;
      if (!hitBuilding(this.city, nx, p.y, 10)) p.x = nx;
      if (!hitBuilding(this.city, p.x, ny, 10)) p.y = ny;
      p.x = clamp(p.x, 24, WORLD - 24); p.y = clamp(p.y, 24, WORLD - 200);
      p.runT += dt * (run ? 14 : 9);
    }
    // Aim at the mouse.
    const wx = this.cam.x + (inp.mouseX - this.canvas.width / 2) / this.cam.zoom;
    const wy = this.cam.y + (inp.mouseY - this.canvas.height / 2) / this.cam.zoom;
    p.angle = Math.atan2(wy - p.y, wx - p.x);
    // Enter a car.
    if (inp.pressed('KeyE')) {
      const car = this.nearestCar(p.x, p.y, 62, (c) => c.kind !== 'police');
      if (car) {
        if (car.kind === 'mission' && this.mission) {
          const stage = this.mission.def.stages[this.mission.stage];
          if (stage && stage.wantedOnSteal) this.addWanted(stage.wantedOnSteal, 'steal');
        } else if (!car.parked) {
          this.addWanted(1, 'steal');
          this.sayLines(['You jacked a ride — the heat is on!']);
        }
        p.car = car; car.parked = false; car.speed = 0;
        this.traffic = this.traffic.filter((c) => c !== car);
        this.sound.blip(220, 0.1, 'square', 0.15);
      }
    }
    // Shoot: held mouse button, or a single click.
    if ((inp.mouseDown || click) && p.ammo > 0) {
      if (!this._shotT || this.time - this._shotT > 0.22) {
        this._shotT = this.time;
        p.ammo--;
        this.bullets.push({ x: p.x + Math.cos(p.angle) * 20, y: p.y + Math.sin(p.angle) * 20, angle: p.angle + (Math.random() - 0.5) * 0.05, speed: 950, life: 0.55, from: 'player', dmg: TUNING.pistolDamage });
        this.sound.gunshot();
        this.shake = Math.max(this.shake, 0.15);
        this.flash = 0.25;
        spawnParticles(this.particles, p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, '#ffd23e', 4, 120);
      }
    }
  }

  updateDriving(dt) {
    const inp = this.input, p = this.player, car = p.car;
    const fwd = inp.down('KeyW', 'ArrowUp') ? 1 : 0;
    const rev = inp.down('KeyS', 'ArrowDown') ? 1 : 0;
    if (fwd) car.speed += TUNING.carAccel * dt;
    else if (rev) car.speed -= (car.speed > 0 ? TUNING.carAccel * 1.4 : TUNING.carAccel * 0.7) * dt;
    else car.speed -= car.speed * 1.6 * dt;
    car.speed = clamp(car.speed, -TUNING.carReverse, TUNING.carTopSpeed);
    const steer = (inp.down('KeyA', 'ArrowLeft') ? -1 : 0) + (inp.down('KeyD', 'ArrowRight') ? 1 : 0);
    const dir = car.speed >= 0 ? 1 : -1;
    car.angle += steer * TUNING.carTurn * dir * Math.min(1, Math.abs(car.speed) / 120) * dt;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const frontX = nx + Math.cos(car.angle) * 26, frontY = ny + Math.sin(car.angle) * 26;
    if (hitBuilding(this.city, frontX, frontY, 2)) {
      if (Math.abs(car.speed) > 240) { p.health -= 8; this.sound.crash(); spawnParticles(this.particles, frontX, frontY, '#c9c9c9', 10, 200); this.shake = 0.4; }
      car.speed *= -0.25;
    } else {
      car.x = nx; car.y = ny;
    }
    car.x = clamp(car.x, 24, WORLD - 24); car.y = clamp(car.y, 24, WORLD - 200);
    // Shove traffic cars and run over pedestrians.
    for (const o of this.traffic) {
      if (dist2(car.x, car.y, o.x, o.y) < 52 * 52) {
        o.x += Math.cos(car.angle) * 60 * dt * 4; o.y += Math.sin(car.angle) * 60 * dt * 4;
        if (Math.abs(car.speed) > 120) { car.speed *= 0.92; this.sound.crash(); }
      }
    }
    for (const ped of this.peds) {
      if (!ped.dead && dist2(car.x, car.y, ped.x, ped.y) < 34 * 34 && Math.abs(car.speed) > 60) {
        ped.dead = true; ped.deadT = 0;
        spawnParticles(this.particles, ped.x, ped.y, '#c92a2a', 14, 200);
        this.addWanted(1, 'ped');
        this.sound.crash();
      }
    }
    // Police rams.
    for (const pc of this.policeCars) {
      if (pc.ramCooldown <= 0 && dist2(car.x, car.y, pc.x, pc.y) < 50 * 50) {
        pc.ramCooldown = 1.2;
        car.speed *= 0.75; p.health -= 4;
        this.sound.crash(); this.shake = 0.5;
        spawnParticles(this.particles, car.x, car.y, '#c9c9c9', 8, 180);
      }
    }
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    if (inp.pressed('KeyE')) {
      const c = p.car;
      p.car = null; p.speed = 0;
      p.x = c.x + Math.cos(c.angle + Math.PI / 2) * 34;
      p.y = c.y + Math.sin(c.angle + Math.PI / 2) * 34;
      c.speed = 0; c.parked = true;
      this.traffic.push(c);
    }
  }

  nearestCar(x, y, maxD, filter) {
    let best = null, bd = maxD * maxD;
    for (const c of this.traffic) {
      if (filter && !filter(c)) continue;
      const d = dist2(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  updateThugs(dt) {
    const p = this.player;
    for (const t of this.thugs) {
      if (t.dead) { t.deadT += dt; continue; }
      const d = Math.sqrt(dist2(t.x, t.y, p.x, p.y));
      t.angle = Math.atan2(p.y - t.y, p.x - t.x);
      t.shootT -= dt;
      if (d > 200) {
        const nx = t.x + Math.cos(t.angle) * 120 * dt, ny = t.y + Math.sin(t.angle) * 120 * dt;
        if (!hitBuilding(this.city, nx, ny, 8)) { t.x = nx; t.y = ny; }
      } else if (t.shootT <= 0 && d < 420) {
        t.shootT = 1.3 + Math.random() * 0.8;
        this.bullets.push({ x: t.x, y: t.y, angle: t.angle + (Math.random() - 0.5) * 0.22, speed: 700, life: 0.8, from: 'thug', dmg: 9 });
        this.sound.gunshot();
      }
    }
  }

  updateBullets(dt) {
    const p = this.player;
    this.bullets = this.bullets.filter((b) => {
      if (!updateBullet(b, dt)) return false;
      if (hitBuilding(this.city, b.x, b.y, 0)) { spawnParticles(this.particles, b.x, b.y, '#888', 3, 80); return false; }
      if (b.from === 'player') {
        for (const t of [...this.thugs, ...this.cops]) {
          if (!t.dead && dist2(b.x, b.y, t.x, t.y) < 16 * 16) {
            t.health -= b.dmg;
            spawnParticles(this.particles, b.x, b.y, '#c92a2a', 6, 160);
            if (t.health <= 0) {
              t.dead = true; t.deadT = 0;
              if (t.kind === 'thug') {
                this.pickups.push({ x: t.x, y: t.y, kind: 'cash', amount: 120 });
                this.addWanted(1, 'shoot');
              } else this.addWanted(2, 'cop');
            }
            return false;
          }
        }
        for (const ped of this.peds) {
          if (!ped.dead && dist2(b.x, b.y, ped.x, ped.y) < 14 * 14) {
            ped.dead = true; ped.deadT = 0;
            spawnParticles(this.particles, b.x, b.y, '#c92a2a', 10, 180);
            this.addWanted(1, 'shoot');
            return false;
          }
        }
        for (const pc of this.policeCars) {
          if (dist2(b.x, b.y, pc.x, pc.y) < 30 * 30) {
            pc.speed *= 0.4; spawnParticles(this.particles, b.x, b.y, '#ffd23e', 5, 150);
            return false;
          }
        }
      } else if (b.from === 'thug') {
        if (!p.car && dist2(b.x, b.y, p.x, p.y) < 14 * 14) {
          p.health -= b.dmg; this.flash = 0.4; spawnParticles(this.particles, p.x, p.y, '#c92a2a', 5, 140);
          return false;
        }
      }
      return true;
    });
  }

  updateParticles(dt) {
    this.particles = this.particles.filter((pt) => {
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      return pt.life > 0;
    });
  }

  updatePickups(dt) {
    const p = this.player;
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (dist2(p.x, p.y, pk.x, pk.y) < 34 * 34) {
        pk.taken = true;
        if (pk.kind === 'health') { p.health = Math.min(100, p.health + 40); this.sayLines(['+40 health']); }
        if (pk.kind === 'ammo') { p.ammo = TUNING.pistolAmmo; this.sayLines(['Ammo refilled']); }
        if (pk.kind === 'cash') { this.cash += pk.amount; this.sayLines([`+$${pk.amount}`]); }
        this.sound.pickup();
      }
    }
    this.pickups = this.pickups.filter((pk) => !pk.taken);
  }

  updateWanted(dt) {
    const p = this.player;
    this.crimeTimer += dt;
    // Wanted decays when the player keeps clean and out of sight.
    const nearPolice = this.policeCars.some((c) => dist2(c.x, c.y, p.x, p.y) < 420 * 420)
      || this.cops.some((c) => dist2(c.x, c.y, p.x, p.y) < 300 * 300);
    if (this.wanted > 0 && this.crimeTimer > TUNING.wantedDecaySeconds && !nearPolice) {
      this.wanted--; this.crimeTimer = 0;
    }
    // Police response scales with the wanted level.
    const wantCars = this.wanted >= 1 ? Math.min(4, this.wanted) : 0;
    while (this.policeCars.length < wantCars) {
      const a = Math.random() * Math.PI * 2;
      const rp = nearestRoadPoint(p.x + Math.cos(a) * 500, p.y + Math.sin(a) * 500);
      this.policeCars.push(makePoliceCar(clamp(rp.x, 60, WORLD - 60), clamp(rp.y, 60, WORLD - 240)));
    }
    while (this.policeCars.length > wantCars) this.policeCars.pop();
    const wantCops = this.wanted >= 2 && !p.car ? Math.min(3, this.wanted - 1) : 0;
    while (this.cops.length < wantCops) {
      const a = Math.random() * Math.PI * 2;
      this.cops.push(makeCop(p.x + Math.cos(a) * 320, p.y + Math.sin(a) * 320));
    }
    while (this.cops.length > wantCops) this.cops.pop();
    // On-foot cops punch the player up close.
    for (const cop of this.cops) {
      if (!cop.dead && cop.punchT <= 0 && dist2(cop.x, cop.y, p.x, p.y) < 30 * 30) {
        cop.punchT = 1.0;
        p.health -= 10; this.flash = 0.5; this.shake = 0.4;
        this.sound.crash();
        this.addWanted(0, 'cop'); // keeps the heat fresh while fighting cops
      }
    }
  }

  updateSideJob(dt) {
    const j = this.sideJob;
    j.timer -= dt;
    if (j.timer <= 0) {
      this.sideJob = null;
      this.objective = 'Free roam — press M for a courier run';
      this.objectiveTarget = null;
      this.banner('JOB FAILED', 'The package went cold');
      return;
    }
    const p = this.player;
    const dx = p.x - j.to.x, dy = p.y - j.to.y;
    if (dx * dx + dy * dy < 90 * 90) {
      this.cash += j.reward;
      this.banner('DELIVERED', `+$${j.reward}`);
      this.sound.missionDone();
      this.sideJob = null;
      this.objective = 'Free roam — press M for a courier run';
      this.objectiveTarget = null;
      this.save();
    }
  }
}
