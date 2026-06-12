import React, { useEffect, useRef } from "react";
import { useTheme } from "../../theme/useTheme";

interface CanvasWallpaperRendererProps {
  wallpaperId: string;
  opacity: number;
  performanceTier: string;
  isPaused: boolean;
}

type Particle =
  | number
  | { x: number; y: number; z: number; color: string }
  | { x: number; y: number; vx: number; vy: number; r: number }
  | { x: number; y: number; size: number; alpha: number; speed: number; label: string }
  | {
      points: Array<{ x: number; y: number }>;
      dirX: number;
      dirY: number;
      growSpeed: number;
      stepsRemaining: number;
      alpha: number;
      color: string;
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
      particlesRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * w - w / 2,
        y: Math.random() * h - h / 2,
        z: Math.random() * w,
        color: Math.random() > 0.5 ? "var(--nd-accent)" : "var(--nd-success)",
      }));
    } else if (wallpaperId === "ghost_particles") {
      particlesRef.current = Array.from({ length: 40 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 2 + 1,
      }));
    } else if (wallpaperId === "deep_space_radar") {
      particlesRef.current = Array.from({ length: 10 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 1,
        alpha: Math.random(),
        speed: 0.005 + Math.random() * 0.01,
        label: `SECTOR_${Math.floor(Math.random() * 256)
          .toString(16)
          .toUpperCase()}`,
      }));
    } else if (wallpaperId === "solar_circuit") {
      particlesRef.current = Array.from({ length: 6 }, () => makeCircuitLine(w, h));
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
      color: Math.random() > 0.4 ? "var(--nd-accent)" : "var(--nd-success)",
    };
  };

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
        draw(ctx, canvas.width, canvas.height);
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

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const ac = resolvedTokens.color.accent.primary;
    const sc = resolvedTokens.color.state.success;

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
  };

  const drawMatrix = (ctx: CanvasRenderingContext2D, w: number, h: number, ac: string) => {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "14px monospace";
    const ps = particlesRef.current as number[];
    for (let i = 0; i < ps.length; i++) {
      const y = ps[i];
      const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
      ctx.fillStyle = "#ffffff";
      ctx.fillText(char, i * 16, y);
      ctx.fillStyle = ac;
      ctx.fillText(char, i * 16, y - 14);
      ps[i] += 14;
      if (ps[i] > h && Math.random() > 0.98) ps[i] = 0;
    }
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
    const cx = w / 2,
      cy = h / 2,
      speed = 3;
    const ps = particlesRef.current as Array<{ x: number; y: number; z: number; color: string }>;
    for (const star of ps) {
      const px = (star.x / star.z) * cx + cx,
        py = (star.y / star.z) * cy + cy;
      star.z -= speed;
      if (star.z <= 0) {
        star.x = Math.random() * w - cx;
        star.y = Math.random() * h - cy;
        star.z = w;
        continue;
      }
      const nx = (star.x / star.z) * cx + cx,
        ny = (star.y / star.z) * cy + cy;
      if (nx >= 0 && nx <= w && ny >= 0 && ny <= h) {
        const alpha = 1 - star.z / w;
        ctx.strokeStyle = star.color.includes("accent") ? ac : rc;
        ctx.lineWidth = alpha * 1.5;
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
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.fillStyle = ac;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
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
    const horizon = h * 0.45,
      gh = h - horizon;
    angleRef.current = (angleRef.current + 0.6) % 40;
    const g = ctx.createLinearGradient(0, horizon - 50, 0, horizon + 50);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, rc + "10");
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, horizon - 50, w, 100);

    ctx.strokeStyle = rc;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    for (let i = 0; i <= 20; i++) {
      const xTop = (w / 20) * i,
        xBottom = w / 2 + (xTop - w / 2) * 2.5;
      ctx.strokeStyle = ac;
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.moveTo(xTop, horizon);
      ctx.lineTo(xBottom, h);
      ctx.stroke();
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
    const cx = w * 0.75,
      cy = h * 0.5,
      mr = Math.min(w, h) * 0.4;
    angleRef.current = (angleRef.current + 0.004) % (Math.PI * 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRef.current);
    const sweep = ctx.createRadialGradient(0, 0, 10, 0, 0, mr);
    sweep.addColorStop(0, rc + "22");
    sweep.addColorStop(1, "transparent");
    ctx.fillStyle = sweep;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, mr, -0.4, 0);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = ac;
    ctx.globalAlpha = 0.05;
    ctx.beginPath();
    ctx.arc(cx, cy, mr, 0, Math.PI * 2);
    ctx.stroke();
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
      color: string;
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
      }
      if (line.points.length > 1) {
        ctx.strokeStyle = line.color.includes("accent") ? ac : rc;
        ctx.globalAlpha = line.alpha * 0.12;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let j = 1; j < line.points.length; j++) {
          ctx.lineTo(line.points[j].x, line.points[j].y);
        }
        ctx.stroke();
      }
      line.alpha -= 0.001;
      if (line.alpha <= 0) {
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
    ctx.strokeStyle = ac;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.06;
    const midY = h / 2;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    for (let x = 0; x < w; x += 10) {
      ctx.lineTo(
        x,
        midY + Math.sin(x * 0.004 + angleRef.current) * 30 * Math.sin((x / w) * Math.PI)
      );
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawAscii = (ctx: CanvasRenderingContext2D, w: number, h: number, ac: string) => {
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = "12px monospace";
    ctx.fillStyle = ac;
    const ps = particlesRef.current as Array<{
      text: string;
      y: number;
      speed: number;
      alpha: number;
    }>;
    for (const line of ps) {
      ctx.globalAlpha = line.alpha;
      ctx.fillText(line.text, 20, line.y);
      line.y -= line.speed;
      if (line.y < -20) {
        line.y = h + 20;
        line.text = LOG_LINES[Math.floor(Math.random() * LOG_LINES.length)];
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
