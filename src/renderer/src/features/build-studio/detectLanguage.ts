const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  sql: 'sql'
}

/** Pure: maps a file path's extension to a Monaco language id, for files Monaco doesn't already infer correctly. */
export function detectLanguage(path: string): string {
  const match = /\.([^./\\]+)$/.exec(path)
  const extension = match?.[1]?.toLowerCase()
  return (extension && EXTENSION_TO_LANGUAGE[extension]) || 'plaintext'
}
