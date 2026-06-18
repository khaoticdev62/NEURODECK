import * as fs from 'fs';
import * as path from 'path';

export interface WalkOptions {
  skipDirs?: Set<string>;
  skipExts?: Set<string>;
}

/**
 * Recursively walk `dir` (relative to `root` or absolute) and return absolute
 * file paths, skipping directories in `skipDirs` and files whose extension is
 * in `skipExts`.
 */
export function walkDir(root: string, dir: string, options: WalkOptions = {}): string[] {
  const { skipDirs = new Set<string>(), skipExts = new Set<string>() } = options;
  const abs = path.isAbsolute(dir) ? dir : path.join(root, dir);
  if (!fs.existsSync(abs)) return [];

  const results: string[] = [];
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(abs, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(root, full, options));
    } else if (entry.isFile()) {
      if (!skipExts.has(path.extname(entry.name))) {
        results.push(full);
      }
    }
  }
  return results;
}
