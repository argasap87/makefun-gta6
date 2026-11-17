// Solmar City — bootstrap: canvas, input, game loop, screenshot staging hook.
import { Game } from './world.js';
import { Input } from './input.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const game = new Game(canvas, input);
window.__game = game;

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) stageShot(game, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  drawGame(ctx, game, canvas.width, canvas.height);
  if (!window.__shotReady) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
