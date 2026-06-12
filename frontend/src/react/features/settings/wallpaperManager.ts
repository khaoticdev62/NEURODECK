type Particle =
  | number
  | { x: number; y: number; z: number; color: string }
  | { x: number; y: number; vx: number; vy: number; r: number }
  | { x: number; y: number; size: number; alpha: number; speed: number; label: string }
  | { points: Array<{ x: number; y: number }>; dirX: number; dirY: number; growSpeed: number; stepsRemaining: number; alpha: number; color: string }
  | { text: string; y: number; speed: number; alpha: number };

const LOG_LINES = [
  '[OK] Kernel initialized. Boot time: 0.342s',
  '[SYSTEM] pci 0000:00:01.0: [1002:163f] type 00 class 0x030000',
  '[DISK] sd 0:0:0:0: [sda] 1000215216 sectors (512 GB SSD)',
  '[FS] Ext4-fs (sda8): mounted filesystem with ordered data mode',
  '[DAEMON] systemd[1]: Started Steam Deck Controller Daemon',
  '[AI] neurodeck-daemon: Initializing Gemini Core connection...',
  '[AI] neurodeck-daemon: IPC channel secure (auth=keychain)',
  '[TELEMETRY] memory load stable (12.8 GB / 16.0 GB)',
  '[TELEMETRY] CPU load: 12% | GPU load: 8% | Temp: 58C',
  '[NETWORK] wlan0: connection established to LAN_DECK_GRID',
  '[TUNNEL] ssh-tunnel: tunnel service running on port 2222',
  '[OLLAMA] Service active: listing model presets...',
  '[DAEMON] Game Mode compositor handshake complete',
  '[DAEMON] Battery state: discharging (98% remaining)',
  '[DAEMON] Controller layout mapped: STEAM_INPUT_VDF',
  '[SYSTEM] Memory pages optimized. Swap file size increased (4GB)',
  '[SECURE] Keychain initialized. Cryptographic credentials loaded.',
];

export class WallpaperManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private currentType: string | null = null;
  private particles: Particle[] = [];
  private angle = 0;
  private lastTime = 0;
  private mouseX = -9999;
  private mouseY = -9999;
  // Cached CSS variable values — read once on start/refreshColors, not every frame
  private accentColor = '#00F0FF';
  private responseColor = '#00FF88';

  private readonly loop = (time: number) => {
    if (!this.ctx || !this.canvas || !this.currentType) return;
    const delta = time - this.lastTime;
    if (delta < 33.3) { this.animationFrameId = requestAnimationFrame(this.loop); return; }
    this.lastTime = time;
    this.draw(this.canvas.width, this.canvas.height);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  init() {
    this.canvas = document.getElementById('app-background-canvas') as HTMLCanvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    window.addEventListener('resize', this.resize);
    window.addEventListener('mousemove', this.mousemove);
    this.refreshColors();
    this.resize();
  }

  refreshColors() {
    const cs = getComputedStyle(document.documentElement);
    this.accentColor = cs.getPropertyValue('--accent-color').trim() || '#00F0FF';
    this.responseColor = cs.getPropertyValue('--response-color').trim() || '#00FF88';
  }

  private readonly resize = () => {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.currentType) this.setupCanvas(this.currentType);
  };

  private readonly mousemove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('mousemove', this.mousemove);
  }

  stop() {
    if (this.animationFrameId) { cancelAnimationFrame(this.animationFrameId); this.animationFrameId = null; }
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentType = null;
    this.particles = [];
    const css = document.getElementById('app-background-css') as HTMLElement | null;
    if (css) { css.style.opacity = '0'; css.className = 'app-background-css'; }
    if (this.canvas) this.canvas.style.opacity = '0';
    const img = document.getElementById('app-background-image') as HTMLElement | null;
    if (img) img.style.opacity = '0';
    document.body.classList.remove('wallpaper-active');
  }

  start(rawType: string) {
    // Strip legacy `live:` prefix stored by gallery cards
    const type = rawType.startsWith('live:') ? rawType.slice(5) : rawType;
    const opacity = (parseFloat(localStorage.getItem('bgOpacity') ?? '10') / 100).toString();

    if (type === '' || type === 'none') { this.stop(); return; }

    const isLocalhost = type.startsWith('http://localhost') || type.startsWith('http://127.0.0.1');
    if (type.startsWith('https://') || isLocalhost) {
      this.stop();
      const img = document.getElementById('app-background-image') as HTMLImageElement | null;
      if (img) { img.src = type; img.style.opacity = opacity; }
      return;
    }

    if (this.currentType === type) {
      // Same type — just refresh opacity
      const cv = document.getElementById('app-background-canvas') as HTMLElement | null;
      const css = document.getElementById('app-background-css') as HTMLElement | null;
      if (cv && cv.style.opacity !== '0') cv.style.opacity = opacity;
      if (css && css.style.opacity !== '0') css.style.opacity = opacity;
      return;
    }

    this.stop();
    if (!this.canvas) this.init();
    this.currentType = type;
    this.lastTime = performance.now();
    this.refreshColors();

    const css = document.getElementById('app-background-css') as HTMLElement | null;
    const cv = document.getElementById('app-background-canvas') as HTMLElement | null;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (type.startsWith('css-')) {
      if (css) { css.className = `app-background-css ${type}`; css.style.opacity = opacity; }
    } else if (!prefersReducedMotion) {
      // Canvas animations skipped when user prefers reduced motion
      if (cv) { cv.style.opacity = opacity; this.setupCanvas(type); this.animationFrameId = requestAnimationFrame(this.loop); }
    } else {
      // Reduced motion: render a single static frame, do not loop
      if (cv) { cv.style.opacity = opacity; this.setupCanvas(type); this.draw(this.canvas!.width, this.canvas!.height); }
    }
    document.body.classList.add('wallpaper-active');
  }

  setOpacity(pct: number) {
    const opacity = (pct / 100).toString();
    const cv = document.getElementById('app-background-canvas') as HTMLElement | null;
    const css = document.getElementById('app-background-css') as HTMLElement | null;
    const img = document.getElementById('app-background-image') as HTMLElement | null;
    if (cv && cv.style.opacity !== '0') cv.style.opacity = opacity;
    if (css && css.style.opacity !== '0') css.style.opacity = opacity;
    if (img && img.style.opacity !== '0') img.style.opacity = opacity;
  }

  private setupCanvas(type: string) {
    if (!this.canvas) return;
    const w = this.canvas.width, h = this.canvas.height;
    this.particles = [];
    this.angle = 0;
    if (type === 'matrix') {
      const cols = Math.floor(w / 16) + 1;
      this.particles = Array.from({ length: cols }, () => Math.random() * -h);
    } else if (type === 'starfield') {
      this.particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * w - w / 2, y: Math.random() * h - h / 2,
        z: Math.random() * w,
        color: Math.random() > 0.5 ? 'var(--accent-color)' : 'var(--response-color)',
      }));
    } else if (type === 'particles') {
      this.particles = Array.from({ length: 60 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
        r: Math.random() * 2 + 1,
      }));
    } else if (type === 'radar') {
      this.particles = Array.from({ length: 15 }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        size: Math.random() * 2 + 1, alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
        label: `NODE_0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`,
      }));
    } else if (type === 'circuit') {
      this.particles = Array.from({ length: 8 }, () => this.makeCircuitLine(w, h));
    } else if (type === 'ascii') {
      const lines = Math.floor(h / 20) + 2;
      this.particles = Array.from({ length: lines }, (_, i) => ({
        text: this.randomLog(), y: i * 20 + Math.random() * 15,
        speed: 0.5 + Math.random() * 1.5, alpha: 0.15 + Math.random() * 0.35,
      }));
    }
  }

  private makeCircuitLine(w: number, h: number) {
    const angle = (Math.floor(Math.random() * 8) * Math.PI) / 4;
    return {
      points: [{ x: Math.random() * w, y: Math.random() * h }],
      dirX: Math.cos(angle), dirY: Math.sin(angle),
      growSpeed: 2 + Math.random() * 2,
      stepsRemaining: Math.floor(Math.random() * 15) + 10,
      alpha: 1.0,
      color: Math.random() > 0.4 ? 'var(--accent-color)' : 'var(--response-color)',
    };
  }

  private randomLog() { return LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)]; }

  private draw(w: number, h: number) {
    if (!this.ctx) return;
    const ac = this.accentColor;
    const rc = this.responseColor;
    const t = this.currentType;
    if      (t === 'matrix')    this.drawMatrix(w, h, ac);
    else if (t === 'starfield') this.drawStarfield(w, h, ac, rc);
    else if (t === 'particles') this.drawParticles(w, h, ac);
    else if (t === 'grid')      this.drawGrid(w, h, ac, rc);
    else if (t === 'radar')     this.drawRadar(w, h, ac, rc);
    else if (t === 'circuit')   this.drawCircuit(w, h, ac, rc);
    else if (t === 'wave')      this.drawWave(w, h, ac, rc);
    else if (t === 'ascii')     this.drawAscii(w, h, ac);
  }

  private drawMatrix(w: number, h: number, ac: string) {
    const ctx = this.ctx!;
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, 0, w, h);
    ctx.font = '14px monospace';
    for (let i = 0; i < this.particles.length; i++) {
      const y = this.particles[i] as number;
      const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      ctx.fillStyle = '#ffffff'; ctx.fillText(char, i * 16, y);
      ctx.fillStyle = ac; ctx.fillText(char, i * 16, y - 14);
      (this.particles[i] as number) += 14;
      if ((this.particles[i] as number) > h && Math.random() > 0.98) this.particles[i] = 0;
    }
  }

  private drawStarfield(w: number, h: number, ac: string, rc: string) {
    const ctx = this.ctx!;
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, speed = 4;
    for (const star of this.particles as Array<{ x: number; y: number; z: number; color: string }>) {
      const px = (star.x / star.z) * cx + cx, py = (star.y / star.z) * cy + cy;
      star.z -= speed;
      if (star.z <= 0) { star.x = Math.random() * w - cx; star.y = Math.random() * h - cy; star.z = w; continue; }
      const nx = (star.x / star.z) * cx + cx, ny = (star.y / star.z) * cy + cy;
      if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
        const alpha = 1 - star.z / w;
        ctx.strokeStyle = star.color.includes('accent') ? ac : rc;
        ctx.lineWidth = alpha * 2; ctx.globalAlpha = alpha;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(w: number, h: number, ac: string) {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, w, h);
    for (const p of this.particles as Array<{ x: number; y: number; vx: number; vy: number; r: number }>) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      if (this.mouseX > 0 && this.mouseY > 0) {
        const dx = p.x - this.mouseX, dy = p.y - this.mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) { const f = (120 - dist) / 120; p.x += (dx / dist) * f * 2; p.y += (dy / dist) * f * 2; }
      }
      ctx.fillStyle = ac; ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = ac;
    ctx.lineWidth = 0.8;
    const ps = this.particles as Array<{ x: number; y: number; r: number; vx: number; vy: number }>;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 10000) { // 100² — avoid sqrt for distant pairs
        ctx.globalAlpha = ((100 - Math.sqrt(distSq)) / 100) * 0.15;
        ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawGrid(w: number, h: number, ac: string, rc: string) {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, w, h);
    const horizon = h * 0.45, gh = h - horizon;
    this.angle = (this.angle + 0.8) % 40;
    const g = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 50);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.5, rc + '1a'); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, horizon - 50, w, 100);
    ctx.strokeStyle = rc; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, horizon); ctx.lineTo(w, horizon); ctx.stroke();
    for (let i = 0; i <= 30; i++) {
      const xTop = (w / 30) * i, xBottom = w / 2 + (xTop - w / 2) * 3;
      ctx.strokeStyle = ac; ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.moveTo(xTop, horizon); ctx.lineTo(xBottom, h); ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const ratio = (i + this.angle / 40) / 12, y = horizon + Math.pow(ratio, 2.5) * gh;
      ctx.strokeStyle = ac; ctx.globalAlpha = Math.pow(ratio, 1.5) * 0.25; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawRadar(w: number, h: number, ac: string, rc: string) {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.75, cy = h * 0.6, mr = Math.min(w, h) * 0.45;
    this.angle = (this.angle + 0.005) % (Math.PI * 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.angle);
    const sweep = ctx.createRadialGradient(0, 0, 10, 0, 0, mr);
    sweep.addColorStop(0, rc + '33'); sweep.addColorStop(1, 'transparent');
    ctx.fillStyle = sweep; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, mr, -0.4, 0); ctx.lineTo(0, 0); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = ac; ctx.lineWidth = 1;
    for (let r = 50; r <= mr; r += 80) {
      ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.2; ctx.fillStyle = ac; ctx.font = '8px monospace';
      ctx.fillText(`R_${r}KM`, cx + r + 3, cy - 3);
    }
    ctx.strokeStyle = ac; ctx.globalAlpha = 0.06; ctx.beginPath();
    ctx.moveTo(cx - mr, cy); ctx.lineTo(cx + mr, cy); ctx.moveTo(cx, cy - mr); ctx.lineTo(cx, cy + mr); ctx.stroke();
    for (const n of this.particles as Array<{ x: number; y: number; size: number; alpha: number; speed: number; label: string }>) {
      n.alpha += n.speed; if (n.alpha > 1 || n.alpha < 0) n.speed *= -1;
      ctx.fillStyle = rc; ctx.globalAlpha = n.alpha * 0.3; ctx.beginPath(); ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ac; ctx.globalAlpha = n.alpha * 0.2; ctx.font = '8px monospace'; ctx.fillText(n.label, n.x + 6, n.y + 3);
    }
    ctx.globalAlpha = 1;
  }

  private drawCircuit(w: number, h: number, ac: string, rc: string) {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 1.2;
    const resolve = (c: string) => c.startsWith('var') ? (c.includes('accent') ? ac : rc) : c;
    for (let i = 0; i < this.particles.length; i++) {
      const line = this.particles[i] as { points: Array<{ x: number; y: number }>; dirX: number; dirY: number; growSpeed: number; stepsRemaining: number; alpha: number; color: string };
      if (line.points.length > 0 && line.stepsRemaining > 0) {
        const last = line.points[line.points.length - 1];
        line.stepsRemaining--;
        line.points.push({ x: last.x + line.dirX * line.growSpeed, y: last.y + line.dirY * line.growSpeed });
        if (line.stepsRemaining <= 0 && Math.random() > 0.3 && line.points.length < 80) {
          line.stepsRemaining = Math.floor(Math.random() * 15) + 10;
          const a = (Math.floor(Math.random() * 8) * Math.PI) / 4;
          line.dirX = Math.cos(a); line.dirY = Math.sin(a);
        }
      }
      if (line.points.length > 1) {
        ctx.strokeStyle = resolve(line.color); ctx.globalAlpha = line.alpha * 0.15;
        ctx.beginPath(); ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let j = 1; j < line.points.length; j++) ctx.lineTo(line.points[j].x, line.points[j].y);
        ctx.stroke();
        const head = line.points[line.points.length - 1];
        ctx.fillStyle = resolve(line.color); ctx.globalAlpha = line.alpha * 0.4;
        ctx.beginPath(); ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      line.alpha -= 0.001;
      if (line.alpha <= 0 || (line.points.length >= 80 && line.stepsRemaining <= 0)) this.particles[i] = this.makeCircuitLine(w, h);
    }
    ctx.globalAlpha = 1;
  }

  private drawWave(w: number, h: number, ac: string, rc: string) {
    const ctx = this.ctx!;
    ctx.clearRect(0, 0, w, h);
    this.angle += 0.02;
    for (const cfg of [
      { amp: 40, freq: 0.003, phase: this.angle,       color: ac,        opacity: 0.1  },
      { amp: 25, freq: 0.005, phase: this.angle * 1.5,  color: rc,        opacity: 0.08 },
      { amp: 15, freq: 0.008, phase: this.angle * 0.8,  color: '#A855F7', opacity: 0.06 },
    ]) {
      ctx.strokeStyle = cfg.color; ctx.lineWidth = 1.5; ctx.globalAlpha = cfg.opacity;
      const midY = h / 2 + Math.sin(cfg.phase * 0.2) * 50;
      ctx.beginPath(); ctx.moveTo(0, midY);
      for (let x = 0; x < w; x += 10) ctx.lineTo(x, midY + Math.sin(x * cfg.freq + cfg.phase) * cfg.amp * Math.sin((x / w) * Math.PI));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawAscii(w: number, h: number, ac: string) {
    const ctx = this.ctx!;
    ctx.fillStyle = '#020305'; ctx.fillRect(0, 0, w, h);
    ctx.font = '12px monospace'; ctx.fillStyle = ac;
    for (const line of this.particles as Array<{ text: string; y: number; speed: number; alpha: number }>) {
      ctx.globalAlpha = line.alpha; ctx.fillText(line.text, 15, line.y);
      line.y -= line.speed;
      if (line.y < -20) { line.y = h + 20; line.text = this.randomLog(); line.speed = 0.5 + Math.random() * 1.5; line.alpha = 0.15 + Math.random() * 0.35; }
    }
    ctx.globalAlpha = 1;
  }
}

export const wallpaperManager = new WallpaperManager();
