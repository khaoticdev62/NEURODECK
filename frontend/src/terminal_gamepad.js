import { state } from './state.js';
import { invoke } from './neurobridge.js';
import { createIcon } from './icons.js';
import { FocusTrap } from './focus-trap.js';
import { triggerHaptic } from './haptics.js';
import { addNotification } from './notifications.js';
import { createTerminalSession } from './terminal.js';

// ── Internal state ────────────────────────────────────────────────────────────
let _pickerVisible        = false;
let _pickerTemplateMode   = false;
let _pickerCatIdx         = 0;
let _pickerListIdx        = 0;
let _pickerFiltered       = [];
let _pickerTemplateParts  = [];
let _pickerPlaceholderIdx = 0;
let _pickerFocusTrap      = null;

// ── Category definitions ──────────────────────────────────────────────────────
const TERM_CMD_CATS = [
  { id: 'files',    icon: 'folder',    label: 'Files',     color: '#FFD600' },
  { id: 'git',      icon: 'gitBranch', label: 'Git',       color: '#00E676' },
  { id: 'system',   icon: 'cpu',       label: 'System',    color: '#29B6F6' },
  { id: 'network',  icon: 'wifi',      label: 'Network',   color: '#FF7043' },
  { id: 'devtools', icon: 'code',      label: 'Dev Tools', color: '#AB47BC' },
  { id: 'quickrun', icon: 'zap',       label: 'Quickrun',  color: '#00E5FF' },
];

// ── Placeholder option bank ───────────────────────────────────────────────────
const TERM_PH_OPTIONS = {
  PATTERN:    ['*.js', '*.ts', '*.py', '*.rs', '*.go', '*.log', '*.conf'],
  FILE:       ['main.js', 'config.toml', 'Cargo.toml', 'package.json', '.env'],
  DIR:        ['src/', 'dist/', 'target/', 'node_modules/', '/tmp/'],
  PATH:       ['./', 'src/', 'dist/', '/home/steam/', '/tmp/'],
  PROCESS:    ['node', 'python', 'cargo', 'docker', 'nginx'],
  PORT:       ['3000', '8080', '4000', '5000', '443', '80'],
  SERVICE:    ['nginx', 'docker', 'sshd', 'NetworkManager'],
  HOST:       ['localhost', '8.8.8.8', '192.168.1.1'],
  USER:       ['steam', 'root', 'admin'],
  NAMESPACE:  ['default', 'kube-system', 'production'],
  CONTAINER:  ['app', 'db', 'nginx', 'redis'],
  BRANCH:     ['main', 'develop', 'feature/new'],
  MESSAGE:    ['"fix: resolve crash"', '"feat: add feature"', '"chore: update deps"'],
  COUNT:      ['1', '2', '3', '5'],
  DEST:       ['/home/steam/', '/tmp/', './'],
  SOURCE:     ['./src/', './dist/', './target/'],
  ARCHIVE:    ['backup', 'release', 'dist'],
  SCRIPT:     ['dev', 'build', 'test', 'start', 'lint'],
  VAR:        ['PATH', 'HOME', 'USER', 'DISPLAY'],
  CMD:        ['ls', 'git', 'node', 'cargo', 'python'],
  URL:        ['https://api.github.com', 'http://localhost:3000'],
};

// ── Command library ───────────────────────────────────────────────────────────
const TERMINAL_COMMAND_LIBRARY = [
  // Files
  { id:'ls',        cat:'files',    icon:'list',        title:'List Files',       cmd:'ls -la',                                   desc:'All files with details and permissions' },
  { id:'find',      cat:'files',    icon:'search',      title:'Find Files',       cmd:'find . -name "[PATTERN]" -type f 2>/dev/null', desc:'Recursive file search by name pattern' },
  { id:'du',        cat:'files',    icon:'hardDrive',   title:'Disk Usage',       cmd:'du -sh */ | sort -rh | head -20',          desc:'Subdirectory sizes, largest first' },
  { id:'cat',       cat:'files',    icon:'fileText',    title:'View File',        cmd:'cat [FILE]',                               desc:'Print file contents to terminal' },
  { id:'cp',        cat:'files',    icon:'copy',        title:'Copy',             cmd:'cp [SOURCE] [DEST]',                       desc:'Copy file or directory' },
  { id:'mv',        cat:'files',    icon:'move',        title:'Move / Rename',    cmd:'mv [SOURCE] [DEST]',                       desc:'Move or rename file' },
  { id:'rm',        cat:'files',    icon:'trash',       title:'Remove',           cmd:'rm -rf [PATH]',                            desc:'Remove file or directory (use with care)' },
  { id:'tar_c',     cat:'files',    icon:'archive',     title:'Archive',          cmd:'tar -czf [ARCHIVE].tar.gz [DIR]/',         desc:'Compress directory to tar.gz' },
  { id:'tar_x',     cat:'files',    icon:'package',     title:'Extract',          cmd:'tar -xzf [ARCHIVE]',                       desc:'Extract a .tar.gz archive' },
  { id:'chmod',     cat:'files',    icon:'key',         title:'Make Executable',  cmd:'chmod +x [FILE]',                          desc:'Add execute permission to file' },

  // Git
  { id:'gs',        cat:'git',      icon:'gitBranch',   title:'Git Status',       cmd:'git status',                               desc:'Show working tree status' },
  { id:'gl',        cat:'git',      icon:'list',        title:'Git Log',          cmd:'git log --oneline -20',                    desc:'Last 20 commits, short format' },
  { id:'gd',        cat:'git',      icon:'diff',        title:'Git Diff',         cmd:'git diff',                                 desc:'Show all unstaged changes' },
  { id:'ga',        cat:'git',      icon:'plus',        title:'Git Add',          cmd:'git add [PATH]',                           desc:'Stage file or directory for commit' },
  { id:'gc',        cat:'git',      icon:'check',       title:'Git Commit',       cmd:'git commit -m [MESSAGE]',                  desc:'Commit staged changes with message' },
  { id:'gp',        cat:'git',      icon:'upload',      title:'Git Push',         cmd:'git push origin [BRANCH]',                 desc:'Push commits to remote branch' },
  { id:'gcb',       cat:'git',      icon:'gitBranch',   title:'New Branch',       cmd:'git checkout -b [BRANCH]',                 desc:'Create and switch to new branch' },
  { id:'gst',       cat:'git',      icon:'bookmark',    title:'Git Stash',        cmd:'git stash',                                desc:'Stash all current changes' },
  { id:'gpr',       cat:'git',      icon:'download',    title:'Pull Rebase',      cmd:'git pull --rebase',                        desc:'Pull and rebase on top of upstream' },
  { id:'grh',       cat:'git',      icon:'rotateCcw',   title:'Hard Reset',       cmd:'git reset --hard HEAD~[COUNT]',            desc:'Discard last N commits permanently' },

  // System
  { id:'ps',        cat:'system',   icon:'activity',    title:'Find Process',     cmd:'ps aux | grep [PROCESS]',                  desc:'Search running processes by name' },
  { id:'killport',  cat:'system',   icon:'zap',         title:'Kill Port',        cmd:'kill -9 $(lsof -ti :[PORT])',               desc:'Kill process listening on port' },
  { id:'free',      cat:'system',   icon:'cpu',         title:'Memory',           cmd:'free -h',                                  desc:'Show RAM and swap usage' },
  { id:'df',        cat:'system',   icon:'hardDrive',   title:'Disk Space',       cmd:'df -h',                                    desc:'Disk usage for all mounted filesystems' },
  { id:'top',       cat:'system',   icon:'barChart2',   title:'Top Snapshot',     cmd:'top -bn1 | head -20',                      desc:'One-shot process CPU/memory snapshot' },
  { id:'sctl',      cat:'system',   icon:'server',      title:'Service Status',   cmd:'systemctl status [SERVICE]',               desc:'Check status of a systemd service' },
  { id:'jctl',      cat:'system',   icon:'fileText',    title:'Journal Logs',     cmd:'journalctl -u [SERVICE] -n 50',             desc:'Last 50 log lines for a service' },
  { id:'uname',     cat:'system',   icon:'info',        title:'Kernel Version',   cmd:'uname -r',                                 desc:'Print running kernel release' },
  { id:'lsblk',     cat:'system',   icon:'database',    title:'Block Devices',    cmd:'lsblk',                                    desc:'List all block storage devices' },
  { id:'osupdate',  cat:'system',   icon:'refreshCcw',  title:'SteamOS Update',   cmd:'sudo steamos-update',                      desc:'Trigger a SteamOS system update' },

  // Network
  { id:'curl',      cat:'network',  icon:'globe',       title:'Curl URL',         cmd:'curl -s [URL] | head -50',                 desc:'Fetch URL and show first 50 lines' },
  { id:'ss',        cat:'network',  icon:'radio',       title:'Listening Ports',  cmd:'ss -tulnp | grep LISTEN',                  desc:'Show all TCP/UDP listening ports' },
  { id:'ping',      cat:'network',  icon:'wifi',        title:'Ping Host',        cmd:'ping -c 4 [HOST]',                         desc:'Send 4 ICMP packets to host' },
  { id:'nmap',      cat:'network',  icon:'scan',        title:'Port Scan',        cmd:'nmap -sV [HOST]',                          desc:'Scan host for open ports and services' },
  { id:'wget',      cat:'network',  icon:'download',    title:'Download File',    cmd:'wget -O [FILE] [URL]',                     desc:'Download URL to named file' },
  { id:'trace',     cat:'network',  icon:'map',         title:'Traceroute',       cmd:'traceroute [HOST]',                        desc:'Trace routing path to host' },
  { id:'ipaddr',    cat:'network',  icon:'server',      title:'IP Addresses',     cmd:'ip addr show',                             desc:'Show all network interface addresses' },
  { id:'nmcli',     cat:'network',  icon:'wifi',        title:'Network Status',   cmd:'nmcli device status',                      desc:'NetworkManager device summary' },
  { id:'ssh',       cat:'network',  icon:'terminal',    title:'SSH Connect',      cmd:'ssh [USER]@[HOST]',                        desc:'Open SSH session to remote host' },
  { id:'scp',       cat:'network',  icon:'upload',      title:'SCP Copy',         cmd:'scp [FILE] [USER]@[HOST]:[DEST]',          desc:'Securely copy file to remote host' },

  // Dev Tools
  { id:'ccheck',    cat:'devtools', icon:'checkSquare', title:'Cargo Check',      cmd:'cargo check',                              desc:'Fast Rust type-check without build' },
  { id:'cbuild',    cat:'devtools', icon:'package',     title:'Cargo Build',      cmd:'cargo build --release',                    desc:'Compile Rust release binary' },
  { id:'ctest',     cat:'devtools', icon:'testTube',    title:'Cargo Test',       cmd:'cargo test',                               desc:'Run all Rust unit and integration tests' },
  { id:'npmrun',    cat:'devtools', icon:'play',        title:'npm run',          cmd:'npm run [SCRIPT]',                         desc:'Run package.json script' },
  { id:'npmi',      cat:'devtools', icon:'download',    title:'npm install',      cmd:'npm install',                              desc:'Install all node_modules dependencies' },
  { id:'pytest',    cat:'devtools', icon:'flask',       title:'Python Test',      cmd:'python3 -m pytest',                        desc:'Run all Python pytest tests' },
  { id:'dps',       cat:'devtools', icon:'box',         title:'Docker PS',        cmd:'docker ps -a',                             desc:'List all Docker containers' },
  { id:'dlogs',     cat:'devtools', icon:'fileText',    title:'Docker Logs',      cmd:'docker logs -f [CONTAINER]',               desc:'Follow live container log output' },
  { id:'kgp',       cat:'devtools', icon:'cloud',       title:'Kubectl Pods',     cmd:'kubectl get pods -n [NAMESPACE]',          desc:'List Kubernetes pods in namespace' },
  { id:'bisect',    cat:'devtools', icon:'gitMerge',    title:'Git Bisect',       cmd:'git bisect start',                         desc:'Begin binary search for bad commit' },

  // Quickrun
  { id:'clear',     cat:'quickrun', icon:'eraser',      title:'Clear Screen',     cmd:'clear',                                    desc:'Clear all terminal output' },
  { id:'hist',      cat:'quickrun', icon:'clock',       title:'Recent History',   cmd:'history | tail -20',                       desc:'Last 20 commands from history' },
  { id:'pwd',       cat:'quickrun', icon:'mapPin',      title:'Print CWD',        cmd:'pwd',                                      desc:'Print current working directory' },
  { id:'envgrep',   cat:'quickrun', icon:'search',      title:'Find Env Var',     cmd:'env | grep [VAR]',                         desc:'Search environment variable by name' },
  { id:'which',     cat:'quickrun', icon:'helpCircle',  title:'Find Command',     cmd:'which [CMD]',                              desc:'Show full path of a command' },
  { id:'man',       cat:'quickrun', icon:'bookOpen',    title:'Manual Page',      cmd:'man [CMD]',                                desc:'Open man page for a command' },
  { id:'repeat',    cat:'quickrun', icon:'repeat',      title:'Repeat Last',      cmd:'!!',                                       desc:'Re-run the previous command' },
  { id:'sudorepeat',cat:'quickrun', icon:'shield',      title:'Sudo Last',        cmd:'sudo !!',                                  desc:'Re-run previous command with sudo' },
  { id:'cdprev',    cat:'quickrun', icon:'arrowLeft',   title:'Previous Dir',     cmd:'cd -',                                     desc:'Switch to previous working directory' },
  { id:'exit',      cat:'quickrun', icon:'logOut',      title:'Exit Shell',       cmd:'exit',                                     desc:'Close this terminal session' },
];

// ── Internal helpers ──────────────────────────────────────────────────────────
function _ptyWrite(data) {
  const id = state.activeTerminalSessionId;
  if (!id) return;
  invoke('pty_write', { id, data }).catch(() => {});
}

function _getFilteredCmds() {
  const cat = TERM_CMD_CATS[_pickerCatIdx].id;
  return TERMINAL_COMMAND_LIBRARY.filter(c => c.cat === cat);
}

function _hasPlaceholder(cmd) {
  return /\[[A-Z_0-9]+\]/.test(cmd);
}

function _parseTemplate(cmd) {
  const parts = [];
  const re = /\[([A-Z_0-9]+)\]/g;
  let last = 0, m;
  while ((m = re.exec(cmd)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: cmd.slice(last, m.index) });
    const name = m[1];
    const options = TERM_PH_OPTIONS[name] || [];
    parts.push({ type: 'ph', name, options, optIdx: 0 });
    last = m.index + m[0].length;
  }
  if (last < cmd.length) parts.push({ type: 'text', value: cmd.slice(last) });
  return parts;
}

function _getFilledCommand() {
  return _pickerTemplateParts.map(p =>
    p.type === 'text' ? p.value : (p.options.length ? p.options[p.optIdx] : `[${p.name}]`)
  ).join('');
}

function _activePlaceholders() {
  return _pickerTemplateParts.filter(p => p.type === 'ph');
}

// ── Picker rendering ──────────────────────────────────────────────────────────
function _renderPickerCats() {
  const container = document.querySelector('.tcp-categories');
  if (!container) return;
  container.innerHTML = TERM_CMD_CATS.map((cat, i) => `
    <button class="tcp-cat-btn ${i === _pickerCatIdx ? 'active' : ''}"
            data-cat-idx="${i}"
            style="${i === _pickerCatIdx ? `border-left-color:${cat.color};color:${cat.color};` : ''}"
            tabindex="-1"
            aria-label="${cat.label} category">
      ${createIcon(cat.icon, { size: 14 })}
      <span>${cat.label}</span>
    </button>
  `).join('');
  container.querySelectorAll('.tcp-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _pickerCatIdx = parseInt(btn.dataset.catIdx, 10);
      _pickerListIdx = 0;
      _pickerTemplateMode = false;
      _renderPickerCats();
      _renderPickerList();
      _renderPickerFooter();
      triggerHaptic('light');
    });
  });
}

function _renderPickerList() {
  const container = document.querySelector('.tcp-list-wrap');
  if (!container) return;
  _pickerFiltered = _getFilteredCmds();
  if (_pickerFiltered.length === 0) {
    container.innerHTML = '<div class="tcp-empty">No commands in this category.</div>';
    return;
  }
  _pickerListIdx = Math.max(0, Math.min(_pickerListIdx, _pickerFiltered.length - 1));
  const catColor = TERM_CMD_CATS[_pickerCatIdx].color;
  container.innerHTML = _pickerFiltered.map((cmd, i) => {
    const isFocused = i === _pickerListIdx;
    const hasPh = _hasPlaceholder(cmd.cmd);
    return `
      <div class="tcp-row ${isFocused ? 'focused' : ''}"
           data-list-idx="${i}"
           style="${isFocused ? `border-left-color:${catColor};` : ''}"
           tabindex="-1"
           role="option"
           aria-selected="${isFocused}">
        <div class="tcp-row-icon" style="background:${catColor}1a;">
          ${createIcon(cmd.icon, { size: 16 })}
        </div>
        <div style="flex:1;min-width:0;">
          <div class="tcp-row-title" style="${isFocused ? `color:${catColor};` : ''}">
            ${cmd.title}
            ${hasPh ? `<span class="tcp-template-badge" style="background:${catColor}22;color:${catColor};">TEMPLATE</span>` : ''}
          </div>
          <div class="tcp-row-cmd">${cmd.cmd}</div>
        </div>
      </div>`;
  }).join('');
  container.querySelectorAll('.tcp-row').forEach(row => {
    row.addEventListener('click', () => {
      _pickerListIdx = parseInt(row.dataset.listIdx, 10);
      _confirmPickerItem(false);
    });
  });
  const focused = container.querySelector('.tcp-row.focused');
  if (focused) focused.scrollIntoView({ block: 'nearest' });
}

function _renderPickerFooter() {
  const footer = document.querySelector('.tcp-footer');
  if (!footer) return;
  if (_pickerTemplateMode) {
    const phs = _activePlaceholders();
    const ph = phs[_pickerPlaceholderIdx];
    if (!ph) { footer.innerHTML = '<span class="tcp-preview">Press A to run.</span>'; return; }
    const filled = _getFilledCommand();
    footer.innerHTML = `
      <div class="tcp-template-bar">
        <span class="tcp-template-label">[${ph.name}]</span>
        <span class="tcp-template-value">${ph.options.length ? ph.options[ph.optIdx] : `[${ph.name}]`}</span>
        <span class="tcp-preview" style="margin-left:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0.55;">${filled}</span>
        <span class="tcp-template-hint">[←→] Cycle &nbsp; [↑↓] Prev/Next field &nbsp; [A] Run &nbsp; [B] Back</span>
      </div>`;
  } else {
    const item = _pickerFiltered[_pickerListIdx];
    footer.innerHTML = item
      ? `<span class="tcp-preview">${item.desc}&nbsp;&nbsp;<span style="opacity:0.45;">[A] Run &nbsp; [X] Paste &nbsp; [B] Close</span></span>`
      : '<span class="tcp-preview">Select a command above.</span>';
  }
}

function _confirmPickerItem(pasteOnly) {
  const item = _pickerFiltered[_pickerListIdx];
  if (!item) return;
  if (_hasPlaceholder(item.cmd)) {
    _pickerTemplateParts = _parseTemplate(item.cmd);
    _pickerPlaceholderIdx = 0;
    _pickerTemplateMode = true;
    _renderPickerFooter();
    triggerHaptic('medium');
  } else {
    _ptyWrite(pasteOnly ? item.cmd : item.cmd + '\n');
    closeTerminalCommandPicker();
    triggerHaptic('success');
  }
}

function _confirmTemplate(pasteOnly) {
  const cmd = _getFilledCommand();
  _ptyWrite(pasteOnly ? cmd : cmd + '\n');
  closeTerminalCommandPicker();
  triggerHaptic('success');
}

// ── Picker DOM builder ────────────────────────────────────────────────────────
function _buildPickerOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'terminal-cmd-picker-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Terminal Command Picker');
  overlay.innerHTML = `
    <div class="tcp-modal">
      <div class="tcp-header">
        <div class="tcp-title">
          ${createIcon('terminal', { size: 16 })}
          <span>TERMINAL COMMANDS</span>
        </div>
        <div class="tcp-hint">[A] Run &nbsp;·&nbsp; [X] Paste &nbsp;·&nbsp; [B] Close &nbsp;·&nbsp; [L1/R1] Category</div>
      </div>
      <div class="tcp-body">
        <div class="tcp-categories" role="listbox" aria-label="Command categories"></div>
        <div class="tcp-list-wrap" role="listbox" aria-label="Commands"></div>
      </div>
      <div class="tcp-footer">
        <span class="tcp-preview">Select a command above.</span>
      </div>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeTerminalCommandPicker(); });
  document.body.appendChild(overlay);
}

// ── Hint bar ──────────────────────────────────────────────────────────────────
export function initTerminalControllerHintBar() {
  if (document.getElementById('terminal-gp-hud')) return;
  const view = document.getElementById('view-terminal');
  if (!view) return;
  const hud = document.createElement('div');
  hud.id = 'terminal-gp-hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML = `<span class="tcp-hud-hint">
    <strong>[↑↓]</strong>&nbsp;History&nbsp;&nbsp;
    <strong>[←→]</strong>&nbsp;Cursor&nbsp;&nbsp;
    <strong>[A]</strong>&nbsp;Enter&nbsp;&nbsp;
    <strong>[B]</strong>&nbsp;Ctrl+C&nbsp;&nbsp;
    <strong>[X]</strong>&nbsp;Tab&nbsp;&nbsp;
    <strong>[Y]</strong>&nbsp;Clear&nbsp;&nbsp;
    <strong>[L1/R1]</strong>&nbsp;Scroll&nbsp;&nbsp;
    <strong>[R2]</strong>&nbsp;Commands&nbsp;&nbsp;
    <strong>[L4]</strong>&nbsp;New Tab&nbsp;&nbsp;
    <strong>[R4]</strong>&nbsp;Cycle Tab
  </span>`;
  view.appendChild(hud);
}

export function updateHintBarVisibility() {
  const hud = document.getElementById('terminal-gp-hud');
  if (!hud) return;
  const visible = !!(state.gamepadActive && isTerminalViewActive());
  hud.classList.toggle('visible', visible);
}

// ── Public state guards ───────────────────────────────────────────────────────
export function isTerminalViewActive() {
  return !!(document.getElementById('view-terminal')?.classList.contains('active'));
}

export function isTerminalCommandPickerVisible() {
  return _pickerVisible;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
export function initTerminalGamepad() {
  _buildPickerOverlay();
  initTerminalControllerHintBar();
}

export function openTerminalCommandPicker() {
  if (_pickerVisible) return;
  if (!state.activeTerminalSessionId) {
    addNotification('No Terminal Session', 'Start a terminal session first.', 'warning');
    return;
  }
  if (state.radialMenuVisible) return;
  _pickerVisible = true;
  _pickerTemplateMode = false;
  _pickerCatIdx = 0;
  _pickerListIdx = 0;
  const overlay = document.getElementById('terminal-cmd-picker-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  _renderPickerCats();
  _renderPickerList();
  _renderPickerFooter();
  const focusable = overlay.querySelector('.tcp-modal');
  if (focusable) {
    _pickerFocusTrap = new FocusTrap(overlay);
    _pickerFocusTrap.activate();
  }
  const sr = document.getElementById('sr-announcer');
  if (sr) { sr.textContent = ''; requestAnimationFrame(() => { sr.textContent = 'Terminal Command Picker opened.'; }); }
}

export function closeTerminalCommandPicker() {
  if (!_pickerVisible) return;
  _pickerVisible = false;
  _pickerTemplateMode = false;
  _pickerTemplateParts = [];
  const overlay = document.getElementById('terminal-cmd-picker-overlay');
  if (overlay) overlay.classList.remove('active');
  if (_pickerFocusTrap) { _pickerFocusTrap.deactivate(); _pickerFocusTrap = null; }
  const sr = document.getElementById('sr-announcer');
  if (sr) { sr.textContent = ''; requestAnimationFrame(() => { sr.textContent = 'Terminal Command Picker closed.'; }); }
}

// ── Gamepad routing (called from main.js) ─────────────────────────────────────
export function handleTerminalGamepadButton(btnIdx) {
  if (_pickerVisible) {
    _handlePickerButton(btnIdx);
    return;
  }
  if (!isTerminalViewActive()) return;
  switch (btnIdx) {
    case 0:  _ptyWrite('\r');    triggerHaptic('medium'); break;
    case 1:  _ptyWrite('\x03'); triggerHaptic('heavy');  break;
    case 2:  _ptyWrite('\t');    triggerHaptic('light');  break;
    case 3:  _ptyWrite('\x0c'); triggerHaptic('medium'); break;
    case 7:  openTerminalCommandPicker(); triggerHaptic('medium'); break;
    case 8:  _ptyWrite('\x12'); triggerHaptic('medium'); break;
    case 9:  _ptyWrite('\x04'); triggerHaptic('medium'); break;
    case 17:
      createTerminalSession();
      triggerHaptic('medium');
      break;
    case 18:
      _cycleTerminalTab(1);
      triggerHaptic('light');
      break;
    case 19: _ptyWrite('\x15'); triggerHaptic('medium'); break;
    case 20: _ptyWrite('\x17'); triggerHaptic('light');  break;
  }
}

export function handleTerminalGamepadDpad(dir) {
  if (_pickerVisible) {
    _handlePickerDpad(dir);
    return;
  }
  if (!isTerminalViewActive()) return;
  const seq = { up: '\x1b[A', down: '\x1b[B', left: '\x1b[D', right: '\x1b[C' }[dir];
  if (seq) { _ptyWrite(seq); triggerHaptic('tick'); }
}

export function handlePickerGamepadShoulder(isL1) {
  if (!_pickerVisible) return;
  _pickerCatIdx = ((_pickerCatIdx + (isL1 ? -1 : 1)) + TERM_CMD_CATS.length) % TERM_CMD_CATS.length;
  _pickerListIdx = 0;
  _pickerTemplateMode = false;
  _renderPickerCats();
  _renderPickerList();
  _renderPickerFooter();
  triggerHaptic('light');
}

// ── Internal picker input handlers ────────────────────────────────────────────
function _handlePickerButton(btnIdx) {
  if (_pickerTemplateMode) {
    switch (btnIdx) {
      case 0: _confirmTemplate(false); break;
      case 2: _confirmTemplate(true);  break;
      case 1:
        _pickerTemplateMode = false;
        _pickerTemplateParts = [];
        _renderPickerList();
        _renderPickerFooter();
        triggerHaptic('light');
        break;
    }
  } else {
    switch (btnIdx) {
      case 0: _confirmPickerItem(false); break;
      case 2: _confirmPickerItem(true);  break;
      case 1: closeTerminalCommandPicker(); break;
    }
  }
}

function _handlePickerDpad(dir) {
  if (_pickerTemplateMode) {
    const phs = _activePlaceholders();
    if (dir === 'left' || dir === 'right') {
      const ph = phs[_pickerPlaceholderIdx];
      if (!ph) return;
      if (ph.options.length === 0) { triggerHaptic('error'); return; }
      ph.optIdx = ((ph.optIdx + (dir === 'right' ? 1 : -1)) + ph.options.length) % ph.options.length;
      _renderPickerFooter();
      triggerHaptic('tick');
    } else {
      const delta = dir === 'up' ? -1 : 1;
      _pickerPlaceholderIdx = Math.max(0, Math.min(phs.length - 1, _pickerPlaceholderIdx + delta));
      _renderPickerFooter();
      triggerHaptic('tick');
    }
  } else {
    if (dir === 'up' || dir === 'down') {
      const delta = dir === 'up' ? -1 : 1;
      _pickerListIdx = Math.max(0, Math.min(_pickerFiltered.length - 1, _pickerListIdx + delta));
      _renderPickerList();
      _renderPickerFooter();
      triggerHaptic('tick');
    }
  }
}

function _cycleTerminalTab(dir) {
  const tabs = Array.from(document.querySelectorAll('#terminal-tabs-list .terminal-tab'));
  if (tabs.length < 2) return;
  const ai = tabs.findIndex(t => t.classList.contains('active'));
  tabs[((ai < 0 ? 0 : ai) + dir + tabs.length) % tabs.length].click();
}
