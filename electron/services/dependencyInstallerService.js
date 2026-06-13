'use strict';

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class DependencyInstallerService {
  constructor() {
    this.activeDownloads = new Map();
    this.activeProcesses = new Map();
    this.tempDir = path.join(app.getPath('userData'), 'temp_installers');

    // Create temp directory on startup
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Helper to validate download URLs against strict domain allowlist
   */
  validateUrl(urlString) {
    try {
      const parsed = new URL(urlString);
      const host = parsed.hostname;
      const allowedHosts = [
        'github.com',
        'githubusercontent.com',
        'ollama.com',
      ];
      return allowedHosts.some(allowed => host === allowed || host.endsWith('.' + allowed));
    } catch (_) {
      return false;
    }
  }

  /**
   * Resolves the latest stable asset from GitHub releases API
   */
  resolveGithubLatest(repo, nameFilter) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${repo}/releases/latest`,
        headers: {
          'User-Agent': 'NEURODECK-App'
        }
      };

      https.get(options, (res) => {
        if (res.statusCode === 403) {
          reject(new Error('GitHub API rate limit exceeded. Please try again later.'));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GitHub API returned status ${res.statusCode}`));
          return;
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const release = JSON.parse(body);
            const asset = release.assets.find(a => nameFilter(a.name));
            if (!asset) {
              reject(new Error(`No matching asset found in ${repo} latest release`));
              return;
            }
            resolve({
              url: asset.browser_download_url,
              name: asset.name,
              tag: release.tag_name
            });
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Downloads a URL to a local path while updating the renderer with progress
   */
  download(id, url, destPath, mainWindow) {
    return new Promise((resolve, reject) => {
      if (!this.validateUrl(url)) {
        reject(new Error(`Access Denied: URL host not allowlisted: ${url}`));
        return;
      }

      const sendProgress = (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('dependency:progress', { id, state: 'downloading', ...data });
        }
      };

      const get = (currentUrl) => {
        const req = https.get(currentUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            get(res.headers.location);
            return;
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Server returned status code ${res.statusCode}`));
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
          let downloadedBytes = 0;
          const fileStream = fs.createWriteStream(destPath);
          
          let lastTime = Date.now();
          let lastDownloaded = 0;

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            fileStream.write(chunk);

            const now = Date.now();
            if (now - lastTime >= 300) { // Throttle progress reports to 300ms
              const duration = (now - lastTime) / 1000;
              const speed = (downloadedBytes - lastDownloaded) / duration;
              sendProgress({
                percent: totalBytes ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
                downloadedBytes,
                totalBytes,
                speed
              });
              lastTime = now;
              lastDownloaded = downloadedBytes;
            }
          });

          res.on('end', () => {
            fileStream.end();
            this.activeDownloads.delete(id);
            resolve();
          });

          res.on('error', (err) => {
            fileStream.close();
            fs.unlink(destPath, () => {});
            this.activeDownloads.delete(id);
            reject(err);
          });
        });

        req.on('error', (err) => {
          this.activeDownloads.delete(id);
          reject(err);
        });

        this.activeDownloads.set(id, req);
      };

      get(url);
    });
  }

  /**
   * Spawns installation commands securely with optional privilege elevation
   */
  execute(id, cmd, args, mainWindow, runAsAdmin = false) {
    return new Promise((resolve, reject) => {
      const sendStatus = (state, details = '') => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('dependency:progress', { id, state, details });
        }
      };

      sendStatus('installing');

      let spawnCmd = cmd;
      let spawnArgs = args;

      if (runAsAdmin) {
        if (process.platform === 'win32') {
          // Wrap in powershell Verb RunAs
          spawnCmd = 'powershell.exe';
          const fullCmdStr = `Start-Process -FilePath "${cmd}" -ArgumentList "${args.join(' ')}" -Verb RunAs -Wait`;
          spawnArgs = ['-NoProfile', '-Command', fullCmdStr];
        } else {
          // Wrap in pkexec for Linux/SteamOS GUI authorization
          spawnCmd = 'pkexec';
          spawnArgs = [cmd, ...args];
        }
      }

      const proc = spawn(spawnCmd, spawnArgs, {
        windowsHide: true,
      });

      this.activeProcesses.set(id, proc);

      let output = '';
      proc.stdout?.on('data', (data) => output += data.toString());
      proc.stderr?.on('data', (data) => output += data.toString());

      proc.on('close', (code) => {
        this.activeProcesses.delete(id);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Installer exited with code ${code}. Console: ${output.slice(-200)}`));
        }
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(id);
        reject(err);
      });
    });
  }

  /**
   * Cancel an active install or download
   */
  cancel(id) {
    // 1. Abort download request if running
    const req = this.activeDownloads.get(id);
    if (req) {
      req.destroy();
      this.activeDownloads.delete(id);
    }

    // 2. Kill spawned process if running
    const proc = this.activeProcesses.get(id);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(id);
    }

    return true;
  }

  /**
   * Check status of dependency (installed or missing)
   */
  async checkInstalledStatus(id) {
    return new Promise((resolve) => {
      let cmd = '';
      let args = [];
      
      if (id === 'ssh') {
        cmd = process.platform === 'win32' ? 'where' : 'which';
        args = ['ssh'];
      } else if (id === 'ollama') {
        cmd = process.platform === 'win32' ? 'where' : 'which';
        args = ['ollama'];
      } else if (id === 'tts') {
        if (process.platform === 'win32') {
          resolve(true); // Windows SAPI always available
          return;
        }
        cmd = 'which';
        args = ['espeak-ng'];
      } else if (id === 'openvpn') {
        cmd = process.platform === 'win32' ? 'where' : 'which';
        args = ['openvpn'];
      } else if (id === 'wireguard') {
        cmd = process.platform === 'win32' ? 'where' : 'which';
        args = ['wg'];
      } else {
        resolve(false);
        return;
      }

      const proc = spawn(cmd, args, { windowsHide: true });
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Primary entry point for installer workflow
   */
  async install(id, mainWindow) {
    const isWin = process.platform === 'win32';
    const ext = (id === 'openvpn' || id === 'wireguard') ? '.msi' : (id === 'ollama' ? '.exe' : '.tar.gz');
    const tempFile = path.join(this.tempDir, `install_${id}_${Date.now()}${isWin ? ext : '.tar.gz'}`);

    try {
      if (id === 'ollama') {
        let downloadUrl = '';
        if (isWin) {
          downloadUrl = 'https://ollama.com/download/OllamaSetup.exe';
        } else {
          // Linux: dynamic GitHub latest resolution
          const release = await this.resolveGithubLatest('ollama/ollama', name => name.endsWith('-linux-amd64.tar.gz'));
          downloadUrl = release.url;
        }

        // 1. Download
        await this.download(id, downloadUrl, tempFile, mainWindow);

        // 2. Run execution
        if (isWin) {
          // Silently run OllamaSetup.exe
          await this.execute(id, tempFile, ['/silent'], mainWindow, false);
        } else {
          // Extract Linux tarball to ~/.local/bin
          const binDir = path.join(app.getPath('home'), '.local', 'bin');
          if (!fs.existsSync(binDir)) {
            fs.mkdirSync(binDir, { recursive: true });
          }
          // Spawn tar to extract
          await this.execute(id, 'tar', ['-xzf', tempFile, '-C', binDir], mainWindow, false);
        }
      } else if (id === 'ssh') {
        if (isWin) {
          // Enable native OpenSSH client capability via elevated PowerShell
          await this.execute(id, 'powershell.exe', [
            '-NoProfile', '-Command',
            'Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0'
          ], mainWindow, true);
        } else {
          // Linux: Install openssh via package manager with pkexec
          const pm = await this.detectLinuxPackageManager();
          if (pm === 'pacman') {
            await this.execute(id, 'pacman', ['-S', '--noconfirm', 'openssh'], mainWindow, true);
          } else if (pm === 'apt') {
            await this.execute(id, 'apt-get', ['install', '-y', 'openssh-client'], mainWindow, true);
          } else {
            throw new Error('Unsupported Linux distribution. Please install OpenSSH manually.');
          }
        }
      } else if (id === 'tts') {
        if (isWin) {
          // Windows has SAPI built-in, already checks out
          return { success: true };
        } else {
          // Linux: Install espeak-ng via package manager with pkexec
          const pm = await this.detectLinuxPackageManager();
          if (pm === 'pacman') {
            await this.execute(id, 'pacman', ['-S', '--noconfirm', 'espeak-ng'], mainWindow, true);
          } else if (pm === 'apt') {
            await this.execute(id, 'apt-get', ['install', '-y', 'espeak-ng'], mainWindow, true);
          } else {
            throw new Error('Unsupported Linux distribution. Please install espeak-ng manually.');
          }
        }
      } else if (id === 'openvpn') {
        if (isWin) {
          // OpenVPN community MSI download: latest x64 MSI
          const release = await this.resolveGithubLatest('OpenVPN/openvpn-build', name => name.endsWith('.msi') && (name.includes('x64') || name.includes('amd64')));
          // 1. Download
          await this.download(id, release.url, tempFile, mainWindow);
          // 2. Install elevated silently
          await this.execute(id, 'msiexec.exe', ['/i', tempFile, '/qn', '/norestart'], mainWindow, true);
        } else {
          // Linux
          const pm = await this.detectLinuxPackageManager();
          if (pm === 'pacman') {
            await this.execute(id, 'pacman', ['-S', '--noconfirm', 'openvpn'], mainWindow, true);
          } else if (pm === 'apt') {
            await this.execute(id, 'apt-get', ['install', '-y', 'openvpn'], mainWindow, true);
          } else {
            throw new Error('Unsupported Linux distribution. Please install OpenVPN manually.');
          }
        }
      } else if (id === 'wireguard') {
        if (isWin) {
          // WireGuard for Windows MSI download: latest amd64 MSI
          const release = await this.resolveGithubLatest('WireGuard/wireguard-windows', name => name.endsWith('.msi') && name.includes('amd64'));
          // 1. Download
          await this.download(id, release.url, tempFile, mainWindow);
          // 2. Install elevated silently
          await this.execute(id, 'msiexec.exe', ['/i', tempFile, '/qn', '/norestart'], mainWindow, true);
        } else {
          // Linux
          const pm = await this.detectLinuxPackageManager();
          if (pm === 'pacman') {
            await this.execute(id, 'pacman', ['-S', '--noconfirm', 'wireguard-tools'], mainWindow, true);
          } else if (pm === 'apt') {
            await this.execute(id, 'apt-get', ['install', '-y', 'wireguard'], mainWindow, true);
          } else {
            throw new Error('Unsupported Linux distribution. Please install WireGuard manually.');
          }
        }
      } else {
        throw new Error(`Unknown dependency ID: ${id}`);
      }

      // Cleanup
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dependency:progress', { id, state: 'completed' });
      }
      return { success: true };

    } catch (error) {
      // Cleanup on failure
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('dependency:progress', { id, state: 'failed', error: error.message });
      }
      throw error;
    }
  }

  /**
   * Helper to detect the package manager on Linux systems
   */
  detectLinuxPackageManager() {
    return new Promise((resolve) => {
      const checkApt = spawn('which', ['apt-get'], { windowsHide: true });
      checkApt.on('close', (code) => {
        if (code === 0) {
          resolve('apt');
          return;
        }
        const checkPacman = spawn('which', ['pacman'], { windowsHide: true });
        checkPacman.on('close', (code2) => {
          if (code2 === 0) {
            resolve('pacman');
          } else {
            resolve('unknown');
          }
        });
      });
    });
  }

  /**
   * Clean up all temp files on exit
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
    } catch (_) {}
  }
}

const dependencyInstallerService = new DependencyInstallerService();

module.exports = {
  dependencyInstallerService,
  DependencyInstallerService
};
