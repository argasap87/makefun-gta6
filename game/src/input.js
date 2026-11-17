// Keyboard + mouse input, polled by the game loop. Keys are tracked by e.code.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedSet = new Set(); // keys that went down since the last endFrame
    this.mouseX = 0; this.mouseY = 0;
    this.mouseDown = false;
    this.clicked = false;      // consumed by the loop once per frame
    this.clickX = 0; this.clickY = 0;
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressedSet.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.pressedSet.clear(); });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left; this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.mouseDown = true; this.clicked = true;
      this.clickX = this.mouseX; this.clickY = this.mouseY;
      if (e.button === 0) e.preventDefault();
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  down(...codes) { return codes.some((c) => this.keys.has(c)); }
  pressed(code) { return this.pressedSet.has(code); }
  consumeClick() {
    if (!this.clicked) return null;
    this.clicked = false;
    return { x: this.clickX, y: this.clickY };
  }
  endFrame() { this.pressedSet.clear(); }
}
