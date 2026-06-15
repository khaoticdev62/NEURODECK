import React, { useEffect, useRef, useCallback } from "react";
import { useTheme } from "../../theme/useTheme";

interface CanvasWallpaperRendererProps {
  wallpaperId: string;
  opacity: number;
  performanceTier: string;
  isPaused: boolean;
}

type Particle =
  | number
  | { x: number; y: number; z: number; isAccent: boolean }
  | { x: number; y: number; vx: number; vy: number; r: number }
  | { x: number; y: number; size: number; alpha: number; speed: number; label: string }
  | {
      points: Array<{ x: number; y: number }>;
      dirX: number;
      dirY: number;
      growSpeed: number;
      stepsRemaining: number;
      alpha: number;
      isAccent: boolean;
    }
  | { text: string; y: number; speed: number; alpha: number };

const LOG_LINES = [
  "[OK] Kernel initialized. Boot time: 0.342s",
  "[SYSTEM] pci 0000:00:01.0: [1002:163f] type 00 class 0x030000",
  "[DISK] sd 0:0:0:0: [sda] 1000215216 sectors (512 GB SSD)",
  "[FS] Ext4-fs (sda8): mounted filesystem with ordered data mode",
  "[DAEMON] systemd[1]: Started Steam Deck Controller Daemon",
  "[AI] neurodeck-daemon: Initializing Core connection...",
  "[AI] neurodeck-daemon: IPC channel secure (auth=keychain)",
  "[TELEMETRY] memory load stable (12.8 GB / 16.0 GB)",
  "[TELEMETRY] CPU load: 12% | GPU load: 8% | Temp: 58C",
  "[NETWORK] wlan0: connection established to LAN_DECK_GRID",
  "[TUNNEL] ssh-tunnel: tunnel service running on port 2222",
  "[DAEMON] Game Mode compositor handshake complete",
  "[DAEMON] Battery state: discharging (98% remaining)",
  "[DAEMON] Controller layout mapped: STEAM_INPUT_VDF",
];

export const CanvasWallpaperRenderer: React.FC<CanvasWallpaperRendererProps> = ({
  wallpaperId,
  opacity,
  performanceTier,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const angleRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });

  const { resolvedTokens } = useTheme();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      setupParticles(canvas.width, canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [wallpaperId]);

  const setupParticles = (w: number, h: number) => {
    particlesRef.current = [];
    angleRef.current = 0;

    if (wallpaperId === "terminal_rainfield") {
      const cols = Math.floor(w / 16) + 1;
      particlesRef.current = Array.from({ length: cols }, () => Math.random() * -h);
    } else if (wallpaperId === "oled_starfield") {
      particlesRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random() * w - w / 2,
        y: Math.random() * h - h / 2,
        z: Math.random() * w,
        isAccent: Math.random() > 0.5,
      }));
    } else if (wallpaperId === "ghost_particles") {
      particlesRef.current = Array.from({ length: 45 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      }));
    } else if (wallpaperId === "deep_space_radar") {
      particlesRef.current = Array.from({ length: 12 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 1,
        alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
        label: `TGT_${Math.floor(Math.random() * 256)
          .toString(16)
          .toUpperCase()}`,
      }));
    } else if (wallpaperId === "solar_circuit") {
      particlesRef.current = Array.from({ length: 12 }, () => makeCircuitLine(w, h));
    } else if (wallpaperId === "code_stream") {
      const lines = Math.floor(h / 20) + 2;
      particlesRef.current = Array.from({ length: lines }, (_, i) => ({
        text: LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)],
        y: i * 20 + Math.random() * 15,
        speed: 0.4 + Math.random() * 1.0,
        alpha: 0.1 + Math.random() * 0.2,
      }));
    }
  };

  const makeCircuitLine = (w: number, h: number) => {
    const angle = (Math.floor(Math.random() * 8) * Math.PI) / 4;
    return {
      points: [{ x: Math.random() * w, y: Math.random() * h }],
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      growSpeed: 1.5 + Math.random() * 1.5,
      stepsRemaining: Math.floor(Math.random() * 12) + 8,
      alpha: 1.0,
      isAccent: Math.random() > 0.4,
    };
  };

  // Stable ref so the rAF loop always calls the latest draw even after theme changes
  const drawRef = useRef<(ctx: CanvasRenderingContext2D, w: number, h: number) => void>(
    () => undefined
  );

  // Rendering loops
  useEffect(() => {
    if (isPaused) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Target FPS control
    const targetFps = performanceTier === "battery_saver" ? 30 : 60;
    const minFrameTime = 1000 / targetFps;

    const render = (time: number) => {
      const delta = time - lastTimeRef.current;
      if (delta >= minFrameTime) {
        lastTimeRef.current = time;
        drawRef.current(ctx, canvas.width, canvas.height);
      }
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [wallpaperId, isPaused, performanceTier]);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ac = resolvedTokens?.color?.accent?.primary ?? "#5EEBFF";
    const sc = resolvedTokens?.color?.state?.success ?? "#00FF88";

    if (wallpaperId === "terminal_rainfield") {
      drawMatrix(ctx, w, h, ac);
    } else if (wallpaperId === "oled_starfield") {
      drawStarfield(ctx, w, h, ac, sc);
    } else if (wallpaperId === "ghost_particles") {
      drawParticles(ctx, w, h, ac);
    } else if (wallpaperId === "tactical_signal_grid") {
      drawGrid(ctx, w, h, ac, sc);
    } else if (wallpaperId === "deep_space_radar") {
      drawRadar(ctx, w, h, ac, sc);
    } else if (wallpaperId === "solar_circuit") {
      drawCircuit(ctx, w, h, ac, sc);
    } else if (wallpaperId === "command_waveform") {
      drawWave(ctx, w, h, ac, sc);
    } else if (wallpaperId === "code_stream") {
      drawAscii(ctx, w, h, ac);
    }
  }, [resolvedTokens, wallpaperId]);

  // Keep the ref in sync so the stable rAF loop always uses the latest draw
  useEffect(() => { drawRef.current = draw; }, [draw]);

  const drawMatrix = (ctx: CanvasRenderingContext2D, w: number, h: number, ac: string) => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "14px monospace";
    const ps = particlesRef.current as number[];
    
    ctx.shadowBlur = 4;
    ctx.shadowColor = ac;

    for (let i = 0; i < ps.length; i++) {
      const y = ps[i];
      const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      
      if (Math.random() > 0.985) {
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ffffff";
        ctx.fillText(char, i * 16, y);
      } else {
        ctx.fillStyle = ac;
        ctx.shadowBlur = 4;
        ctx.shadowColor = ac;
        ctx.fillText(char, i * 16, y);
      }
      
      ps[i] += 14;
      if (ps[i] > h && Math.random() > 0.98) {
        ps[i] = 0;
      }
    }
    ctx.shadowBlur = 0;
  };

  const drawStarfield = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ac: string,
    rc: string
  ) => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const speed = performanceTier === "battery_saver" ? 2 : 4;
    
    angleRef.current = (angleRef.current + 0.002) % (Math.PI * 2);
    const nebulaX1 = cx + Math.cos(angleRef.current) * (w * 0.15);
    const nebulaY1 = cy + Math.sin(angleRef.current) * (h * 0.15);
    const nebulaX2 = cx - Math.cos(angleRef.current * 1.3) * (w * 0.12);
    const nebulaY2 = cy - Math.sin(angleRef.current * 1.3) * (h * 0.12);

    const grad1 = ctx.createRadialGradient(nebulaX1, nebulaY1, 10, nebulaX1, nebulaY1, w * 0.45);
    grad1.addColorStop(0, ac + "0c");
    grad1.addColorStop(1, "transparent");
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    const grad2 = ctx.createRadialGradient(nebulaX2, nebulaY2, 10, nebulaX2, nebulaY2, w * 0.4);
    grad2.addColorStop(0, rc + "08");
    grad2.addColorStop(1, "transparent");
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, w, h);

    const ps = particlesRef.current as Array<{ x: number; y: number; z: number; isAccent: boolean }>;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    for (const star of ps) {
      const px = (star.x / star.z) * cx + cx;
      const py = (star.y / star.z) * cy + cy;

      star.z -= speed;

      if (star.z <= 0) {
        star.x = Math.random() * w - cx;
        star.y = Math.random() * h - cy;
        star.z = w;
        continue;
      }

      let nx = (star.x / star.z) * cx + cx;
      let ny = (star.y / star.z) * cy + cy;

      if (mx > 0 && my > 0) {
        const dx = nx - mx;
        const dy = ny - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const pushForce = (150 - dist) / 150 * 15;
          nx += (dx / (dist || 1)) * pushForce;
          ny += (dy / (dist || 1)) * pushForce;
        }
      }

      if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
        const alpha = 1 - star.z / w;
        ctx.strokeStyle = star.isAccent ? ac : rc;
        ctx.lineWidth = alpha * 2.2;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawParticles = (ctx: CanvasRenderingContext2D, w: number, h: number, ac: string) => {
    ctx.clearRect(0, 0, w, h);
    const ps = particlesRef.current as Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
    }>;
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;

    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      p.x = Math.max(0, Math.min(w, p.x));
      p.y = Math.max(0, Math.min(h, p.y));

      if (mx > 0 && my > 0) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = ((150 - dist) / 150) * 1.8;
          p.x += (dx / (dist || 1)) * force;
          p.y += (dy / (dist || 1)) * force;
        }
      }

      ctx.fillStyle = ac;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = ac;
    ctx.lineWidth = 0.7;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const dx = ps[i].x - ps[j].x;
        const dy = ps[i].y - ps[j].y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 14400) {
          const dist = Math.sqrt(distSq);
          ctx.globalAlpha = (1 - dist / 120) * 0.12;
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawGrid = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ac: string,
    rc: string
  ) => {
    ctx.clearRect(0, 0, w, h);

    const mx = mouseRef.current.x > 0 ? mouseRef.current.x : w / 2;
    const my = mouseRef.current.y > 0 ? mouseRef.current.y : h / 2;

    const horizonShiftX = (mx - w / 2) * 0.12;
    const horizonShiftY = (my - h / 2) * 0.08;

    const horizon = h * 0.45 + horizonShiftY;
    const gh = h - horizon;

    angleRef.current = (angleRef.current + 0.6) % 40;

    const g = ctx.createLinearGradient(0, horizon - 80, 0, horizon + 80);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, rc + "15");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 80, w, 160);

    ctx.strokeStyle = rc;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    const cx = w / 2 + horizonShiftX;
    const linesCount = 24;
    ctx.strokeStyle = ac;
    ctx.lineWidth = 1;
    for (let i = -6; i <= linesCount + 6; i++) {
      const xTop = (w / linesCount) * i;
      const xBottom = cx + (xTop - cx) * 3.5;
      ctx.globalAlpha = 0.07;
      ctx.beginPath();
      ctx.moveTo(xTop, horizon);
      ctx.lineTo(xBottom, h);
      ctx.stroke();
    }

    const horizLines = 10;
    for (let i = 0; i < horizLines; i++) {
      const ratio = (i + angleRef.current / 40) / horizLines;
      const y = horizon + Math.pow(ratio, 2.2) * gh;
      ctx.strokeStyle = ac;
      ctx.globalAlpha = Math.pow(ratio, 1.5) * 0.16;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (mouseRef.current.x > 0 && mouseRef.current.y > 0) {
      ctx.strokeStyle = ac;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.moveTo(mx - 8, my);
      ctx.lineTo(mx + 8, my);
      ctx.moveTo(mx, my - 8);
      ctx.lineTo(mx, my + 8);
      ctx.stroke();

      ctx.fillStyle = ac;
      ctx.font = "8px monospace";
      ctx.globalAlpha = 0.35;
      ctx.fillText(`SYS_LOC: [${Math.floor(mx)}, ${Math.floor(my)}]`, mx + 12, my + 3);
      ctx.fillText(`GRID_SEC: ${(mx / w * 10).toFixed(0)}-${(my / h * 10).toFixed(0)}`, mx + 12, my + 13);
    }
    ctx.globalAlpha = 1;
  };

  const drawRadar = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ac: string,
    rc: string
  ) => {
    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.75;
    const cy = h * 0.5;
    const mr = Math.min(w, h) * 0.42;

    angleRef.current = (angleRef.current + 0.005) % (Math.PI * 2);

    ctx.strokeStyle = ac;
    ctx.lineWidth = 1;
    for (let r = 60; r <= mr; r += 70) {
      ctx.globalAlpha = 0.05;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = ac;
      ctx.font = "8px monospace";
      ctx.globalAlpha = 0.15;
      ctx.fillText(`R_${r}KM`, cx + r + 4, cy - 3);
    }

    ctx.strokeStyle = ac;
    ctx.globalAlpha = 0.04;
    ctx.beginPath();
    ctx.moveTo(cx - mr, cy);
    ctx.lineTo(cx + mr, cy);
    ctx.moveTo(cx, cy - mr);
    ctx.lineTo(cx, cy + mr);
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current);
    const sweep = ctx.createRadialGradient(0, 0, 10, 0, 0, mr);
    sweep.addColorStop(0, rc + "1d");
    sweep.addColorStop(1, "transparent");
    ctx.fillStyle = sweep;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, mr, -0.5, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = ac;
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    for (let deg = 0; deg < 360; deg += 15) {
      const theta = (deg * Math.PI) / 180;
      const x1 = cx + Math.cos(theta) * mr;
      const y1 = cy + Math.sin(theta) * mr;
      const x2 = cx + Math.cos(theta) * (mr - 6);
      const y2 = cy + Math.sin(theta) * (mr - 6);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    const ps = particlesRef.current as Array<{
      x: number;
      y: number;
      size: number;
      alpha: number;
      speed: number;
      label: string;
    }>;

    for (const n of ps) {
      const dx = n.x - cx;
      const dy = n.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > mr) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * (mr - 30) + 20;
        n.x = cx + Math.cos(angle) * radius;
        n.y = cy + Math.sin(angle) * radius;
        n.alpha = Math.random();
        n.label = `TGT_${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`;
        continue;
      }

      n.alpha += n.speed;
      if (n.alpha > 1.0 || n.alpha < 0.1) {
        n.speed *= -1;
      }

      ctx.fillStyle = rc;
      ctx.globalAlpha = n.alpha * 0.45;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size + 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = rc;
      ctx.globalAlpha = n.alpha * 0.2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size + 6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = ac;
      ctx.font = "8px monospace";
      ctx.globalAlpha = n.alpha * 0.35;
      ctx.fillText(n.label, n.x + 10, n.y + 3);
      ctx.fillText(`D:${Math.floor(dist * 1.5)}KM`, n.x + 10, n.y + 11);
    }
    ctx.globalAlpha = 1;
  };

  const drawCircuit = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ac: string,
    rc: string
  ) => {
    ctx.clearRect(0, 0, w, h);

    const ps = particlesRef.current as Array<{
      points: Array<{ x: number; y: number }>;
      dirX: number;
      dirY: number;
      growSpeed: number;
      stepsRemaining: number;
      alpha: number;
      isAccent: boolean;
    }>;

    for (let i = 0; i < ps.length; i++) {
      const line = ps[i];
      
      if (line.points.length > 0 && line.stepsRemaining > 0) {
        const last = line.points[line.points.length - 1];
        line.stepsRemaining--;
        
        line.points.push({
          x: last.x + line.dirX * line.growSpeed,
          y: last.y + line.dirY * line.growSpeed,
        });

        if (line.stepsRemaining <= 0 && Math.random() > 0.75 && line.points.length < 50) {
          line.stepsRemaining = Math.floor(Math.random() * 15) + 6;
          const currentAngle = Math.atan2(line.dirY, line.dirX);
          const turn = ((Math.floor(Math.random() * 3) - 1) * Math.PI) / 4;
          const nextAngle = currentAngle + turn;
          line.dirX = Math.cos(nextAngle);
          line.dirY = Math.sin(nextAngle);
        }
      }

      if (line.points.length > 1) {
        ctx.strokeStyle = line.isAccent ? ac : rc;
        ctx.globalAlpha = line.alpha * 0.16;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let j = 1; j < line.points.length; j++) {
          ctx.lineTo(line.points[j].x, line.points[j].y);
        }
        ctx.stroke();

        const head = line.points[line.points.length - 1];
        ctx.fillStyle = line.isAccent ? ac : rc;
        ctx.globalAlpha = line.alpha * 0.4;
        ctx.fillRect(head.x - 2, head.y - 2, 4, 4);

        const start = line.points[0];
        ctx.beginPath();
        ctx.arc(start.x, start.y, 2, 0, Math.PI * 2);
        ctx.fill();

        const pulseIndex = Math.floor((1 - line.alpha) * 4 * line.points.length) % line.points.length;
        if (pulseIndex >= 0 && pulseIndex < line.points.length) {
          const pt = line.points[pulseIndex];
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = line.alpha * 0.65;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      line.alpha -= 0.0012;
      if (line.alpha <= 0 || (line.stepsRemaining <= 0 && line.alpha < 0.2)) {
        ps[i] = makeCircuitLine(w, h);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    ac: string,
    rc: string
  ) => {
    ctx.clearRect(0, 0, w, h);
    angleRef.current += 0.015;

    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const midY = h / 2;

    const waves = [
      { amplitude: 45, freq: 0.003, speed: 0.8, color: ac, opacity: 0.1 },
      { amplitude: 25, freq: 0.005, speed: 1.3, color: rc, opacity: 0.08 },
      { amplitude: 18, freq: 0.008, speed: 0.6, color: "#9333EA", opacity: 0.06 }
    ];

    for (const wave of waves) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, wave.color);
      grad.addColorStop(0.5, rc);
      grad.addColorStop(1, wave.color);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = wave.opacity;
      
      ctx.beginPath();
      ctx.moveTo(0, midY);

      for (let x = 0; x < w; x += 12) {
        let waveFlex = 1.0;
        let waveFreqShift = 0.0;
        
        if (mx > 0 && my > 0) {
          const distToMouse = Math.abs(x - mx);
          if (distToMouse < 220) {
            const factor = (220 - distToMouse) / 220;
            waveFlex = 1.0 + factor * 1.5;
            waveFreqShift = factor * 0.015;
          }
        }

        const wavePhase = angleRef.current * wave.speed;
        const waveAngle = x * (wave.freq + waveFreqShift) + wavePhase;
        const screenMarginFactor = Math.sin((x / w) * Math.PI);
        const y = midY + Math.sin(waveAngle) * wave.amplitude * waveFlex * screenMarginFactor;

        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const drawAscii = (ctx: CanvasRenderingContext2D, w: number, h: number, ac: string) => {
    ctx.fillStyle = "rgba(2, 3, 5, 0.09)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "12px Courier, monospace";
    
    const ps = particlesRef.current as Array<{
      text: string;
      y: number;
      speed: number;
      alpha: number;
    }>;

    for (const line of ps) {
      ctx.globalAlpha = line.alpha;
      
      ctx.fillStyle = ac;
      ctx.fillText(line.text, 25, line.y);

      line.y -= line.speed;
      
      if (line.y < -20) {
        line.y = h + 20;
        line.text = LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)];
        line.speed = 0.4 + Math.random() * 0.8;
        line.alpha = 0.12 + Math.random() * 0.22;
      }
    }
    ctx.globalAlpha = 1;
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 pointer-events-none h-full w-full bg-transparent transition-opacity duration-300"
      style={{ opacity: opacity / 100 }}
    />
  );
};
