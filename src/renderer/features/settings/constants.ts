import {
  BrainCircuit,
  BookOpen,
  Cpu,
  Gamepad2,
  Package,
  Palette,
  Settings,
  Shield,
  Sliders,
  Volume2,
} from "lucide-react";

export const NAV_PANELS = [
  { key: "general", label: "General", icon: Settings },
  { key: "ai", label: "AI", icon: BrainCircuit },
  { key: "appearance", label: "Appearance", icon: Palette },
  { key: "voice", label: "Voice", icon: Volume2 },
  { key: "input", label: "Input", icon: Gamepad2 },
  { key: "performance", label: "Performance", icon: Cpu },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "extensions", label: "Extensions", icon: Sliders },
  { key: "packages", label: "Packages", icon: Package },
  { key: "privacy", label: "Privacy", icon: Shield },
] as const;

export type PanelKey = (typeof NAV_PANELS)[number]["key"];
