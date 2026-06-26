import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { defaultLibraryFoldersVdfPath, SteamLibraryScanner } from '../SteamLibraryScanner'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'ndx-steam-library-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const LIBRARY_FOLDERS_VDF = `"libraryfolders"
{
	"0"
	{
		"path"		"{LIBRARY_PATH}"
		"label"		""
	}
}
`

const APP_MANIFEST_ACF = `"AppState"
{
	"appid"		"440"
	"name"		"Team Fortress 2"
	"installdir"	"Team Fortress 2"
}
`

describe('SteamLibraryScanner', () => {
  it('parses a real libraryfolders.vdf and appmanifest_*.acf into ApplicationRecords', async () => {
    const libraryPath = join(dir, 'steam-library')
    const appsDir = join(libraryPath, 'steamapps')
    await mkdir(appsDir, { recursive: true })
    await writeFile(join(appsDir, 'appmanifest_440.acf'), APP_MANIFEST_ACF, 'utf-8')
    const vdfPath = join(dir, 'libraryfolders.vdf')
    await writeFile(
      vdfPath,
      LIBRARY_FOLDERS_VDF.replace('{LIBRARY_PATH}', libraryPath.replace(/\\/g, '\\\\')),
      'utf-8'
    )

    const scanner = new SteamLibraryScanner(vdfPath)
    const records = await scanner.scan()

    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      id: 'steam:440',
      source: 'steam',
      name: 'Team Fortress 2',
      executableRef: 'steam://rungameid/440',
      installed: true,
      launchMode: 'external'
    })
  })

  it('returns an empty list when libraryfolders.vdf does not exist', async () => {
    const scanner = new SteamLibraryScanner(join(dir, 'missing.vdf'))
    expect(await scanner.scan()).toEqual([])
  })

  it('skips a library whose steamapps directory does not exist', async () => {
    const vdfPath = join(dir, 'libraryfolders.vdf')
    await writeFile(
      vdfPath,
      LIBRARY_FOLDERS_VDF.replace(
        '{LIBRARY_PATH}',
        join(dir, 'nonexistent-library').replace(/\\/g, '\\\\')
      ),
      'utf-8'
    )
    const scanner = new SteamLibraryScanner(vdfPath)
    expect(await scanner.scan()).toEqual([])
  })

  it('skips a manifest missing appid or name', async () => {
    const libraryPath = join(dir, 'steam-library')
    const appsDir = join(libraryPath, 'steamapps')
    await mkdir(appsDir, { recursive: true })
    await writeFile(
      join(appsDir, 'appmanifest_broken.acf'),
      '"AppState"\n{\n\t"appid"\t\t"123"\n}\n',
      'utf-8'
    )
    const vdfPath = join(dir, 'libraryfolders.vdf')
    await writeFile(
      vdfPath,
      LIBRARY_FOLDERS_VDF.replace('{LIBRARY_PATH}', libraryPath.replace(/\\/g, '\\\\')),
      'utf-8'
    )

    const scanner = new SteamLibraryScanner(vdfPath)
    expect(await scanner.scan()).toEqual([])
  })

  it('defaultLibraryFoldersVdfPath returns a real platform-specific path', () => {
    expect(defaultLibraryFoldersVdfPath('/home/deck', 'linux')).toContain('.steam')
    expect(defaultLibraryFoldersVdfPath('C:\\Users\\deck', 'win32')).toContain('Steam')
  })
})
