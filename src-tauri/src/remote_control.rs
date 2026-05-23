use std::net::UdpSocket;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
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
:root{--a:#00f0ff;--bg:#06080e;--sf:#0c0e18;--br:rgba(255,255,255,.08);--tx:#e0e0e0;--mu:rgba(255,255,255,.4)}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%;background:var(--bg);color:var(--tx);font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,sans-serif;overscroll-behavior:none}
body{display:flex;flex-direction:column;height:100dvh;height:100vh}
#sc{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:20px;padding:32px;text-align:center}
.brand{font-size:1.3rem;font-weight:700;letter-spacing:.18em;color:var(--a);font-family:ui-monospace,'SF Mono',monospace}
.brand-sub{font-size:.7rem;color:var(--mu);letter-spacing:.22em;font-family:ui-monospace,'SF Mono',monospace;margin-top:4px}
.spin{width:36px;height:36px;border:3px solid var(--br);border-top-color:var(--a);border-radius:50%;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.stxt{font-size:.83rem;color:var(--mu)}
.emsg{color:#ff5f5f;font-size:.82rem;max-width:280px;line-height:1.5}
.rbtn{background:transparent;border:1px solid var(--a);color:var(--a);padding:10px 24px;border-radius:8px;font-size:.85rem;cursor:pointer;font-family:ui-monospace,monospace;letter-spacing:.06em}
#sm{display:none;flex-direction:column;flex:1;overflow:hidden}
.topbar{display:flex;align-items:center;padding:calc(12px + env(safe-area-inset-top)) 16px 12px;background:var(--sf);border-bottom:1px solid var(--br);gap:8px;flex-shrink:0}
.topbar-t{font-family:ui-monospace,monospace;font-size:.72rem;font-weight:700;letter-spacing:.14em;color:var(--a)}
.cdot{width:8px;height:8px;border-radius:50%;background:var(--a);box-shadow:0 0 6px var(--a);flex-shrink:0;margin-left:auto;transition:.3s}
.tabs{display:flex;background:var(--sf);border-bottom:1px solid var(--br);flex-shrink:0}
.tab{flex:1;padding:11px 4px;background:none;border:none;border-bottom:2px solid transparent;color:var(--mu);font-size:.72rem;letter-spacing:.08em;font-family:ui-monospace,monospace;cursor:pointer;transition:.15s;text-transform:uppercase}
.tab.on{color:var(--a);border-bottom-color:var(--a)}
.pnl{display:none;flex-direction:column;flex:1;overflow:hidden}
.pnl.on{display:flex}
.msgs{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}
.msg{padding:10px 13px;border-radius:10px;font-size:.85rem;line-height:1.5;max-width:88%;word-break:break-word}
.msg.u{background:rgba(0,240,255,.12);align-self:flex-end;border:1px solid rgba(0,240,255,.25)}
.msg.a{background:var(--sf);align-self:flex-start;border:1px solid var(--br)}
.cin{display:flex;gap:8px;padding:10px 14px calc(10px + env(safe-area-inset-bottom));background:var(--sf);border-top:1px solid var(--br);flex-shrink:0}
input.ci{flex:1;background:rgba(255,255,255,.06);border:1px solid var(--br);border-radius:8px;color:var(--tx);padding:10px 12px;font-size:.88rem;outline:none;min-width:0}
input.ci:focus{border-color:var(--a)}
.sbtn{background:var(--a);color:#000;border:none;border-radius:8px;padding:10px 14px;font-weight:700;font-size:.82rem;cursor:pointer;font-family:ui-monospace,monospace;flex-shrink:0}
.ptyout{flex:1;overflow-y:auto;padding:10px 12px;font-family:ui-monospace,monospace;font-size:.72rem;line-height:1.65;background:#020305;color:#a8ffa8;word-break:break-all;-webkit-overflow-scrolling:touch;white-space:pre-wrap}
.qkeys{display:flex;gap:6px;padding:8px 12px;background:var(--sf);border-top:1px solid var(--br);overflow-x:auto;flex-shrink:0;-webkit-overflow-scrolling:touch}
.qkeys::-webkit-scrollbar{display:none}
.qk{background:rgba(255,255,255,.07);border:1px solid var(--br);color:var(--tx);padding:6px 12px;border-radius:6px;font-size:.72rem;cursor:pointer;white-space:nowrap;font-family:ui-monospace,monospace;flex-shrink:0;-webkit-user-select:none;user-select:none}
.qk:active{background:rgba(0,240,255,.15);border-color:var(--a)}
.actp{padding:16px 14px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(16px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px}
.alab{font-size:.65rem;letter-spacing:.14em;color:var(--mu);font-family:ui-monospace,monospace;text-transform:uppercase}
.agrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.abtn{background:var(--sf);border:1px solid var(--br);color:var(--tx);padding:12px 6px;border-radius:10px;font-size:.72rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;-webkit-user-select:none;user-select:none;transition:.12s}
.abtn:active{border-color:var(--a);background:rgba(0,240,255,.08)}
.abtn-icon{font-size:1.35rem}
.ping-row{display:flex;align-items:center;gap:8px;padding:8px 14px;background:var(--sf);border-top:1px solid var(--br);flex-shrink:0;font-size:.7rem;color:var(--mu);font-family:ui-monospace,monospace}
</style>
</head>
<body>
<div id="sc">
  <div><div class="brand">NEURODECK</div><div class="brand-sub">REMOTE CONTROL</div></div>
  <div class="spin" id="spin"></div>
  <div class="stxt" id="stxt">Connecting...</div>
  <div class="emsg" id="emsg" style="display:none"></div>
  <button class="rbtn" id="rbtn" style="display:none" onclick="doConnect()">Retry Connection</button>
</div>
<div id="sm">
  <div class="topbar">
    <span class="topbar-t">NEURODECK REMOTE</span>
    <div class="cdot" id="cdot"></div>
  </div>
  <div class="tabs">
    <button class="tab on" onclick="showTab('chat',this)">CHAT</button>
    <button class="tab" onclick="showTab('terminal',this)">TERMINAL</button>
    <button class="tab" onclick="showTab('actions',this)">ACTIONS</button>
  </div>
  <div class="pnl on" id="p-chat">
    <div class="msgs" id="msgs"></div>
    <div class="cin">
      <input class="ci" id="ci" type="text" placeholder="Message NEURODECK..." autocomplete="off" autocorrect="off" autocapitalize="sentences">
      <button class="sbtn" onclick="sendChat()">SEND</button>
    </div>
  </div>
  <div class="pnl" id="p-terminal">
    <div class="ptyout" id="ptyout"></div>
    <div class="qkeys">
      <button class="qk" onclick="sp('\r')">&#x23CE; Enter</button>
      <button class="qk" onclick="sp('\x03')">&#x2303;C</button>
      <button class="qk" onclick="sp('\x04')">&#x2303;D</button>
      <button class="qk" onclick="sp('\x1b')">ESC</button>
      <button class="qk" onclick="sp('ls\r')">ls</button>
      <button class="qk" onclick="sp('pwd\r')">pwd</button>
      <button class="qk" onclick="sp('clear\r')">clear</button>
      <button class="qk" onclick="sp('exit\r')">exit</button>
    </div>
    <div class="cin">
      <input class="ci" id="ptyi" type="text" placeholder="$ command..." autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
      <button class="sbtn" onclick="sendPtyIn()">&#x23CE;</button>
    </div>
  </div>
  <div class="pnl actp" id="p-actions">
    <div class="alab">Navigate to View</div>
    <div class="agrid">
      <button class="abtn" onclick="nav('chat')"><span class="abtn-icon">&#x1F4AC;</span>Chat</button>
      <button class="abtn" onclick="nav('terminal')"><span class="abtn-icon">&#x1F4BB;</span>Terminal</button>
      <button class="abtn" onclick="nav('canvas')"><span class="abtn-icon">&#x1F3A8;</span>Canvas</button>
      <button class="abtn" onclick="nav('agent')"><span class="abtn-icon">&#x1F916;</span>Agent</button>
      <button class="abtn" onclick="nav('memory')"><span class="abtn-icon">&#x1F9E0;</span>Memory</button>
      <button class="abtn" onclick="nav('browser')"><span class="abtn-icon">&#x1F310;</span>Browser</button>
    </div>
    <div class="alab">AI Persona</div>
    <div class="agrid">
      <button class="abtn" onclick="s({type:'persona_prev'})"><span class="abtn-icon">&#x25C0;</span>Prev</button>
      <button class="abtn" onclick="s({type:'persona_next'})"><span class="abtn-icon">&#x25B6;</span>Next</button>
      <button class="abtn" onclick="s({type:'persona',name:'Default'})"><span class="abtn-icon">&#x26A1;</span>Reset</button>
    </div>
    <div class="alab">System</div>
    <div class="agrid">
      <button class="abtn" onclick="s({type:'theme_cycle'})"><span class="abtn-icon">&#x1F3A8;</span>Theme</button>
      <button class="abtn" onclick="s({type:'open_settings'})"><span class="abtn-icon">&#x2699;&#xFE0F;</span>Settings</button>
      <button class="abtn" onclick="doDisconnect()"><span class="abtn-icon">&#x1F50C;</span>Disconnect</button>
    </div>
  </div>
  <div class="ping-row" id="ping-row">
    <span id="ping-txt">&#x25CF; Connected</span>
  </div>
</div>
<script>
var ws=null,authed=false,curAi=null,pingT=null,pingStart=0;

function gp(n){try{return new URL(location.href).searchParams.get(n);}catch(e){return null;}}
function setS(t){document.getElementById('stxt').textContent=t;}
function showErr(m){
  var e=document.getElementById('emsg');e.textContent=m;e.style.display='';
  document.getElementById('spin').style.display='none';
  document.getElementById('rbtn').style.display='';
}

function doConnect(){
  document.getElementById('emsg').style.display='none';
  document.getElementById('rbtn').style.display='none';
  document.getElementById('spin').style.display='';
  var pin=gp('pin');
  if(!pin){showErr('No PIN found. Scan the QR code shown in NEURODECK.');return;}
  var host=location.host;
  setS('Connecting to '+host+'\u2026');
  ws=new WebSocket('ws://'+host+'/ws');
  ws.onopen=function(){setS('Authenticating\u2026');ws.send(JSON.stringify({type:'auth',pin:pin}));};
  ws.onmessage=function(e){
    var m;try{m=JSON.parse(e.data);}catch(ex){return;}
    if(m.type==='hello')return;
    if(m.type==='auth_ok'){
      authed=true;
      document.getElementById('sc').style.display='none';
      document.getElementById('sm').style.display='flex';
      startPing();
    } else if(m.type==='auth_fail'){
      showErr('Auth failed: '+(m.reason||'Wrong PIN'));
    } else if(m.type==='pty_output'){
      appendPty(m.data);
    } else if(m.type==='chat_token'){
      appendToken(m.text,m.done);
    } else if(m.type==='pong'){
      var lat=Date.now()-pingStart;
      document.getElementById('ping-txt').textContent='\u25CF Connected \u2014 '+lat+'ms';
    } else if(m.type==='error'){
      appendMsg('a','\u26A0 '+m.message);
    }
  };
  ws.onerror=function(){showErr('Connection error. Make sure your phone and PC are on the same Wi-Fi network.');};
  ws.onclose=function(){
    clearInterval(pingT);
    if(authed){document.getElementById('cdot').style.background='#ff5f5f';}
    else{showErr('Connection closed. Ensure NEURODECK Remote Server is running.');}
  };
}

function s(obj){if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj));}
function nav(v){s({type:'navigate',view:v});}
function sp(d){s({type:'pty',data:d,id:'main_pty_session'});}

function sendChat(){
  var inp=document.getElementById('ci'),t=inp.value.trim();
  if(!t)return;inp.value='';curAi=null;
  appendMsg('u',t);s({type:'chat',text:t});
}

function sendPtyIn(){
  var inp=document.getElementById('ptyi'),v=inp.value;inp.value='';sp(v+'\r');
}

function appendToken(t,done){
  if(!curAi){curAi=document.createElement('div');curAi.className='msg a';document.getElementById('msgs').appendChild(curAi);}
  curAi.textContent+=t;
  if(done)curAi=null;
  var l=document.getElementById('msgs');l.scrollTop=l.scrollHeight;
}

function appendMsg(r,t){
  curAi=null;var d=document.createElement('div');d.className='msg '+r;d.textContent=t;
  var l=document.getElementById('msgs');l.appendChild(d);l.scrollTop=l.scrollHeight;
}

function appendPty(d){
  var el=document.getElementById('ptyout');el.textContent+=d;
  if(el.textContent.length>10000)el.textContent=el.textContent.slice(-8000);
  el.scrollTop=el.scrollHeight;
}

function showTab(id,btn){
  document.querySelectorAll('.pnl').forEach(function(p){p.classList.remove('on');});
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('on');});
  document.getElementById('p-'+id).classList.add('on');btn.classList.add('on');
}

function startPing(){
  pingT=setInterval(function(){
    pingStart=Date.now();s({type:'ping'});
  },5000);
}

function doDisconnect(){if(ws)ws.close();}

document.getElementById('ci').addEventListener('keydown',function(e){if(e.key==='Enter')sendChat();});
document.getElementById('ptyi').addEventListener('keydown',function(e){if(e.key==='Enter')sendPtyIn();});
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
    format!("{:06}", rng.gen_range(100000u32..999999u32))
}

// ── Axum route handlers ───────────────────────────────────────────────────────

async fn root_handler() -> impl IntoResponse {
    Html(WEBAPP_HTML)
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsAppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_ws_connection(socket, state))
}

async fn handle_ws_connection(socket: WebSocket, ws_state: WsAppState) {
    let (mut sender, mut receiver) = socket.split();

    // Send hello
    let _ = sender
        .send(Message::Text(
            json!({"type":"hello","version":"1.0"}).to_string(),
        ))
        .await;

    // Authenticate
    let authed = match receiver.next().await {
        Some(Ok(Message::Text(txt))) => {
            if let Ok(msg) = serde_json::from_str::<Value>(&txt) {
                if msg["type"] == "auth" && msg["pin"].as_str() == Some(ws_state.pin.as_str()) {
                    let _ = sender
                        .send(Message::Text(json!({"type":"auth_ok"}).to_string()))
                        .await;
                    true
                } else {
                    let _ = sender
                        .send(Message::Text(
                            json!({"type":"auth_fail","reason":"Invalid PIN"}).to_string(),
                        ))
                        .await;
                    false
                }
            } else {
                false
            }
        }
        _ => false,
    };

    if !authed {
        return;
    }

    ws_state.connected.fetch_add(1, Ordering::Relaxed);
    let count = ws_state.connected.load(Ordering::Relaxed);
    let _ = ws_state
        .app_handle
        .emit("remote_client_connected", count);

    let mut rx = ws_state.broadcast_tx.subscribe();
    let app_handle = ws_state.app_handle.clone();

    // Broadcast → WS forward task
    let mut fwd_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // WS → app dispatch task
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(txt))) = receiver.next().await {
            if let Ok(msg) = serde_json::from_str::<Value>(&txt) {
                dispatch_remote_command(&msg, &app_handle).await;
            }
        }
    });

    tokio::select! {
        _ = (&mut fwd_task)  => recv_task.abort(),
        _ = (&mut recv_task) => fwd_task.abort(),
    }

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
                let _ = app.emit(
                    "remote_pty",
                    json!({"id": id, "data": data}).to_string(),
                );
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
        let mut guard = state.handle.lock().unwrap();
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
    };

    let router = Router::new()
        .route("/", get(root_handler))
        .route("/ws", get(ws_handler))
        .with_state(ws_state);

    let addr = format!("0.0.0.0:{}", port);
    let listener = tokio::net::TcpListener::bind(&addr)
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
        let mut rtx = pty_state.remote_tx.lock().unwrap();
        *rtx = Some(broadcast_tx.clone());
    }

    let url = format!("http://{}:{}/?pin={}", local_ip, port, pin);

    {
        let mut guard = state.handle.lock().unwrap();
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
    let mut guard = state.handle.lock().unwrap();
    if let Some(handle) = guard.take() {
        let _ = handle.shutdown_tx.send(());
    }
    let mut rtx = pty_state.remote_tx.lock().unwrap();
    *rtx = None;
    Ok(())
}

#[tauri::command]
pub fn get_remote_server_info(state: TauriState<'_, RemoteControlState>) -> serde_json::Value {
    let guard = state.handle.lock().unwrap();
    match guard.as_ref() {
        Some(h) => {
            let connected = h.connected.load(Ordering::Relaxed);
            json!({
                "running":   true,
                "port":      h.port,
                "ip":        h.local_ip,
                "pin":       h.pin,
                "url":       format!("http://{}:{}/?pin={}", h.local_ip, h.port, h.pin),
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
    let guard = state.handle.lock().unwrap();
    if let Some(ref h) = *guard {
        let _ = h.broadcast_tx.send(message);
        Ok(())
    } else {
        Err("Remote server not running".into())
    }
}
