/*  GraphEngine  —  tek kanvaslı modül (Geliştirilmiş Sürüm)       */
/*  Kullanım:  const eng = new GraphEngine(canvas); eng.render(graphArray); */

import * as math from 'https://cdn.jsdelivr.net/npm/mathjs@11.11.0/+esm';

export class GraphEngine {
  constructor(canvas, scale = 40) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.scaleX  = this.scaleY = scale;
    this.gridCache = null;
    
    // Performans için optimize edilmiş ayarlar
    this.renderSettings = {
      explicitSteps: 2000,     // Daha smooth çizgiler için artırıldı
      implicitTolerance: 0.03, // Daha hassas implicit çizim
      implicitStep: 1.5,       // Daha yoğun nokta örnekleme
      enableSmoothing: true,   // Anti-aliasing
      enableGrid: true,
      enableAxisLabels: true
    };
  }

  static detectGraphType(exprStr) {
    exprStr = exprStr.replace(/\s+/g, "");

    // Gelişmiş eşitsizlik tespiti
    const inequalityPattern = /[<>]=?|≤|≥|and|or|\&\&|\|\||∧|∨/;
    if (inequalityPattern.test(exprStr)) return "implicit";

    // Parametrik fonksiyon tespiti (gelecek için)
    if (exprStr.includes("t") && (exprStr.includes("x(t)") || exprStr.includes("y(t)"))) {
      return "parametric";
    }

    // Mevcut tespit mantığı
    if (exprStr.startsWith("y=")) return "explicit";
    if (exprStr.includes("y") && exprStr.includes("x")) return "implicit";
    if (exprStr.includes("x")) return "explicit";

    return "implicit";
  }

  /* ============ Yardımcı (Performans optimizasyonu ile) ============ */
  px(x) { return this.canvas.width / 2 + x * this.scaleX; }
  py(y) { return this.canvas.height / 2 - y * this.scaleY; }
  
  clear() { 
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.gridCache = null;
  }

  /* ============ Gelişmiş Izgara + Eksen ============ */
  drawGrid() {
    if (!this.renderSettings.enableGrid) return;
    
    // Grid cache kontrolü (performans için)
    if (this.gridCache && 
        this.gridCache.width === this.canvas.width && 
        this.gridCache.height === this.canvas.height) {
      return;
    }

    const { ctx, canvas, scaleX, scaleY } = this;
    
    // Ana grid çizgileri
    ctx.strokeStyle = '#e8dcc0'; 
    ctx.lineWidth = 0.5;
    
    // Dikey çizgiler
    for (let x = canvas.width/2 % scaleX; x < canvas.width; x += scaleX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Yatay çizgiler
    for (let y = canvas.height/2 % scaleY; y < canvas.height; y += scaleY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Ana grid çizgileri (5'in katları için koyu)
    ctx.strokeStyle = '#d8c7a3';
    ctx.lineWidth = 1;
    
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    
    for (let i = -20; i <= 20; i++) {
      if (i % 5 === 0 && i !== 0) {
        let x = centerX + i * scaleX;
        if (x >= 0 && x <= canvas.width) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        
        let y = centerY - i * scaleY;
        if (y >= 0 && y <= canvas.height) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }
    }

    this.gridCache = { width: canvas.width, height: canvas.height };
  }

  drawAxes() {
    const { ctx, canvas } = this;
    ctx.strokeStyle = '#8b6f3e'; 
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);        // x-ekseni
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 0);         // y-ekseni
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    // Eksen etiketleri
    if (this.renderSettings.enableAxisLabels) {
      this.drawAxisLabels();
    }
    
    ctx.lineWidth = 1;
  }

  drawAxisLabels() {
    const { ctx, canvas, scaleX, scaleY } = this;
    ctx.fillStyle = '#6b5641';
    ctx.font = '11px "Libre Baskerville", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // X ekseni etiketleri
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    
    for (let i = -10; i <= 10; i++) {
      if (i !== 0 && i % 2 === 0) {
        let x = centerX + i * scaleX;
        if (x >= 20 && x <= canvas.width - 20) {
          ctx.fillText(i.toString(), x, centerY + 8);
        }
      }
    }

    // Y ekseni etiketleri
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = -8; i <= 8; i++) {
      if (i !== 0 && i % 2 === 0) {
        let y = centerY - i * scaleY;
        if (y >= 20 && y <= canvas.height - 20) {
          ctx.fillText(i.toString(), centerX - 8, y);
        }
      }
    }
  }

  /* ============ Gelişmiş Explicit Rendering ============ */
  drawExplicit(g) {
    const { ctx } = this;
    if (this.renderSettings.enableSmoothing) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    
    ctx.strokeStyle = g.color; 
    ctx.lineWidth = g.lineWidth || 2.5; 
    ctx.beginPath();
    
    let started = false; 
    const steps = this.renderSettings.explicitSteps;
    let lastValidPoint = null;
    
    for (let i = 0; i <= steps; i++) {
      const x0 = g.xmin + (g.xmax - g.xmin) * i / steps;
      let y0;
      
      try { 
        y0 = g.compiled.evaluate({ x: x0 }); 
        
        // NaN, Infinity kontrolü
        if (!isFinite(y0)) continue;
        
      } catch { continue; }
      
      // Dönüşüm uygula
      const xp = x0 * Math.cos(g.theta) - y0 * Math.sin(g.theta) + g.dx;
      const yp = x0 * Math.sin(g.theta) + y0 * Math.cos(g.theta) + g.dy;
      const px = this.px(xp), py = this.py(yp);
      
      // Süreksizlik tespiti (büyük sıçramalar)
      if (lastValidPoint && Math.abs(py - lastValidPoint.y) > 100) {
        started = false;
      }
      
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
      
      lastValidPoint = { x: px, y: py };
    }
    
    ctx.stroke(); 
    ctx.lineWidth = 1;
  }

  /* ============ Gelişmiş Implicit Rendering ============ */
  generateImplicitPoints(g) {
    const tol = this.renderSettings.implicitTolerance;
    const step = this.renderSettings.implicitStep;
    const pts = [];
    
    const pxMin = Math.max(0, this.px(g.xmin));
    const pxMax = Math.min(this.canvas.width, this.px(g.xmax));
    
    for (let px = pxMin; px <= pxMax; px += step) {
      for (let py = 0; py <= this.canvas.height; py += step) {
        const x = (px - this.canvas.width / 2) / this.scaleX;
        const y = (this.canvas.height / 2 - py) / this.scaleY;
        
        let v;
        try { 
          v = g.compiled.evaluate({ x, y }); 
          if (!isFinite(v)) continue;
        } catch { continue; }
        
        if (Math.abs(v) < tol) {
          pts.push([x, y]);
        }
      }
    }
    
    g.path = pts;
  }

  drawImplicit(g) {
    if (!g.path) this.generateImplicitPoints(g);
    
    const { ctx } = this;
    ctx.fillStyle = g.color;
    const pointSize = g.pointSize || 2;
    
    g.path.forEach(([x, y]) => {
      const xr = x * Math.cos(g.theta) - y * Math.sin(g.theta) + g.dx;
      const yr = x * Math.sin(g.theta) + y * Math.cos(g.theta) + g.dy;
      const px = this.px(xr);
      const py = this.py(yr);
      
      // Daha yumuşak noktalar için circle kullan
      ctx.beginPath();
      ctx.arc(px, py, pointSize/2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  /* ============ Ana render (Optimized) ============ */
  render(graphs) {
    // Canvas temizleme
    this.clear(); 
    
    // Grid ve eksenler
    this.drawGrid(); 
    this.drawAxes();
    
    // Grafikleri çiz (explicit önce, daha smooth görünüm için)
    const explicitGraphs = graphs.filter(g => g.type === 'explicit');
    const implicitGraphs = graphs.filter(g => g.type === 'implicit');
    
    explicitGraphs.forEach(g => this.drawExplicit(g));
    implicitGraphs.forEach(g => this.drawImplicit(g));
  }

  /* ============ Gelişmiş grafik derleme ============ */
  static compileGraph({ type, expr, color, xmin = -10, xmax = 10, lineWidth = 2.5, pointSize = 2 }) {
    try {
      const cleanExpr = type === 'explicit' ? expr.replace(/^y\s*=\s*/, '') : expr;
      const compiled = math.compile(cleanExpr);
      
      return {
        type,
        expr,
        color: color || '#b00',
        xmin, 
        xmax,
        lineWidth,
        pointSize,
        dx: 0, 
        dy: 0, 
        theta: 0,
        compiled,
        path: undefined,
        isValid: true
      };
    } catch (error) {
      console.warn('Graf derleme hatası:', error);
      return {
        type,
        expr,
        color: color || '#b00',
        xmin, xmax,
        isValid: false,
        error: error.message
      };
    }
  }

  // Yardımcı: Canvas'ı resim olarak export et
  exportAsImage() {
    return this.canvas.toDataURL('image/png');
  }

  // Yardımcı: Render ayarlarını güncelle
  updateSettings(newSettings) {
    Object.assign(this.renderSettings, newSettings);
    this.gridCache = null; // Cache'i temizle
  }
}
