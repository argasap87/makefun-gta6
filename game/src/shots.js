// Screenshot staging: ?shot=menu|chase|city|fight sets the game up in a photogenic,
// fully-played state (real update steps, real physics) so the screenshots are honest
// renders of the game, not mock-ups. Only used when the page is opened with ?shot=.
import { makePoliceCar } from './entities.js';
import { startMission, SPOTS } from './missions.js';

function withFakeInput(G, keys, mouse, fn) {
  const inp = G.input;
  const origDown = inp.down.bind(inp);
  inp.down = (...codes) => codes.some((c) => keys.includes(c)) || origDown(...codes);
  inp.pressed = () => false;
  const origMouseDown = inp.mouseDown;
  inp.mouseDown = !!(mouse && mouse.down);
  if (mouse) { inp.mouseX = mouse.x; inp.mouseY = mouse.y; }
  try { fn(); } finally { inp.down = origDown; inp.pressed = () => false; inp.mouseDown = origMouseDown; }
}

function step(G, n, dt = 1 / 60) { for (let i = 0; i < n; i++) G.update(dt); }

export function stageShot(G, shot) {
  const w = G.canvas.width, h = G.canvas.height;
  if (shot === 'menu') {
    step(G, 40);
    return;
  }
  G.newGame();
  G.sound.enabled = false;
  if (shot === 'chase') {
    // Mission 4, "The Getaway": wanted 3, a 100-second dash to the hideout.
    startMission(G, 3, G.missionApi());
    const p = G.player;
    const car = { kind: 'player', x: 1500, y: 1423, angle: 0, speed: 360, color: '#e8c53d', name: 'Comet GT', w: 48, h: 23 };
    p.car = car; p.x = car.x; p.y = car.y; p.angle = 0;
    G.cam.x = p.x; G.cam.y = p.y;
    G.policeCars = [
      makePoliceCar(1360, 1423), makePoliceCar(1280, 1457), makePoliceCar(1420, 1389),
    ];
    for (const pc of G.policeCars) { pc.speed = 380; pc.angle = 0; }
    // A few traffic cars ahead for depth, and a pedestrian or two on the sidewalk.
    withFakeInput(G, ['KeyW'], null, () => step(G, 110));
  } else if (shot === 'city') {
    // Mission 2, "Hot Wheels": on foot downtown, the marked car waits uptown.
    startMission(G, 1, G.missionApi());
    const p = G.player;
    p.x = 1440; p.y = 1440; p.angle = Math.PI / 4;
    G.cam.x = p.x; G.cam.y = p.y;
    G.input.mouseX = w / 2 + 120; G.input.mouseY = h / 2 - 60;
    step(G, 90);
  } else if (shot === 'fight') {
    // Mission 3, "Debt Collection": mid-gunfight outside the Rusty Anchor, wanted 2.
    startMission(G, 2, G.missionApi());
    const p = G.player;
    p.x = SPOTS.bar.x; p.y = SPOTS.bar.y - 40;
    G.cam.x = p.x; G.cam.y = p.y;
    step(G, 20); // reach the bar, thugs spawn
    p.x = SPOTS.bar.x - 90; p.y = SPOTS.bar.y - 90;
    G.cam.x = p.x; G.cam.y = p.y;
    G.wanted = 2;
    step(G, 20);
    // Aim at the nearest thug and open fire for a few frames.
    const t = G.thugs[0];
    if (t) {
      const sx = w / 2 + (t.x - G.cam.x) * G.cam.zoom;
      const sy = h / 2 + (t.y - G.cam.y) * G.cam.zoom;
      withFakeInput(G, [], { x: sx, y: sy, down: true }, () => step(G, 12));
    }
    step(G, 10);
  }
  window.__shotReady = true;
}
