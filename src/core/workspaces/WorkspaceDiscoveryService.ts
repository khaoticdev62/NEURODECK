import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import type {
  DiscoveredWorkspace,
  WorkspaceDiscoveryOptions,
  WorkspaceDiscoverySource
} from '@shared/contracts'
import type { GitService } from '../git/GitService'
import type { RemoteHostStore } from '../remote/RemoteHostStore'

const PROJECT_MARKERS = new Set([
  '.git',
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'requirements.txt',
  'poetry.lock',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'CMakeLists.txt',
  'Makefile',
  'README.md',
  'composer.json',
  'Gemfile',
  'Podfile',
  'pubspec.yaml',
  'stack.yaml',
  'mix.exs',
  'flake.nix',
  'shell.nix',
  'default.nix'
])

const MAX_GIT_DEPTH = 2

function defaultSteamAppsRoots(): string[] {
  const home = homedir()
  switch (platform()) {
    case 'linux':
      return [
        join(home, '.steam', 'steam', 'steamapps'),
        join(home, '.local', 'share', 'Steam', 'steamapps')
      ]
    case 'darwin':
      return [join(home, 'Library', 'Application Support', 'Steam', 'steamapps')]
    case 'win32':
      return [join('C:', 'Program Files (x86)', 'Steam', 'steamapps')]
    default:
      return []
  }
}

function defaultMountRoots(): string[] {
  switch (platform()) {
    case 'linux':
      return ['/media', '/run/media', '/mnt']
    case 'darwin':
      return ['/Volumes']
    default:
      return []
  }
}

/**
 * Read-only, bounded workspace discovery across local filesystem, Git,
 * saved SSH hosts, removable storage, and Steam libraries.
 *
 * All returned paths are resolved via `realpath` and deduplicated. Errors on
 * individual directories are swallowed and surfaced as empty results for that
 * source rather than failing the whole discovery.
 */
export class WorkspaceDiscoveryService {
  constructor(
    private gitService: GitService,
    private remoteHostStore: RemoteHostStore,
    private defaults: {
      homeDir?: string
      steamAppsRoots?: string[]
      mountRoots?: string[]
    } = {}
  ) {}

  async discover(options: WorkspaceDiscoveryOptions = {}): Promise<DiscoveredWorkspace[]> {
    const sources = options.sources ?? ALL_SOURCES
    const existingPaths = new Set<string>()
    const byRealPath = new Map<string, DiscoveredWorkspace>()

    const selected = new Set(sources)

    const promises: Promise<DiscoveredWorkspace[]>[] = []
    if (selected.has('home')) {
      promises.push(
        this.discoverHomeProjects(options.homeDir ?? this.defaults.homeDir ?? homedir())
      )
    }
    if (selected.has('git')) {
      promises.push(
        this.discoverGitRepos(options.homeDir ?? this.defaults.homeDir ?? homedir(), MAX_GIT_DEPTH)
      )
    }
    if (selected.has('ssh')) {
      promises.push(this.discoverSshHosts())
    }
    if (selected.has('removable')) {
      promises.push(
        this.discoverRemovable(
          options.mountRoots ?? this.defaults.mountRoots ?? defaultMountRoots()
        )
      )
    }
    if (selected.has('steam')) {
      promises.push(
        this.discoverSteam(
          options.steamAppsRoots ?? this.defaults.steamAppsRoots ?? defaultSteamAppsRoots()
        )
      )
    }

    const results = await Promise.all(promises)
    for (const sourceResults of results) {
      for (const item of sourceResults) {
        try {
          const resolved = await realpath(item.rootPath)
          if (existingPaths.has(resolved)) continue
          existingPaths.add(resolved)
          byRealPath.set(resolved, { ...item, rootPath: resolved })
        } catch {
          // If we cannot resolve the path, keep the original entry but still
          // deduplicate by its raw value so we do not return duplicates.
          if (existingPaths.has(item.rootPath)) continue
          existingPaths.add(item.rootPath)
          byRealPath.set(item.rootPath, item)
        }
      }
    }

    return Array.from(byRealPath.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  private async discoverHomeProjects(homeDir: string): Promise<DiscoveredWorkspace[]> {
    const items: DiscoveredWorkspace[] = []
    try {
      const names = await readdir(homeDir)
      for (const name of names) {
        if (typeof name !== 'string') continue
        if (name.startsWith('.') || name === 'node_modules') continue
        const rootPath = join(homeDir, name)
        let isDir = false
        try {
          const info = await stat(rootPath)
          isDir = info.isDirectory()
        } catch {
          continue
        }
        if (!isDir) continue
        const hasMarker = await this.hasProjectMarker(rootPath)
        if (hasMarker) {
          items.push({
            id: `home-${rootPath}`,
            name,
            rootPath,
            source: 'home',
            reachable: true
          })
        }
      }
    } catch {
      // Home directory may be unreadable in restricted environments.
    }
    return items
  }

  private async discoverGitRepos(root: string, maxDepth: number): Promise<DiscoveredWorkspace[]> {
    const items: DiscoveredWorkspace[] = []
    await this.walkForGit(root, 0, maxDepth, items)
    return items
  }

  private async walkForGit(
    dir: string,
    depth: number,
    maxDepth: number,
    out: DiscoveredWorkspace[]
  ): Promise<void> {
    if (depth > maxDepth) return
    let names: string[] = []
    try {
      names = await readdir(dir)
    } catch {
      return
    }
    for (const name of names) {
      if (typeof name !== 'string') continue
      if (name === 'node_modules' || name === '.git') continue
      const child = join(dir, name)
      let isDir = false
      try {
        const info = await stat(child)
        isDir = info.isDirectory()
      } catch {
        continue
      }
      if (!isDir) continue
      if (await this.isGitRepo(child)) {
        out.push({
          id: `git-${child}`,
          name,
          rootPath: child,
          source: 'git',
          reachable: true
        })
      } else if (depth < maxDepth) {
        await this.walkForGit(child, depth + 1, maxDepth, out)
      }
    }
  }

  private async discoverSshHosts(): Promise<DiscoveredWorkspace[]> {
    try {
      const hosts = await this.remoteHostStore.list()
      return hosts.map((host) => ({
        id: `ssh-${host.id}`,
        name: host.name,
        rootPath: `${host.username}@${host.hostname}:${host.port}`,
        source: 'ssh',
        reachable: true,
        reason: 'Saved SSH host — connect via Remote Systems'
      }))
    } catch {
      return []
    }
  }

  private async discoverRemovable(mountRoots: string[]): Promise<DiscoveredWorkspace[]> {
    const items: DiscoveredWorkspace[] = []
    for (const root of mountRoots) {
      try {
        const names = await readdir(root)
        for (const name of names) {
          if (typeof name !== 'string') continue
          const rootPath = join(root, name)
          let isDir = false
          try {
            const info = await stat(rootPath)
            isDir = info.isDirectory()
          } catch {
            continue
          }
          if (!isDir) continue
          items.push({
            id: `removable-${rootPath}`,
            name,
            rootPath,
            source: 'removable',
            reachable: true
          })
        }
      } catch {
        // Mount root may not exist or be unreadable.
      }
    }
    return items
  }

  private async discoverSteam(steamAppsRoots: string[]): Promise<DiscoveredWorkspace[]> {
    const items: DiscoveredWorkspace[] = []
    for (const root of steamAppsRoots) {
      try {
        const names = await readdir(root)
        for (const name of names) {
          if (typeof name !== 'string') continue
          if (!name.startsWith('appmanifest_') || !name.endsWith('.acf')) continue
          const manifestPath = join(root, name)
          const parsed = await parseAppManifest(manifestPath)
          if (!parsed) continue
          const installDir = join(root, 'common', parsed.installdir)
          try {
            const info = await stat(installDir)
            if (!info.isDirectory()) continue
          } catch {
            continue
          }
          items.push({
            id: `steam-${parsed.appid}`,
            name: parsed.name || parsed.installdir,
            rootPath: installDir,
            source: 'steam',
            reachable: true
          })
        }
      } catch {
        // Steam library root may not exist.
      }
    }
    return items
  }

  private async hasProjectMarker(dir: string): Promise<boolean> {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      return entries.some((entry) => PROJECT_MARKERS.has(entry.name))
    } catch {
      return false
    }
  }

  private async isGitRepo(dir: string): Promise<boolean> {
    try {
      return await this.gitService.isRepository(dir)
    } catch {
      return false
    }
  }
}

const ALL_SOURCES: WorkspaceDiscoverySource[] = ['home', 'git', 'ssh', 'removable', 'steam']

async function parseAppManifest(
  path: string
): Promise<{ appid: string; name: string; installdir: string } | null> {
  try {
    const text = await readFile(path, 'utf-8')
    const appidMatch = /"appid"\s+"(\d+)"/.exec(text)
    const nameMatch = /"name"\s+"([^"]+)"/.exec(text)
    const installDirMatch = /"installdir"\s+"([^"]+)"/.exec(text)
    if (!appidMatch || !installDirMatch) return null
    return {
      appid: appidMatch[1],
      name: nameMatch?.[1] ?? installDirMatch[1],
      installdir: installDirMatch[1]
    }
  } catch {
    return null
  }
}
