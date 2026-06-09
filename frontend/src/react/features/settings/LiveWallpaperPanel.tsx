import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Layers, MonitorPlay, SlidersHorizontal, X } from 'lucide-react';
import { wallpaperManager } from './wallpaperManager';

interface LiveBg { id: string; name: string; desc: string; preview: string }
interface StaticBg { id: string; name: string; url: string; desc: string }

const LIVE_BACKGROUNDS: LiveBg[] = [
  { id: 'matrix',    name: 'Matrix Rain',      desc: 'Digital rain streaming in accent color',         preview: 'linear-gradient(180deg,#050505 0%,rgba(0,255,136,0.15) 100%)' },
  { id: 'starfield', name: 'Starfield Warp',   desc: 'Hyperspace travel through stars',                preview: 'radial-gradient(circle,rgba(255,255,255,0.15) 10%,#050505 90%)' },
  { id: 'particles', name: 'Quantum Net',       desc: 'Drifting nodes with interactive links',          preview: 'radial-gradient(circle at 30% 20%,rgba(0,240,255,0.15) 0%,#050505 80%)' },
  { id: 'grid',      name: 'Synthwave Grid',   desc: 'Retro-futuristic perspective grid',              preview: 'linear-gradient(0deg,rgba(255,0,255,0.15) 0%,#050505 60%)' },
  { id: 'radar',     name: 'Tactical HUD',     desc: 'Military scanlines & radar telemetry',           preview: 'radial-gradient(circle,transparent 50%,rgba(0,240,255,0.1) 90%),#050505' },
  { id: 'circuit',   name: 'Cyber Circuit',    desc: 'Glowing cybernetic trace paths',                 preview: 'linear-gradient(135deg,rgba(0,255,136,0.1) 0%,#050505 100%)' },
  { id: 'wave',      name: 'Digital Wave',     desc: 'Flowing harmonic data streams',                  preview: 'linear-gradient(90deg,rgba(0,240,255,0.08) 0%,rgba(168,85,247,0.08) 100%),#050505' },
  { id: 'ascii',     name: 'Console Stream',   desc: 'Scrolling terminal kernel logs',                 preview: 'linear-gradient(180deg,#000 0%,rgba(0,255,136,0.08) 100%)' },
  { id: 'css-nebula',name: 'Cosmic Nebula',    desc: 'CSS dynamic cosmic gas clouds',                  preview: 'radial-gradient(circle at top right,rgba(168,85,247,0.2),transparent),radial-gradient(circle at bottom left,rgba(0,240,255,0.2),#050505)' },
  { id: 'css-aurora',name: 'Aurora Borealis',  desc: 'CSS hardware-accelerated polar lights',          preview: 'linear-gradient(220deg,rgba(0,255,136,0.15) 0%,rgba(0,240,255,0.15) 50%,#050505 100%)' },
];

const STATIC_BACKGROUNDS: StaticBg[] = [
  { id: 'hq-1',  name: 'Nebula Core',     url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=100&w=2560', desc: 'Ultra HD cosmic nebula' },
  { id: 'hq-2',  name: 'Neon District',   url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=100&w=2560', desc: 'Cyberpunk city street at night' },
  { id: 'hq-3',  name: 'Abstract Fluid',  url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=100&w=2560', desc: 'Dark liquid metal and glass' },
  { id: 'hq-4',  name: 'Quantum Chip',    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=100&w=2560', desc: 'Macro shot of illuminated processor' },
  { id: 'hq-5',  name: 'Data Center',     url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=100&w=2560', desc: 'Endless rows of glowing servers' },
  { id: 'hq-6',  name: 'Vaporwave Sun',   url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=100&w=2560', desc: 'Retrowave sunset over digital grid' },
  { id: 'hq-7',  name: 'Deep Ocean Base', url: 'https://images.unsplash.com/photo-1682687982501-1e5898cb4693?q=100&w=2560', desc: 'Submerged metallic structures' },
  { id: 'hq-8',  name: 'Hexagon Matrix',  url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=100&w=2560', desc: 'Glowing geometric hex patterns' },
  { id: 'hq-9',  name: 'Cyber Samurai',   url: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=100&w=2560', desc: 'Neon kanji and rain reflections' },
  { id: 'hq-10', name: 'Fractal Glass',   url: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=100&w=2560', desc: 'Shattered glowing 3D glass' },
  { id: 'hq-11', name: 'Aurora Night',    url: 'https://images.unsplash.com/photo-1531366936337-7c912a454b07?q=100&w=2560', desc: 'Vivid northern lights' },
  { id: 'hq-12', name: 'Dark Marble',     url: 'https://images.unsplash.com/photo-1600821034455-ee53151b7ea7?q=100&w=2560', desc: 'Premium black marble texture' },
  { id: 'hq-13', name: 'Synth Wave',      url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=100&w=2560', desc: 'Abstract colorful vector waves' },
  { id: 'hq-14', name: 'Void Horizon',    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=100&w=2560', desc: 'Earth curve from orbit at night' },
  { id: 'hq-15', name: 'Neon Flora',      url: 'https://images.unsplash.com/photo-1500829243541-74b676404532?q=100&w=2560', desc: 'Bioluminescent jungle leaves' },
  { id: 'hq-16', name: 'Code Rain',       url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=100&w=2560', desc: 'Classic green hacker terminal' },
  { id: 'hq-17', name: 'Fiber Optics',    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=100&w=2560', desc: 'Macro glowing fiber strands' },
  { id: 'hq-18', name: 'Galactic Core',   url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=100&w=2560', desc: 'Stunning star cluster' },
  { id: 'hq-19', name: 'Dark Carbon',     url: 'https://images.unsplash.com/photo-1596700547143-69024f2b9bf2?q=100&w=2560', desc: 'Carbon fiber sleek material' },
  { id: 'hq-20', name: 'Laser Grid',      url: 'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=100&w=2560', desc: 'Retro 80s 3D laser landscape' },
];

type Tab = 'live' | 'static';

function readStoredBg(): string { return localStorage.getItem('bgUrl') ?? ''; }
function readStoredOpacity(): number { return parseFloat(localStorage.getItem('bgOpacity') ?? '10'); }

export function LiveWallpaperPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [selectedBg, setSelectedBg] = useState<string>(readStoredBg);
  const [opacity, setOpacity] = useState<number>(readStoredOpacity);

  // Apply saved wallpaper on mount
  useEffect(() => {
    const bg = readStoredBg();
    if (bg) wallpaperManager.start(bg);
  }, []);

  const applyBackground = useCallback((bgUrl: string) => {
    setSelectedBg(bgUrl);
    localStorage.setItem('bgUrl', bgUrl);
    if (bgUrl) wallpaperManager.start(bgUrl);
    else wallpaperManager.stop();
  }, []);

  const handleOpacity = useCallback((val: number) => {
    setOpacity(val);
    localStorage.setItem('bgOpacity', val.toString());
    wallpaperManager.setOpacity(val);
  }, []);

  const clearBackground = useCallback(() => {
    setSelectedBg('');
    localStorage.removeItem('bgUrl');
    wallpaperManager.stop();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Opacity + clear row */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-neuro" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center justify-between">
            <label htmlFor="wallpaper-opacity" className="text-xs font-semibold text-slate-300">Opacity</label>
            <span className="text-xs tabular-nums text-slate-400">{opacity}%</span>
          </div>
          <input
            id="wallpaper-opacity"
            type="range"
            min={0}
            max={80}
            step={1}
            value={opacity}
            onChange={(e) => handleOpacity(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-neuro"
            aria-label="Background opacity"
          />
        </div>
        {selectedBg && (
          <button
            type="button"
            onClick={clearBackground}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-500 transition hover:border-danger/40 hover:text-danger"
            aria-label="Remove background"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.025] p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'live'}
          onClick={() => setActiveTab('live')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${activeTab === 'live' ? 'bg-neuro/15 text-neuro' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <MonitorPlay className="h-3.5 w-3.5" />
          Live Animated
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'static'}
          onClick={() => setActiveTab('static')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${activeTab === 'static' ? 'bg-neuro/15 text-neuro' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          HD Photos
        </button>
      </div>

      {/* Live backgrounds grid */}
      {activeTab === 'live' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tabpanel">
          {/* None option */}
          <button
            type="button"
            onClick={() => applyBackground('')}
            className={`flex flex-col gap-1.5 rounded-xl border p-0 text-left transition focus-visible:outline-2 focus-visible:outline-neuro ${selectedBg === '' ? 'border-neuro/50 ring-1 ring-neuro/30' : 'border-white/10 hover:border-white/20'}`}
            aria-pressed={selectedBg === ''}
          >
            <div className="flex h-16 w-full items-center justify-center rounded-t-xl bg-[#050505]">
              <Layers className="h-5 w-5 text-slate-600" />
            </div>
            <div className="px-2 pb-2">
              <p className="text-[11px] font-semibold leading-tight text-slate-300">None</p>
              <p className="text-[10px] leading-tight text-slate-600">Solid black — battery saver</p>
            </div>
          </button>

          {LIVE_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => applyBackground(`live:${bg.id}`)}
              className={`flex flex-col gap-1.5 rounded-xl border p-0 text-left transition focus-visible:outline-2 focus-visible:outline-neuro ${selectedBg === `live:${bg.id}` ? 'border-neuro/50 ring-1 ring-neuro/30' : 'border-white/10 hover:border-white/20'}`}
              aria-pressed={selectedBg === `live:${bg.id}`}
            >
              <div
                className="h-16 w-full rounded-t-xl"
                style={{ background: bg.preview }}
                aria-hidden="true"
              />
              <div className="px-2 pb-2">
                <p className="text-[11px] font-semibold leading-tight text-slate-300">{bg.name}</p>
                <p className="text-[10px] leading-tight text-slate-600">{bg.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Static backgrounds grid */}
      {activeTab === 'static' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="tabpanel">
          {STATIC_BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => applyBackground(bg.url)}
              className={`flex flex-col gap-1.5 rounded-xl border p-0 text-left transition focus-visible:outline-2 focus-visible:outline-neuro ${selectedBg === bg.url ? 'border-neuro/50 ring-1 ring-neuro/30' : 'border-white/10 hover:border-white/20'}`}
              aria-pressed={selectedBg === bg.url}
            >
              <div
                className="h-16 w-full rounded-t-xl bg-cover bg-center"
                style={{ backgroundImage: `url('${bg.url}')` }}
                aria-hidden="true"
              />
              <div className="px-2 pb-2">
                <p className="text-[11px] font-semibold leading-tight text-slate-300">{bg.name}</p>
                <p className="text-[10px] leading-tight text-slate-600">{bg.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
