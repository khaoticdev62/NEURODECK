use std::net::{SocketAddr, UdpSocket};
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo, State,
    },
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use rand::Rng;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State as TauriState};

// ── Embedded mobile webapp ────────────────────────────────────────────────────

const WEBAPP_HTML: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>NEURODECK Remote</title>
<style>
:root {
  --a: #00f0ff; --a2: rgba(0,240,255,.12); --a3: rgba(0,240,255,.25);
  --bg: #06080e; --sf: #0c0e18; --sf2: #10141f;
  --br: rgba(255,255,255,.07); --br2: rgba(255,255,255,.12);
  --tx: #e0e8f0; --mu: rgba(255,255,255,.38);
  --green: #7cffb2; --red: #ff5f5f; --warn: #ffc857;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
html, body { height: 100%; background: var(--bg); color: var(--tx); font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif; overscroll-behavior: none; }
body { display: flex; flex-direction: column; height: 100dvh; }

/* ── Connect screen ── */
#sc { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; gap: 20px; padding: 32px; text-align: center; }
.brand { font-size: 1.4rem; font-weight: 800; letter-spacing: .2em; color: var(--a); font-family: ui-monospace, 'SF Mono', monospace; }
.brand-sub { font-size: .65rem; color: var(--mu); letter-spacing: .25em; font-family: ui-monospace, monospace; margin-top: 6px; }
.spin { width: 34px; height: 34px; border: 2.5px solid var(--br); border-top-color: var(--a); border-radius: 50%; animation: sp .75s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
.stxt { font-size: .82rem; color: var(--mu); font-family: ui-monospace, monospace; }
.emsg { color: var(--red); font-size: .8rem; max-width: 300px; line-height: 1.55; font-family: ui-monospace, monospace; }
.rbtn { background: transparent; border: 1px solid var(--a); color: var(--a); padding: 10px 26px; border-radius: 8px; font-size: .82rem; cursor: pointer; font-family: ui-monospace, monospace; letter-spacing: .06em; }
.rbtn:active { background: var(--a2); }

/* ── Main shell ── */
#sm { display: none; flex-direction: column; flex: 1; overflow: hidden; }

/* ── Top bar ── */
.topbar { display: flex; align-items: center; padding: calc(10px + env(safe-area-inset-top)) 16px 10px; background: var(--sf); border-bottom: 1px solid var(--br); gap: 10px; flex-shrink: 0; }
.topbar-t { font-family: ui-monospace, monospace; font-size: .7rem; font-weight: 700; letter-spacing: .16em; color: var(--a); flex: 1; }
.topbar-agent { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--mu); background: rgba(0,240,255,.07); border: 1px solid var(--a3); border-radius: 4px; padding: 2px 7px; white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.cdot { width: 8px; height: 8px; border-radius: 50%; background: var(--a); box-shadow: 0 0 6px var(--a); flex-shrink: 0; transition: background .3s; }

/* ── Tabs ── */
.tabs { display: flex; background: var(--sf); border-bottom: 1px solid var(--br); flex-shrink: 0; }
.tab { flex: 1; padding: 10px 4px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--mu); font-size: .65rem; letter-spacing: .1em; font-family: ui-monospace, monospace; cursor: pointer; transition: color .15s, border-color .15s; text-transform: uppercase; }
.tab.on { color: var(--a); border-bottom-color: var(--a); }

/* ── Panels ── */
.pnl { display: none; flex-direction: column; flex: 1; overflow: hidden; }
.pnl.on { display: flex; }

/* ── Chat panel ── */
.chat-hdr { display: flex; align-items: center; padding: 8px 14px; background: var(--sf); border-bottom: 1px solid var(--br); gap: 8px; flex-shrink: 0; }
.chat-hdr-lbl { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--mu); flex: 1; letter-spacing: .1em; }
.icon-btn { background: transparent; border: 1px solid var(--br); border-radius: 6px; color: var(--mu); font-size: .8rem; padding: 4px 8px; cursor: pointer; transition: border-color .15s, color .15s; }
.icon-btn:active { border-color: var(--a); color: var(--a); }
.msgs { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; -webkit-overflow-scrolling: touch; }
.msg-wrap { display: flex; flex-direction: column; max-width: 90%; }
.msg-wrap.u { align-self: flex-end; align-items: flex-end; }
.msg-wrap.a { align-self: flex-start; align-items: flex-start; }
.msg { padding: 10px 13px; border-radius: 12px; font-size: .84rem; line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
.msg-wrap.u .msg { background: rgba(0,240,255,.13); border: 1px solid rgba(0,240,255,.28); color: var(--tx); border-bottom-right-radius: 4px; }
.msg-wrap.a .msg { background: var(--sf2); border: 1px solid var(--br2); color: var(--tx); border-bottom-left-radius: 4px; }
.msg-ts { font-size: .58rem; color: var(--mu); margin-top: 3px; font-family: ui-monospace, monospace; }
.typing-dot { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--a); margin: 0 2px; animation: td .9s infinite; }
.typing-dot:nth-child(2) { animation-delay: .2s; }
.typing-dot:nth-child(3) { animation-delay: .4s; }
@keyframes td { 0%,80%,100% { opacity: .2; transform: scale(.8); } 40% { opacity: 1; transform: scale(1); } }
.chat-in { display: flex; gap: 8px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: var(--sf); border-top: 1px solid var(--br); flex-shrink: 0; align-items: center; }
input.ci { flex: 1; background: rgba(255,255,255,.05); border: 1px solid var(--br2); border-radius: 10px; color: var(--tx); padding: 10px 12px; font-size: .86rem; outline: none; min-width: 0; }
input.ci:focus { border-color: var(--a); box-shadow: 0 0 0 2px rgba(0,240,255,.08); }
.sbtn { background: var(--a); color: #000; border: none; border-radius: 10px; padding: 10px 16px; font-weight: 700; font-size: .8rem; cursor: pointer; font-family: ui-monospace, monospace; flex-shrink: 0; }
.sbtn:active { opacity: .85; }
.voice-btn { background: transparent; border: 1px solid var(--br2); border-radius: 10px; color: var(--mu); font-size: 1.1rem; padding: 8px 10px; cursor: pointer; flex-shrink: 0; transition: border-color .15s, color .15s; }
.voice-btn.recording { border-color: var(--red); color: var(--red); animation: pulse-rec 1s infinite; }
@keyframes pulse-rec { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

/* ── Terminal panel ── */
.ptyout { flex: 1; overflow-y: auto; padding: 10px 12px; font-family: ui-monospace, 'SF Mono', monospace; font-size: .7rem; line-height: 1.7; background: #020305; color: #a8ffb0; word-break: break-all; -webkit-overflow-scrolling: touch; white-space: pre-wrap; }
.qkeys { display: flex; gap: 5px; padding: 7px 12px; background: var(--sf); border-top: 1px solid var(--br); overflow-x: auto; flex-shrink: 0; -webkit-overflow-scrolling: touch; }
.qkeys::-webkit-scrollbar { display: none; }
.qk { background: rgba(255,255,255,.06); border: 1px solid var(--br2); color: var(--tx); padding: 5px 11px; border-radius: 6px; font-size: .68rem; cursor: pointer; white-space: nowrap; font-family: ui-monospace, monospace; flex-shrink: 0; -webkit-user-select: none; user-select: none; }
.qk:active { background: rgba(0,240,255,.14); border-color: var(--a); color: var(--a); }
.term-in { display: flex; gap: 8px; padding: 8px 12px calc(8px + env(safe-area-inset-bottom)); background: var(--sf); border-top: 1px solid var(--br); flex-shrink: 0; }

/* ── Actions panel ── */
.actp { padding: 14px; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: calc(14px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 14px; }
.alab { font-size: .62rem; letter-spacing: .16em; color: var(--mu); font-family: ui-monospace, monospace; text-transform: uppercase; margin-bottom: 2px; }
.agrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.agrid.wide { grid-template-columns: repeat(4, 1fr); }
.abtn { background: var(--sf2); border: 1px solid var(--br); color: var(--tx); padding: 11px 4px; border-radius: 10px; font-size: .67rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; -webkit-user-select: none; user-select: none; transition: border-color .12s, background .12s; font-family: ui-monospace, monospace; }
.abtn:active { border-color: var(--a); background: rgba(0,240,255,.09); color: var(--a); }
.abtn-icon { font-size: 1.25rem; line-height: 1; }
.abtn.danger:active { border-color: var(--red); background: rgba(255,95,95,.09); color: var(--red); }
.persona-row { display: flex; gap: 8px; align-items: center; }
.persona-sel { flex: 1; background: rgba(255,255,255,.05); border: 1px solid var(--br2); border-radius: 8px; color: var(--tx); padding: 9px 12px; font-size: .8rem; font-family: ui-monospace, monospace; outline: none; -webkit-appearance: none; }
.persona-sel:focus { border-color: var(--a); }
.persona-go { background: var(--a); color: #000; border: none; border-radius: 8px; padding: 9px 16px; font-weight: 700; font-size: .78rem; cursor: pointer; font-family: ui-monospace, monospace; }

/* ── Prompts panel ── */
.promptsp { padding: 12px; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: calc(12px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 7px; }
.qprompt { background: var(--sf2); border: 1px solid var(--br); border-radius: 10px; padding: 12px 14px; font-size: .82rem; cursor: pointer; line-height: 1.45; -webkit-user-select: none; user-select: none; color: var(--tx); transition: border-color .12s, background .12s; }
.qprompt:active { border-color: var(--a); background: rgba(0,240,255,.07); color: var(--a); }
.qprompt-cat { font-size: .58rem; letter-spacing: .14em; text-transform: uppercase; color: var(--mu); font-family: ui-monospace, monospace; margin-top: 10px; margin-bottom: 2px; }

/* ── Status bar ── */
.statusbar { display: flex; align-items: center; gap: 10px; padding: 6px 14px; background: var(--sf); border-top: 1px solid var(--br); flex-shrink: 0; font-size: .62rem; color: var(--mu); font-family: ui-monospace, monospace; }
.statusbar-ping { margin-left: auto; }
</style>
</head>
<body>

<!-- ── Connect screen ── -->
<div id="sc">
  <div>
    <div class="brand">NEURODECK</div>
    <div class="brand-sub">REMOTE CONTROL</div>
  </div>
  <div class="spin" id="spin"></div>
  <div class="stxt" id="stxt">Connecting...</div>
  <div class="emsg" id="emsg" style="display:none"></div>
  <button class="rbtn" id="rbtn" style="display:none" onclick="doConnect()">Retry</button>
</div>

<!-- ── Main shell ── -->
<div id="sm">
  <div class="topbar">
    <span class="topbar-t">NEURODECK</span>
    <span class="topbar-agent" id="topbar-agent">—</span>
    <div class="cdot" id="cdot"></div>
  </div>

  <div class="tabs">
    <button class="tab on"  onclick="showTab('chat',this)">💬 CHAT</button>
    <button class="tab"     onclick="showTab('terminal',this)">💻 TERM</button>
    <button class="tab"     onclick="showTab('actions',this)">⚡ ACTIONS</button>
    <button class="tab"     onclick="showTab('prompts',this)">🎯 PROMPTS</button>
  </div>

  <!-- CHAT -->
  <div class="pnl on" id="p-chat">
    <div class="chat-hdr">
      <span class="chat-hdr-lbl" id="chat-lbl">AI CHAT</span>
      <button class="icon-btn" title="Cancel generation" onclick="s({type:'cancel_generation'})">⛔</button>
      <button class="icon-btn" title="New session" onclick="s({type:'new_session'})">🔄</button>
      <button class="icon-btn" title="Clear display" onclick="clearMsgs()">🗑</button>
    </div>
    <div class="msgs" id="msgs"></div>
    <div class="chat-in">
      <button class="voice-btn" id="voice-btn" onclick="toggleVoice()" title="Voice input">🎤</button>
      <input class="ci" id="ci" type="text" placeholder="Message NEURODECK..." autocomplete="off" autocorrect="off" autocapitalize="sentences">
      <button class="sbtn" onclick="sendChat()">SEND</button>
    </div>
  </div>

  <!-- TERMINAL -->
  <div class="pnl" id="p-terminal">
    <div class="ptyout" id="ptyout"></div>
    <div class="qkeys" id="qkeys-row">
      <button class="qk" onclick="sp('\r')">↵ Enter</button>
      <button class="qk" onclick="sp('\x03')">^C</button>
      <button class="qk" onclick="sp('\x04')">^D</button>
      <button class="qk" onclick="sp('\x0c')">^L</button>
      <button class="qk" onclick="sp('\x1a')">^Z</button>
      <button class="qk" onclick="sp('\x1b')">ESC</button>
      <button class="qk" onclick="sp('\x09')">TAB</button>
      <button class="qk" onclick="sp('\x1b[A')">▲</button>
      <button class="qk" onclick="sp('\x1b[B')">▼</button>
      <button class="qk" onclick="sp('ls -la\r')">ls -la</button>
      <button class="qk" onclick="sp('pwd\r')">pwd</button>
      <button class="qk" onclick="sp('cd ~\r')">cd ~</button>
      <button class="qk" onclick="sp('clear\r')">clear</button>
      <button class="qk" onclick="sp('exit\r')">exit</button>
      <button class="qk" onclick="sp('sudo !!\r')">sudo !!</button>
    </div>
    <div class="term-in">
      <input class="ci" id="ptyi" type="text" placeholder="$ command..." autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
      <button class="sbtn" onclick="sendPtyIn()">↵</button>
    </div>
  </div>

  <!-- ACTIONS -->
  <div class="pnl actp" id="p-actions">
    <div>
      <div class="alab">Navigate</div>
      <div class="agrid wide">
        <button class="abtn" onclick="nav('chat')"><span class="abtn-icon">💬</span>Chat</button>
        <button class="abtn" onclick="nav('terminal')"><span class="abtn-icon">💻</span>Terminal</button>
        <button class="abtn" onclick="nav('canvas')"><span class="abtn-icon">🎨</span>Canvas</button>
        <button class="abtn" onclick="nav('agent')"><span class="abtn-icon">🤖</span>Agent</button>
        <button class="abtn" onclick="nav('memory')"><span class="abtn-icon">🧠</span>Memory</button>
        <button class="abtn" onclick="nav('browser')"><span class="abtn-icon">🌐</span>Browser</button>
        <button class="abtn" onclick="nav('ssh')"><span class="abtn-icon">🔒</span>SSH</button>
        <button class="abtn" onclick="nav('tunnel')"><span class="abtn-icon">🔗</span>Tunnel</button>
        <button class="abtn" onclick="nav('share')"><span class="abtn-icon">📡</span>Share</button>
        <button class="abtn" onclick="nav('transfer')"><span class="abtn-icon">📂</span>Files</button>
        <button class="abtn" onclick="nav('prompt-lab')"><span class="abtn-icon">✨</span>PromptLab</button>
        <button class="abtn" onclick="nav('remote')"><span class="abtn-icon">📱</span>Remote</button>
      </div>
    </div>
    <div>
      <div class="alab">AI Agent</div>
      <div class="agrid" id="agent-grid">
        <button class="abtn" onclick="s({type:'switch_agent',id:'gemini-flash-lite'})"><span class="abtn-icon">⚡</span>Flash Lite</button>
        <button class="abtn" onclick="s({type:'switch_agent',id:'gemini-flash'})"><span class="abtn-icon">☁️</span>Flash</button>
        <button class="abtn" onclick="s({type:'switch_agent',id:'local-gemma2b'})"><span class="abtn-icon">🏠</span>Gemma 2B</button>
      </div>
    </div>
    <div>
      <div class="alab">Persona</div>
      <div class="persona-row">
        <select class="persona-sel" id="persona-sel">
          <option value="Default">Default</option>
          <option value="Developer">Developer</option>
          <option value="Cyberpunk">Cyberpunk</option>
          <option value="John">John (PM)</option>
          <option value="Sally">Sally (UX)</option>
          <option value="Winston">Winston (CTO)</option>
          <option value="Amelia">Amelia (Sec)</option>
          <option value="Paige">Paige (DS)</option>
          <option value="Mary">Mary (Ops)</option>
        </select>
        <button class="persona-go" onclick="applyPersona()">SET</button>
      </div>
    </div>
    <div>
      <div class="alab">System</div>
      <div class="agrid">
        <button class="abtn" onclick="s({type:'theme_cycle'})"><span class="abtn-icon">🎨</span>Theme</button>
        <button class="abtn" onclick="s({type:'open_settings'})"><span class="abtn-icon">⚙️</span>Settings</button>
        <button class="abtn" onclick="s({type:'mute_toggle'})"><span class="abtn-icon">🔊</span>Mute</button>
        <button class="abtn" onclick="s({type:'new_session'})"><span class="abtn-icon">🔄</span>New Session</button>
        <button class="abtn" onclick="s({type:'cancel_generation'})"><span class="abtn-icon">⛔</span>Cancel Gen</button>
        <button class="abtn danger" onclick="doDisconnect()"><span class="abtn-icon">🔌</span>Disconnect</button>
      </div>
    </div>
  </div>

  <!-- PROMPTS -->
  <div class="pnl promptsp" id="p-prompts">
    <div class="qprompt-cat">Explanation</div>
    <div class="qprompt" onclick="qp('Explain your last response in simpler terms.')">Explain that more simply</div>
    <div class="qprompt" onclick="qp('Give me a one-sentence summary of what you just said.')">Summarize in one sentence</div>
    <div class="qprompt" onclick="qp('ELI5 — explain like I\\'m five years old.')">ELI5</div>
    <div class="qprompt-cat">Formatting</div>
    <div class="qprompt" onclick="qp('Rewrite your last response as a concise bullet-point list.')">Give me bullet points</div>
    <div class="qprompt" onclick="qp('Format your last response as a numbered step-by-step guide.')">Step-by-step guide</div>
    <div class="qprompt" onclick="qp('Give me a table comparing the key options or concepts.')">Show as a table</div>
    <div class="qprompt-cat">Code</div>
    <div class="qprompt" onclick="qp('Give me a minimal working code example for this.')">Code example</div>
    <div class="qprompt" onclick="qp('Review the code for bugs, edge cases, and security issues.')">Code review</div>
    <div class="qprompt" onclick="qp('Refactor this code to be cleaner and more idiomatic.')">Refactor</div>
    <div class="qprompt-cat">Exploration</div>
    <div class="qprompt" onclick="qp('What are the main alternatives or tradeoffs?')">Alternatives &amp; tradeoffs</div>
    <div class="qprompt" onclick="qp('What are potential problems or risks with this approach?')">Risks &amp; problems</div>
    <div class="qprompt" onclick="qp('Continue from where you left off.')">Continue</div>
    <div class="qprompt" onclick="qp('Go deeper — give me more detail on the most important part.')">Go deeper</div>
    <div class="qprompt-cat">Steam Deck</div>
    <div class="qprompt" onclick="qp('Give me tips for optimizing this for Steam Deck (AMD APU, 16GB unified RAM, SteamOS).')">Optimize for Steam Deck</div>
    <div class="qprompt" onclick="qp('How do I do this in a SteamOS/Linux terminal?')">How to do this on SteamOS</div>
  </div>

  <div class="statusbar">
    <span id="status-txt">● Connected</span>
    <span class="statusbar-ping" id="ping-txt"></span>
  </div>
</div>

<script>
var ws=null, authed=false, curAi=null, pingT=null, pingStart=0;
var recog=null, isRecording=false, cmdHist=[], histIdx=-1;

function gp(n){
  try{var h=location.hash.substring(1);return new URLSearchParams(h).get(n);}catch(e){return null;}
}
function setS(t){document.getElementById('stxt').textContent=t;}
function showErr(m){
  document.getElementById('emsg').textContent=m;
  document.getElementById('emsg').style.display='';
  document.getElementById('spin').style.display='none';
  document.getElementById('rbtn').style.display='';
}

function doConnect(){
  document.getElementById('emsg').style.display='none';
  document.getElementById('rbtn').style.display='none';
  document.getElementById('spin').style.display='';
  var pin=gp('pin');
  if(!pin){showErr('No PIN found. Scan the QR code in NEURODECK Remote settings.');return;}
  var host=location.host;
  setS('Connecting to '+host+'…');
  ws=new WebSocket('ws://'+host+'/ws');
  ws.onopen=function(){setS('Authenticating…');ws.send(JSON.stringify({type:'auth',pin:pin}));};
  ws.onmessage=function(ev){
    var m;try{m=JSON.parse(ev.data);}catch(ex){return;}
    if(m.type==='hello') return;
    if(m.type==='auth_ok'){
      authed=true;
      document.getElementById('sc').style.display='none';
      document.getElementById('sm').style.display='flex';
      startPing();
    } else if(m.type==='auth_fail'){
      showErr('Auth failed: '+(m.reason||'Invalid token'));
    } else if(m.type==='pty_output'){
      appendPty(m.data);
    } else if(m.type==='chat_token'){
      appendToken(m.text, m.done);
    } else if(m.type==='pong'){
      var lat=Date.now()-pingStart;
      document.getElementById('ping-txt').textContent=lat+'ms';
    } else if(m.type==='agent_name'){
      document.getElementById('topbar-agent').textContent=m.name||'—';
    } else if(m.type==='error'){
      appendMsg('a','⚠ '+m.message);
    }
  };
  ws.onerror=function(){showErr('Connection error. Ensure your phone and NEURODECK are on the same Wi-Fi. If using an in-app browser, copy the URL and open in Safari or Chrome.');};
  ws.onclose=function(){
    clearInterval(pingT);
    document.getElementById('cdot').style.background='var(--red)';
    document.getElementById('status-txt').textContent='● Disconnected';
    if(!authed) showErr('Connection closed. Make sure the remote server is running.');
  };
}

function s(obj){if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj));}
function nav(v){s({type:'navigate',view:v});}
function sp(d){s({type:'pty',data:d,id:'main_pty_session'});}
function qp(text){appendMsg('u',text);s({type:'chat',text:text});}

function sendChat(){
  var inp=document.getElementById('ci'), t=inp.value.trim();
  if(!t) return;
  inp.value=''; curAi=null;
  appendMsg('u',t);
  s({type:'chat',text:t});
}

function sendPtyIn(){
  var inp=document.getElementById('ptyi'), v=inp.value;
  if(!v) return;
  if(v.trim()) cmdHist.unshift(v);
  if(cmdHist.length>50) cmdHist.length=50;
  histIdx=-1;
  inp.value='';
  sp(v+'\r');
}

function applyPersona(){
  var n=document.getElementById('persona-sel').value;
  s({type:'persona',name:n});
}

function clearMsgs(){
  document.getElementById('msgs').innerHTML='';
  curAi=null;
}

function appendToken(t, done){
  if(!curAi){
    var w=document.createElement('div'); w.className='msg-wrap a';
    curAi=document.createElement('div'); curAi.className='msg';
    w.appendChild(curAi);
    document.getElementById('msgs').appendChild(w);
  }
  curAi.textContent+=t;
  if(done) curAi=null;
  var l=document.getElementById('msgs'); l.scrollTop=l.scrollHeight;
}

function appendMsg(role, text){
  curAi=null;
  var w=document.createElement('div'); w.className='msg-wrap '+role;
  var m=document.createElement('div'); m.className='msg'; m.textContent=text;
  var ts=document.createElement('div'); ts.className='msg-ts';
  var now=new Date(); ts.textContent=now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  w.appendChild(m); w.appendChild(ts);
  var l=document.getElementById('msgs'); l.appendChild(w); l.scrollTop=l.scrollHeight;
}

function stripAnsi(s){return s.replace(/\x1b\[[0-9;]*[mGKHFJABCDEFSTfsuhl]/g,'');}
function appendPty(d){
  var el=document.getElementById('ptyout');
  el.textContent+=stripAnsi(d);
  if(el.textContent.length>12000) el.textContent=el.textContent.slice(-9000);
  el.scrollTop=el.scrollHeight;
}

function showTab(id, btn){
  document.querySelectorAll('.pnl').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  document.getElementById('p-'+id).classList.add('on');
  btn.classList.add('on');
}

function startPing(){
  pingT=setInterval(function(){pingStart=Date.now();s({type:'ping'});},5000);
}
function doDisconnect(){if(ws)ws.close();}

// ── Voice input (Web Speech API) ──
function toggleVoice(){
  var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert('Voice input not supported in this browser. Try Chrome or Safari.');return;}
  if(isRecording){
    if(recog) recog.stop();
    return;
  }
  recog=new SR();
  recog.continuous=false; recog.interimResults=false; recog.lang='en-US';
  recog.onstart=function(){
    isRecording=true;
    document.getElementById('voice-btn').classList.add('recording');
  };
  recog.onresult=function(e){
    var transcript=e.results[0][0].transcript;
    document.getElementById('ci').value=transcript;
  };
  recog.onend=function(){
    isRecording=false;
    document.getElementById('voice-btn').classList.remove('recording');
  };
  recog.onerror=function(){
    isRecording=false;
    document.getElementById('voice-btn').classList.remove('recording');
  };
  recog.start();
}

// ── Keyboard ──
document.addEventListener('keydown',function(e){
  var ci=document.getElementById('ci');
  var ptyi=document.getElementById('ptyi');
  if(document.activeElement===ci&&e.key==='Enter') sendChat();
  if(document.activeElement===ptyi){
    if(e.key==='Enter') sendPtyIn();
    if(e.key==='ArrowUp'&&cmdHist.length){e.preventDefault();histIdx=Math.min(histIdx+1,cmdHist.length-1);ptyi.value=cmdHist[histIdx];}
    if(e.key==='ArrowDown'){e.preventDefault();histIdx=Math.max(histIdx-1,-1);ptyi.value=histIdx<0?'':cmdHist[histIdx];}
  }
});

doConnect();
</script>
</body>
</html>"#;

// ── Shared state ──────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct WsAppState {
    pub pin: String,
    pub broadcast_tx: tokio::sync::broadcast::Sender<String>,
    pub connected: Arc<AtomicUsize>,
    pub app_handle: AppHandle,
    pub ip_attempts: Arc<std::sync::Mutex<std::collections::HashMap<std::net::IpAddr, usize>>>,
}

pub struct RemoteServerHandle {
    pub port: u16,
    pub local_ip: String,
    pub pin: String,
    pub broadcast_tx: tokio::sync::broadcast::Sender<String>,
    pub connected: Arc<AtomicUsize>,
    pub shutdown_tx: tokio::sync::oneshot::Sender<()>,
}

pub struct RemoteControlState {
    pub handle: std::sync::Mutex<Option<RemoteServerHandle>>,
}

impl Default for RemoteControlState {
    fn default() -> Self {
        Self {
            handle: std::sync::Mutex::new(None),
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

pub fn get_local_ip() -> String {
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

fn generate_pin() -> String {
    let mut rng = rand::thread_rng();
    let val: u128 = rng.gen();
    format!("{:032x}", val)
}

// ── Axum route handlers ───────────────────────────────────────────────────────

async fn root_handler() -> impl IntoResponse {
    println!("[DEBUG remote_control] root_handler: serving WEBAPP_HTML");
    Html(WEBAPP_HTML)
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    addr_opt: Option<ConnectInfo<SocketAddr>>,
    State(state): State<WsAppState>,
) -> impl IntoResponse {
    let ip = addr_opt
        .map(|ConnectInfo(addr)| addr.ip())
        .unwrap_or_else(|| "127.0.0.1".parse().unwrap());
    println!(
        "[DEBUG remote_control] ws_handler: incoming connection request from IP {:?}",
        ip
    );

    // Lockout check
    {
        let attempts_map = state.ip_attempts.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(&attempts) = attempts_map.get(&ip) {
            if attempts >= 5 {
                println!("[DEBUG remote_control] ws_handler: IP locked out {:?}", ip);
                return (
                    axum::http::StatusCode::FORBIDDEN,
                    "Lockout: Too many failed connection attempts.",
                )
                    .into_response();
            }
        }
    }

    ws.on_upgrade(move |socket| handle_ws_connection(socket, ip, state))
}

async fn handle_ws_connection(socket: WebSocket, ip: std::net::IpAddr, ws_state: WsAppState) {
    println!(
        "[DEBUG remote_control] handle_ws_connection: upgraded connection for {:?}",
        ip
    );
    let (mut sender, mut receiver) = socket.split();

    // Send hello
    println!("[DEBUG remote_control] handle_ws_connection: sending hello frame");
    let _ = sender
        .send(Message::Text(
            json!({"type":"hello","version":"1.0"}).to_string(),
        ))
        .await;

    // Authenticate
    let mut authed = false;
    println!("[DEBUG remote_control] handle_ws_connection: waiting for auth message...");
    while let Some(res) = receiver.next().await {
        println!(
            "[DEBUG remote_control] handle_ws_connection: received frame: {:?}",
            res
        );
        match res {
            Ok(Message::Text(txt)) => {
                if let Ok(msg) = serde_json::from_str::<Value>(&txt) {
                    if msg["type"] == "auth" {
                        if msg["pin"].as_str() == Some(ws_state.pin.as_str()) {
                            println!("[DEBUG remote_control] handle_ws_connection: authentication succeeded for {:?}", ip);
                            let _ = sender
                                .send(Message::Text(json!({"type":"auth_ok"}).to_string()))
                                .await;
                            authed = true;
                        } else {
                            println!("[DEBUG remote_control] handle_ws_connection: invalid PIN from {:?}", ip);
                        }
                        break;
                    }
                }
            }
            Ok(Message::Close(_)) | Err(_) => {
                break;
            }
            _ => {} // Skip other message types during auth handshake
        }
    }

    if !authed {
        {
            let mut attempts_map = ws_state
                .ip_attempts
                .lock()
                .unwrap_or_else(|e| e.into_inner());
            let entry = attempts_map.entry(ip).or_insert(0);
            *entry += 1;
        }
        let _ = sender
            .send(Message::Text(
                json!({"type":"auth_fail","reason":"Invalid PIN"}).to_string(),
            ))
            .await;
        // Sleep 2s to rate limit
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        return;
    }

    // Reset attempts on success
    {
        let mut attempts_map = ws_state
            .ip_attempts
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        attempts_map.remove(&ip);
    }

    ws_state.connected.fetch_add(1, Ordering::Relaxed);
    let count = ws_state.connected.load(Ordering::Relaxed);
    let _ = ws_state.app_handle.emit("remote_client_connected", count);

    let mut rx = ws_state.broadcast_tx.subscribe();
    let app_handle = ws_state.app_handle.clone();

    println!("[DEBUG remote_control] handle_ws_connection: spawning fwd_task and recv_task");

    // Broadcast → WS forward task
    let mut fwd_task = tokio::spawn(async move {
        println!("[DEBUG remote_control] fwd_task: started");
        while let Ok(msg) = rx.recv().await {
            println!(
                "[DEBUG remote_control] fwd_task: forwarding message to client: {}",
                msg
            );
            if sender.send(Message::Text(msg)).await.is_err() {
                println!("[DEBUG remote_control] fwd_task: send failed");
                break;
            }
        }
        println!("[DEBUG remote_control] fwd_task: terminated");
    });

    // WS → app dispatch task
    let mut recv_task = tokio::spawn(async move {
        println!("[DEBUG remote_control] recv_task: started");
        while let Some(res) = receiver.next().await {
            println!("[DEBUG remote_control] recv_task: received frame {:?}", res);
            match res {
                Ok(Message::Text(txt)) => {
                    if let Ok(msg) = serde_json::from_str::<Value>(&txt) {
                        dispatch_remote_command(&msg, &app_handle).await;
                    }
                }
                Ok(Message::Close(_)) | Err(_) => {
                    break;
                }
                _ => {} // Skip ping/pong/binary/etc.
            }
        }
        println!("[DEBUG remote_control] recv_task: terminated");
    });

    tokio::select! {
        res = (&mut fwd_task)  => {
            println!("[DEBUG remote_control] fwd_task finished select: {:?}", res);
            recv_task.abort();
        }
        res = (&mut recv_task) => {
            println!("[DEBUG remote_control] recv_task finished select: {:?}", res);
            fwd_task.abort();
        }
    }

    println!("[DEBUG remote_control] handle_ws_connection: connection tasks finished, cleaning up");

    ws_state.connected.fetch_sub(1, Ordering::Relaxed);
    let count = ws_state.connected.load(Ordering::Relaxed);
    let _ = ws_state
        .app_handle
        .emit("remote_client_disconnected", count);
}

async fn dispatch_remote_command(msg: &Value, app: &AppHandle) {
    match msg["type"].as_str() {
        Some("chat") => {
            if let Some(text) = msg["text"].as_str() {
                let _ = app.emit("remote_chat", text.to_string());
            }
        }
        Some("pty") => {
            let id = msg["id"].as_str().unwrap_or("main_pty_session").to_string();
            if let Some(data) = msg["data"].as_str() {
                let _ = app.emit("remote_pty", json!({"id": id, "data": data}).to_string());
            }
        }
        Some("navigate") => {
            if let Some(view) = msg["view"].as_str() {
                let _ = app.emit("remote_navigate", view.to_string());
            }
        }
        Some("persona") => {
            if let Some(name) = msg["name"].as_str() {
                let _ = app.emit("remote_set_persona", name.to_string());
            }
        }
        Some("persona_next") => {
            let _ = app.emit("remote_persona_cycle", 1i32);
        }
        Some("persona_prev") => {
            let _ = app.emit("remote_persona_cycle", -1i32);
        }
        Some("theme_cycle") => {
            let _ = app.emit("remote_theme_cycle", ());
        }
        Some("open_settings") => {
            let _ = app.emit("remote_open_settings", ());
        }
        Some("new_session") => {
            let _ = app.emit("remote_new_session", ());
        }
        Some("cancel_generation") => {
            let _ = app.emit("remote_cancel_generation", ());
        }
        Some("mute_toggle") => {
            let _ = app.emit("remote_mute_toggle", ());
        }
        Some("switch_agent") => {
            if let Some(id) = msg["id"].as_str() {
                let _ = app.emit("remote_switch_agent", id.to_string());
            }
        }
        Some("ping") => {} // handled client-side
        _ => {}
    }
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn start_remote_server(
    port: u16,
    app_handle: AppHandle,
    state: TauriState<'_, RemoteControlState>,
    pty_state: TauriState<'_, crate::pty_manager::PtyState>,
) -> Result<serde_json::Value, String> {
    // Stop any existing server
    {
        let mut guard = state.handle.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(old) = guard.take() {
            let _ = old.shutdown_tx.send(());
        }
    }

    let pin = generate_pin();
    let local_ip = get_local_ip();
    let (broadcast_tx, _) = tokio::sync::broadcast::channel::<String>(256);
    let connected = Arc::new(AtomicUsize::new(0));
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let ws_state = WsAppState {
        pin: pin.clone(),
        broadcast_tx: broadcast_tx.clone(),
        connected: connected.clone(),
        app_handle: app_handle.clone(),
        ip_attempts: Arc::new(std::sync::Mutex::new(std::collections::HashMap::new())),
    };

    let router = Router::new()
        .route("/", get(root_handler))
        .route("/ws", get(ws_handler))
        .with_state(ws_state);

    let bind_addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| format!("Failed to bind port {}: {}", port, e))?;

    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            })
            .await
            .ok();
    });

    // Wire PTY output forwarding
    {
        let mut rtx = pty_state
            .remote_tx
            .lock()
            .unwrap_or_else(|e| e.into_inner());
        *rtx = Some(broadcast_tx.clone());
    }

    let url = format!("http://{}:{}/#pin={}", local_ip, port, pin);

    {
        let mut guard = state.handle.lock().unwrap_or_else(|e| e.into_inner());
        *guard = Some(RemoteServerHandle {
            port,
            local_ip: local_ip.clone(),
            pin: pin.clone(),
            broadcast_tx,
            connected,
            shutdown_tx,
        });
    }

    Ok(json!({
        "port": port,
        "ip":   local_ip,
        "pin":  pin,
        "url":  url,
    }))
}

#[tauri::command]
pub async fn stop_remote_server(
    state: TauriState<'_, RemoteControlState>,
    pty_state: TauriState<'_, crate::pty_manager::PtyState>,
) -> Result<(), String> {
    let mut guard = state.handle.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(handle) = guard.take() {
        let _ = handle.shutdown_tx.send(());
    }
    let mut rtx = pty_state
        .remote_tx
        .lock()
        .unwrap_or_else(|e| e.into_inner());
    *rtx = None;
    Ok(())
}

#[tauri::command]
pub fn get_remote_server_info(state: TauriState<'_, RemoteControlState>) -> serde_json::Value {
    let guard = state.handle.lock().unwrap_or_else(|e| e.into_inner());
    match guard.as_ref() {
        Some(h) => {
            let connected = h.connected.load(Ordering::Relaxed);
            json!({
                "running":   true,
                "port":      h.port,
                "ip":        h.local_ip,
                "pin":       h.pin,
                "url":       format!("http://{}:{}/#pin={}", h.local_ip, h.port, h.pin),
                "connected": connected,
            })
        }
        None => json!({"running": false}),
    }
}

#[tauri::command]
pub fn remote_send_to_clients(
    message: String,
    state: TauriState<'_, RemoteControlState>,
) -> Result<(), String> {
    let guard = state.handle.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(ref h) = *guard {
        let _ = h.broadcast_tx.send(message);
        Ok(())
    } else {
        Err("Remote server not running".into())
    }
}
