export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
  lang: string;
  lspVersion: number;
}

export function getLanguage(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    jsx: "jsx",
    tsx: "tsx",
    rs: "rust",
    py: "python",
    lua: "lua",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    toml: "toml",
    yaml: "yaml",
    yml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    rb: "ruby",
    php: "php",
    sql: "sql",
    dockerfile: "dockerfile",
  };
  return map[ext] || "text";
}

export function getLangIcon(lang: string) {
  const map: Record<string, string> = {
    rust: "🦀",
    javascript: "📜",
    typescript: "📘",
    python: "🐍",
    lua: "🌙",
    html: "🌐",
    css: "🎨",
    json: "📋",
    markdown: "📝",
    bash: "💲",
    go: "🐹",
    java: "☕",
    c: "🔧",
    cpp: "🔧",
  };
  return map[lang] || "📄";
}

export function fileUri(path: string): string {
  return `file:///${path.replace(/\\/g, "/")}`;
}

export function supportsLspLanguage(language: string) {
  return language !== "text";
}
