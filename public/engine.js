/*  GraphEngine  –  tek kanvaslı modül           */
/*  Kullanım:  const eng = new GraphEngine(canvas); eng.render(graphArray); */

import * as math from 'https://cdn.jsdelivr.net/npm/mathjs@11.11.0/+esm';   // ⇦ math.js’i yerel kopya koyun (ya da CDN kullanın)

export class GraphEngine {
  constructor(canvas, scale = 40) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.scaleX  = this.scaleY = scale;
  }

  static detectGraphType(exprStr) {
  exprStr = exprStr.replace(/\s+/g, "");

  // Eğer eşitsizlik karakterleri içeriyorsa doğrudan implicit
  const inequalityPattern = /[<>]=?|and|or/;
  if (inequalityPattern.test(exprStr)) return "implicit";

  if (exprStr.startsWith("y=")) return "explicit";
  if (exprStr.includes("y") && exprStr.includes("x")) return "implicit";
  if (exprStr.includes("x")) return "explicit";

  return "implicit";
}

  /* ============ Yardımcı ============ */
  px(x) { return this.canvas.width / 2 + x * this.scaleX; }
  py(y) { return this.canvas.height / 2 - y * this.scaleY; }
  clear() { this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }

  /* ============ Izgara + Eksen ============ */
  drawGrid() {
    const { ctx, canvas, scaleX, scaleY } = this;
    ctx.strokeStyle = '#e2e2e2'; ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += scaleX) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); }
    for (let y = 0; y < canvas.height; y += scaleY) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }
  }
  drawAxes() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = '#c2b283'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);        // x-ekseni
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 0);         // y-ekseni
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke(); ctx.lineWidth = 1;
  }

  /* ============ Explicit ============ */
  drawExplicit(g) {
    const { ctx } = this;
    ctx.strokeStyle = g.color; ctx.lineWidth = 2; ctx.beginPath();
    let started = false; const steps = 1000;
    for (let i = 0; i <= steps; i++) {
      const x0 = g.xmin + (g.xmax - g.xmin) * i / steps;
      let y0; try { y0 = g.compiled.evaluate({ x: x0 }); } catch { continue; }
      const xp = x0 * Math.cos(g.theta) - y0 * Math.sin(g.theta) + g.dx;
      const yp = x0 * Math.sin(g.theta) + y0 * Math.cos(g.theta) + g.dy;
      const px = this.px(xp), py = this.py(yp);
      started ? ctx.lineTo(px, py) : (ctx.moveTo(px, py), started = true);
    }
    ctx.stroke(); ctx.lineWidth = 1;
  }

  /* ============ Implicit ============ */
  generateImplicitPoints(g) {
    const tol = 0.05, pts = [], { scaleX } = this;
    const pxMin = this.px(g.xmin), pxMax = this.px(g.xmax);
    for (let px = pxMin; px <= pxMax; px += 2) {
      for (let py = 0; py <= this.canvas.height; py += 2) {
        const x = (px - this.canvas.width / 2) / scaleX;
        const y = (this.canvas.height / 2 - py) / this.scaleY;
        let v; try { v = g.compiled.evaluate({ x, y }); } catch { continue; }
        if (Math.abs(v) < tol) pts.push([x, y]);
      }
    }
    g.path = pts;
  }
  drawImplicit(g) {
    if (!g.path) this.generateImplicitPoints(g);
    const { ctx } = this; ctx.fillStyle = g.color;
    g.path.forEach(([x, y]) => {
      const xr = x * Math.cos(g.theta) - y * Math.sin(g.theta) + g.dx;
      const yr = x * Math.sin(g.theta) + y * Math.cos(g.theta) + g.dy;
      ctx.fillRect(this.px(xr), this.py(yr), 2, 2);
    });
  }

  /* ============ Ana render ============ */
  render(graphs) {
    this.clear(); this.drawGrid(); this.drawAxes();
    graphs.forEach(g => g.type === 'explicit' ? this.drawExplicit(g) : this.drawImplicit(g));
  }

  /* ============ Yardım: grafiği derle ============ */
  static compileGraph({ type, expr, color, xmin, xmax }) {
    return {
      type,
      expr,
      color,
      xmin, xmax,
      dx: 0, dy: 0, theta: 0,
      compiled: math.compile(type === 'explicit' ? expr.replace(/^y=/, '') : expr),
      path: undefined
    };
  }
}
