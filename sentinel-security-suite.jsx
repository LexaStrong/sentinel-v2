import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   SENTINEL ENTERPRISE SECURITY SUITE  |  Kali Linux Edition
───────────────────────────────────────────────────────────────────────────── */

const T = {
  bg0:      "#080c12",
  bg1:      "#0d1320",
  bg2:      "#111927",
  bg3:      "#16202e",
  border:   "#1c2a3a",
  border2:  "#243347",
  blue:     "#1d8cf8",
  blueD:    "#1d8cf812",
  cyan:     "#00c9ff",
  cyanD:    "#00c9ff10",
  green:    "#05d9a0",
  greenD:   "#05d9a010",
  amber:    "#f5a623",
  amberD:   "#f5a62312",
  red:      "#ff4757",
  redD:     "#ff475710",
  purple:   "#a855f7",
  purpleD:  "#a855f710",
  text:     "#cdd9e5",
  muted:    "#4d6a80",
  muted2:   "#7a99b0",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', sans-serif; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: ${T.bg1}; }
  ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 3px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
  @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(400px)} }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ping { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
  @keyframes slidein { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
  .row-hover:hover { background: ${T.bg3} !important; }
`;

/* ── Mock Data ─────────────────────────────────────────────────────────────── */
const NAV = [
  { id:"overview",   icon:"⬡",  label:"Command Center" },
  { id:"firewall",   icon:"◈",  label:"Firewall / SPI·DPI" },
  { id:"devices",    icon:"◉",  label:"Device Control" },
  { id:"netscan",    icon:"◎",  label:"Network Scanner" },
  { id:"webscan",    icon:"◍",  label:"Web & App Scanner" },
  { id:"idsips",     icon:"◬",  label:"IDS / IPS Engine" },
  { id:"vpn",        icon:"⬡",  label:"VPN & Tunnels" },
  { id:"infra",      icon:"◫",  label:"Infrastructure" },
  { id:"logs",       icon:"≡",  label:"Logs & Forensics" },
  { id:"settings",   icon:"⚙",  label:"Settings" },
];

const USB_DEVICES = [
  { id:1, name:"Kingston 64GB Flash", type:"USB Storage", port:"USB-A 3.0", status:"BLOCKED", lastSeen:"12:41", trusted:false },
  { id:2, name:"Logitech MX Master 3", type:"HID Mouse",  port:"USB-A 2.0", status:"ALLOWED", lastSeen:"Active", trusted:true  },
  { id:3, name:"YubiKey 5C NFC",       type:"Security Key",port:"USB-C",   status:"ALLOWED", lastSeen:"Active", trusted:true  },
  { id:4, name:"Samsung T7 SSD",       type:"USB Storage", port:"USB-C",   status:"PENDING", lastSeen:"12:38", trusted:false },
  { id:5, name:"Unknown Device",       type:"Unknown",     port:"USB-A 3.0",status:"BLOCKED",lastSeen:"12:20", trusted:false },
];

const FW_RULES = [
  { id:1, name:"Drop ALL inbound (default)",  proto:"ALL", src:"0.0.0.0/0", dst:"ANY", port:"*",    dir:"IN",  action:"DROP",  layer:"SPI", active:true  },
  { id:2, name:"Allow established/related",   proto:"TCP", src:"ANY",       dst:"ANY", port:"*",    dir:"IN",  action:"ALLOW", layer:"SPI", active:true  },
  { id:3, name:"Block SMB external",          proto:"TCP", src:"0.0.0.0/0", dst:"ANY", port:"445",  dir:"IN",  action:"DROP",  layer:"DPI", active:true  },
  { id:4, name:"Block RDP brute force",       proto:"TCP", src:"0.0.0.0/0", dst:"ANY", port:"3389", dir:"IN",  action:"DROP",  layer:"DPI", active:true  },
  { id:5, name:"Rate-limit ICMP",             proto:"ICMP",src:"0.0.0.0/0", dst:"ANY", port:"*",    dir:"IN",  action:"LIMIT", layer:"SPI", active:true  },
  { id:6, name:"Allow HTTPS outbound",        proto:"TCP", src:"LAN",       dst:"ANY", port:"443",  dir:"OUT", action:"ALLOW", layer:"SPI", active:true  },
  { id:7, name:"Allow DNS-over-HTTPS",        proto:"TCP", src:"LAN",       dst:"ANY", port:"853",  dir:"OUT", action:"ALLOW", layer:"DPI", active:true  },
  { id:8, name:"Block Tor exit nodes",        proto:"TCP", src:"TOR_LIST",  dst:"ANY", port:"*",    dir:"OUT", action:"DROP",  layer:"DPI", active:true  },
  { id:9, name:"Drop spoofed RFC1918",        proto:"ALL", src:"10.0.0.0/8",dst:"ANY", port:"*",    dir:"IN",  action:"DROP",  layer:"SPI", active:true  },
  {id:10, name:"Stealth mode – drop probes",  proto:"TCP", src:"0.0.0.0/0", dst:"ANY", port:"*",    dir:"IN",  action:"DROP",  layer:"SPI", active:true  },
];

const NET_HOSTS = [
  { ip:"192.168.1.1",  host:"gateway.local",     os:"OpenWRT",  open:[80,443,22],   vulns:1, risk:"LOW"    },
  { ip:"192.168.1.10", host:"workstation-01",     os:"Kali 2024",open:[22],          vulns:0, risk:"NONE"   },
  { ip:"192.168.1.15", host:"nas.local",          os:"TrueNAS",  open:[80,443,445],  vulns:2, risk:"MEDIUM" },
  { ip:"192.168.1.22", host:"win-server-dc",      os:"Win 2022", open:[135,445,3389],vulns:3, risk:"HIGH"   },
  { ip:"192.168.1.50", host:"camera-hallway",     os:"IoT Linux",open:[80,554],      vulns:4, risk:"CRITICAL"},
  { ip:"10.0.0.5",     host:"vpn-endpoint",       os:"Ubuntu 22",open:[1194,51820],  vulns:0, risk:"NONE"   },
];

const WEB_TARGETS = [
  { url:"https://corp-app.internal",    score:82, issues:["No HSTS","Weak TLS 1.0 allowed"],            status:"SCAN DONE"   },
  { url:"https://admin.corp.internal",  score:34, issues:["SQL Injection (GET /id)","XSS in login","CSRF missing"],status:"CRITICAL" },
  { url:"https://api.corp.internal",    score:68, issues:["Outdated JWT lib","No rate limiting"],        status:"WARNING"     },
  { url:"https://mail.corp.internal",   score:91, issues:["SPF misconfigured"],                          status:"SCAN DONE"   },
];

const IDS_EVENTS = [
  { time:"14:42:07", rule:"ET SCAN Nmap SYN Scan",        src:"203.0.113.5",   proto:"TCP", sev:"HIGH",    action:"BLOCKED" },
  { time:"14:40:19", rule:"GPL SQL Injection Attempt",     src:"198.51.100.12", proto:"HTTP",sev:"CRITICAL",action:"BLOCKED" },
  { time:"14:38:52", rule:"ET POLICY TOR Traffic",         src:"192.168.1.22",  proto:"TCP", sev:"MEDIUM",  action:"ALERTED" },
  { time:"14:35:01", rule:"ET WEB_SERVER PHP RFI Attempt", src:"45.33.32.156",  proto:"HTTP",sev:"HIGH",    action:"BLOCKED" },
  { time:"14:30:44", rule:"ICMP Flood Detected",           src:"172.16.0.8",    proto:"ICMP",sev:"HIGH",    action:"RATE-LIMITED"},
  { time:"14:22:17", rule:"Brute Force SSH",               src:"91.121.0.1",    proto:"SSH", sev:"HIGH",    action:"BLOCKED" },
  { time:"14:15:09", rule:"DNS Tunneling Detected",        src:"192.168.1.50",  proto:"DNS", sev:"CRITICAL",action:"BLOCKED" },
];

const LOG_ENTRIES = [
  { ts:"2024-12-15 14:42:07", level:"BLOCK",  src:"203.0.113.5:41233",   dst:"10.0.0.5:22",   proto:"TCP",  bytes:"124",  rule:"SPI-002" },
  { ts:"2024-12-15 14:41:55", level:"ALLOW",  src:"192.168.1.10:55221",  dst:"8.8.8.8:853",   proto:"TCP",  bytes:"512",  rule:"FW-007"  },
  { ts:"2024-12-15 14:40:19", level:"BLOCK",  src:"198.51.100.12:41120", dst:"192.168.1.22:80",proto:"HTTP", bytes:"4096", rule:"IDS-SQL" },
  { ts:"2024-12-15 14:40:01", level:"ALLOW",  src:"192.168.1.10:55180",  dst:"1.1.1.1:443",   proto:"TCP",  bytes:"2048", rule:"FW-006"  },
  { ts:"2024-12-15 14:38:52", level:"ALERT",  src:"192.168.1.22:44322",  dst:"TOR:9001",       proto:"TCP",  bytes:"8192", rule:"IDS-TOR" },
  { ts:"2024-12-15 14:35:01", level:"BLOCK",  src:"45.33.32.156:80",     dst:"192.168.1.15:80",proto:"HTTP", bytes:"256",  rule:"IDS-RFI" },
  { ts:"2024-12-15 14:30:44", level:"LIMIT",  src:"172.16.0.8",          dst:"BROADCAST",      proto:"ICMP", bytes:"64000",rule:"SPI-005" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────────*/
const mono = { fontFamily:"'IBM Plex Mono', monospace" };
const sans = { fontFamily:"'IBM Plex Sans', sans-serif" };

const RiskBadge = ({ risk }) => {
  const c = { CRITICAL:T.red, HIGH:T.amber, MEDIUM:T.blue, LOW:T.green, NONE:T.muted }[risk] || T.muted;
  return (
    <span style={{ fontSize:10, fontWeight:600, letterSpacing:.8, color:c,
      background:c+"18", border:`1px solid ${c}30`, borderRadius:3, padding:"2px 7px", ...mono }}>
      {risk}
    </span>
  );
};

const ActionBadge = ({ action }) => {
  const map = { BLOCKED:[T.red,"BLOCKED"], BLOCK:[T.red,"BLOCK"], DROP:[T.red,"DROP"],
    ALLOW:[T.green,"ALLOW"], ALERTED:[T.amber,"ALERT"], "RATE-LIMITED":[T.blue,"RATE-LIM"],
    LIMIT:[T.blue,"LIMIT"], PENDING:[T.amber,"PENDING"] };
  const [c, label] = map[action] || [T.muted, action];
  return (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:.6, color:c,
      background:c+"15", border:`1px solid ${c}35`, borderRadius:3, padding:"2px 7px", ...mono }}>
      {label}
    </span>
  );
};

const Dot = ({ color, pulse }) => (
  <span style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center", marginRight:6 }}>
    {pulse && <span style={{ position:"absolute", width:8, height:8, borderRadius:"50%",
      background:color, animation:"ping 1.5s ease-out infinite", opacity:.5 }} />}
    <span style={{ width:7, height:7, borderRadius:"50%", background:color, display:"block" }} />
  </span>
);

const Stat = ({ label, value, sub, color=T.blue, icon }) => (
  <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10,
    padding:"18px 20px", borderLeft:`3px solid ${color}`, animation:"fadeIn .4s ease" }}>
    <div style={{ fontSize:10, color:T.muted, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8, ...sans }}>{icon} {label}</div>
    <div style={{ fontSize:28, fontWeight:700, color, ...mono }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:T.muted2, marginTop:4, ...sans }}>{sub}</div>}
  </div>
);

const Panel = ({ title, children, action, style={} }) => (
  <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, ...style }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
      padding:"14px 20px", borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:11, fontWeight:600, color:T.muted2, letterSpacing:1.5,
        textTransform:"uppercase", ...mono }}>{title}</span>
      {action}
    </div>
    <div style={{ padding:"16px 20px" }}>{children}</div>
  </div>
);

const Btn = ({ children, onClick, color=T.blue, sm, style={} }) => (
  <button onClick={onClick} style={{ padding: sm ? "5px 12px" : "8px 16px",
    background:color+"15", color, border:`1px solid ${color}35`, borderRadius:6,
    cursor:"pointer", fontSize: sm ? 10 : 12, fontWeight:600, letterSpacing:.6,
    transition:"all .15s", ...mono, ...style }}
    onMouseEnter={e=>{ e.target.style.background=color+"30"; e.target.style.borderColor=color+"70"; }}
    onMouseLeave={e=>{ e.target.style.background=color+"15"; e.target.style.borderColor=color+"35"; }}>
    {children}
  </button>
);

const TH = ({ children }) => (
  <th style={{ textAlign:"left", padding:"8px 14px", fontSize:9, fontWeight:600, color:T.muted,
    letterSpacing:1.5, textTransform:"uppercase", borderBottom:`1px solid ${T.border}`, ...mono }}>
    {children}
  </th>
);

const TD = ({ children, style={} }) => (
  <td style={{ padding:"10px 14px", fontSize:12, color:T.text, borderBottom:`1px solid ${T.border+"88"}`, ...style }}>
    {children}
  </td>
);

/* ── Sparkline ───────────────────────────────────────────────────────────────*/
const Spark = ({ data, color }) => {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v,i) => `${(i/(data.length-1))*100},${100-((v-min)/(max-min||1))*85}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" style={{ width:80, height:28 }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
    </svg>
  );
};

/* ── PAGES ───────────────────────────────────────────────────────────────────*/

/* Command Center */
const Overview = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(x=>x+1), 2000); return ()=>clearInterval(t); }, []);
  const rnd = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Command Center" sub="Real-time security posture across all layers" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:24 }}>
        <Stat icon="◈" label="Firewall Rules"     value="10"   sub="10 active / 0 disabled"  color={T.blue}   />
        <Stat icon="◉" label="Devices Monitored"  value="6"    sub="3 trusted, 2 blocked"     color={T.cyan}   />
        <Stat icon="◎" label="Network Hosts"       value="6"    sub="1 critical vuln"          color={T.amber}  />
        <Stat icon="◬" label="IDS Events Today"    value="7"    sub="4 auto-blocked"           color={T.red}    />
        <Stat icon="⬡" label="VPN Tunnels"         value="2"    sub="WireGuard + OpenVPN"      color={T.green}  />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:20 }}>
        <Panel title="Live Traffic Monitor" action={<Dot color={T.green} pulse />}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[["Inbound (pkt/s)", T.blue, [42,38,55,60,48,52,70,65,58,72,68,80]],
              ["Outbound (pkt/s)", T.cyan, [30,35,28,40,33,36,44,38,42,35,50,45]],
              ["Blocked (pkt/s)",  T.red,  [5,8,3,12,6,9,15,7,11,8,14,10]]].map(([lbl,c,d])=>(
              <div key={lbl} style={{ background:T.bg3, borderRadius:8, padding:"14px 16px", border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:10, color:T.muted, marginBottom:6, letterSpacing:1, ...mono }}>{lbl}</div>
                <Spark data={d} color={c} />
                <div style={{ fontSize:22, fontWeight:700, color:c, marginTop:6, ...mono }}>{d[d.length-1]}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Security Posture">
          {[
            ["SPI Firewall",          T.green, "ACTIVE"],
            ["DPI Engine",            T.green, "ACTIVE"],
            ["IDS/IPS (Suricata)",    T.green, "ACTIVE"],
            ["USB Device Control",    T.green, "ENFORCED"],
            ["Zero-Trust Policy",     T.green, "ON"],
            ["Network Scanner",       T.green, "SCHEDULED"],
            ["Web App Scanner",       T.amber, "1 CRITICAL"],
            ["VPN Kill Switch",       T.green, "ARMED"],
            ["Fail2Ban",              T.green, "ACTIVE"],
            ["Anti-DDoS / Rate Limit",T.green, "ACTIVE"],
            ["DNS over HTTPS",        T.green, "ENFORCED"],
            ["Stealth Mode",          T.green, "ENABLED"],
          ].map(([l,c,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"7px 0", borderBottom:`1px solid ${T.border+"66"}` }}>
              <span style={{ fontSize:12, color:T.text, ...sans }}>{l}</span>
              <span style={{ fontSize:10, color:c, fontWeight:600, ...mono, display:"flex", alignItems:"center" }}>
                <Dot color={c} />{v}
              </span>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <Panel title="Latest IDS Events" action={<Btn sm color={T.amber}>View All</Btn>}>
          {IDS_EVENTS.slice(0,4).map((e,i)=>(
            <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"8px 0",
              borderBottom:`1px solid ${T.border+"55"}` }}>
              <span style={{ fontSize:10, color:T.muted, minWidth:68, ...mono }}>{e.time}</span>
              <span style={{ flex:1, fontSize:11, color:T.text, ...sans }}>{e.rule}</span>
              <ActionBadge action={e.action} />
            </div>
          ))}
        </Panel>
        <Panel title="Infrastructure Health">
          {[["Kali Workstation",  T.green, "192.168.1.10","SECURE"],
            ["NAS Storage",       T.amber, "192.168.1.15","2 VULNS"],
            ["Windows DC",        T.red,   "192.168.1.22","3 VULNS"],
            ["IoT Camera",        T.red,   "192.168.1.50","CRITICAL"],
            ["VPN Gateway",       T.green, "10.0.0.5",    "SECURE"],
            ["Cloud Endpoint",    T.green, "34.120.x.x",  "MONITORED"],
          ].map(([h,c,ip,st])=>(
            <div key={h} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 0", borderBottom:`1px solid ${T.border+"55"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Dot color={c} />
                <div>
                  <div style={{ fontSize:12, color:T.text, ...sans }}>{h}</div>
                  <div style={{ fontSize:10, color:T.muted, ...mono }}>{ip}</div>
                </div>
              </div>
              <RiskBadge risk={st.includes("VULN")||st==="CRITICAL" ? (st==="CRITICAL"?"CRITICAL":"HIGH") : st==="SECURE"?"NONE":"LOW"} />
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
};

/* Firewall */
const Firewall = () => {
  const [rules, setRules] = useState(FW_RULES);
  const [nr, setNr] = useState({ name:"", proto:"TCP", src:"", dst:"ANY", port:"", dir:"IN", action:"DROP", layer:"SPI" });
  const toggle = id => setRules(r=>r.map(x=>x.id===id?{...x,active:!x.active}:x));
  const del    = id => setRules(r=>r.filter(x=>x.id!==id));
  const add    = () => { if(!nr.name||!nr.port) return; setRules(r=>[...r,{...nr,id:Date.now(),active:true}]); setNr({name:"",proto:"TCP",src:"",dst:"ANY",port:"",dir:"IN",action:"DROP",layer:"SPI"}); };
  const Sel = ({k,opts}) => (
    <select value={nr[k]} onChange={e=>setNr({...nr,[k]:e.target.value})}
      style={{ background:T.bg0, color:T.text, border:`1px solid ${T.border2}`, borderRadius:6,
        padding:"8px 10px", fontSize:11, ...mono, outline:"none" }}>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Firewall · SPI / DPI Engine" sub="Stateful + Deep Packet Inspection | Default-deny | Zero-trust baseline" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <Stat label="Total Rules"  value={rules.length}                    color={T.blue}   />
        <Stat label="Drop Rules"   value={rules.filter(r=>r.action==="DROP").length}  color={T.red}    />
        <Stat label="SPI Rules"    value={rules.filter(r=>r.layer==="SPI").length}    color={T.cyan}   />
        <Stat label="DPI Rules"    value={rules.filter(r=>r.layer==="DPI").length}    color={T.purple} />
      </div>
      <Panel title="Add Firewall Rule" style={{ marginBottom:20 }}>
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-end" }}>
          {[["Rule Name","name","text","e.g. Block FTP","200px"],["Src IP","src","text","0.0.0.0/0","140px"],["Dst","dst","text","ANY","100px"],["Port","port","text","21","80px"]].map(([l,k,t,p,w])=>(
            <div key={k}>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, marginBottom:5, ...mono }}>{l}</div>
              <input value={nr[k]} onChange={e=>setNr({...nr,[k]:e.target.value})} placeholder={p}
                style={{ background:T.bg0, color:T.text, border:`1px solid ${T.border2}`, borderRadius:6,
                  padding:"8px 12px", fontSize:11, width:w, ...mono, outline:"none" }} />
            </div>
          ))}
          {[["Proto",["TCP","UDP","ICMP","ALL"]],["Dir",["IN","OUT","BOTH"]],["Action",["DROP","ALLOW","LIMIT"]],["Layer",["SPI","DPI"]]].map(([l,o])=>(
            <div key={l}>
              <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, marginBottom:5, ...mono }}>{l}</div>
              <Sel k={l.toLowerCase()} opts={o} />
            </div>
          ))}
          <Btn onClick={add} color={T.green} style={{ alignSelf:"flex-end" }}>+ ADD RULE</Btn>
        </div>
      </Panel>
      <Panel title="Active Rules — SPI + DPI Combined Chain">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["#","Rule Name","Proto","Src","Dst","Port","Dir","Layer","Action","Status",""].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {rules.map((r,i)=>(
              <tr key={r.id} className="row-hover" style={{ opacity:r.active?1:.45, cursor:"default" }}>
                <TD><span style={{ color:T.muted, ...mono }}>{String(i+1).padStart(2,"0")}</span></TD>
                <TD><span style={{ color:T.text }}>{r.name}</span></TD>
                <TD><span style={{ color:T.cyan, ...mono }}>{r.proto}</span></TD>
                <TD><span style={{ color:T.muted2, ...mono, fontSize:11 }}>{r.src}</span></TD>
                <TD><span style={{ color:T.muted2, ...mono, fontSize:11 }}>{r.dst}</span></TD>
                <TD><span style={{ color:T.amber, ...mono }}>{r.port}</span></TD>
                <TD><span style={{ color:T.muted2, ...mono }}>{r.dir}</span></TD>
                <TD><span style={{ color:r.layer==="DPI"?T.purple:T.blue, ...mono, fontSize:10 }}>{r.layer}</span></TD>
                <TD><ActionBadge action={r.action} /></TD>
                <TD><Btn sm color={r.active?T.green:T.muted} onClick={()=>toggle(r.id)}>{r.active?"ON":"OFF"}</Btn></TD>
                <TD><Btn sm color={T.red} onClick={()=>del(r.id)}>DEL</Btn></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
};

/* Device Control */
const DeviceControl = () => {
  const [devices, setDevices] = useState(USB_DEVICES);
  const [showAuth, setShowAuth] = useState(null);
  const [authPin, setAuthPin] = useState("");
  const [globalPolicy, setGlobalPolicy] = useState("BLOCK_ALL");

  const authorize = (id) => {
    if(authPin === "1234") {
      setDevices(d=>d.map(x=>x.id===id?{...x,status:"ALLOWED",trusted:true}:x));
      setShowAuth(null); setAuthPin("");
    }
  };

  const portTypes = [
    { type:"USB-A 3.0 (×4)", icon:"◉", status:"CONTROLLED", color:T.amber },
    { type:"USB-C / Thunderbolt (×2)", icon:"◉", status:"CONTROLLED", color:T.amber },
    { type:"USB-A 2.0 (×2)", icon:"◉", status:"CONTROLLED", color:T.amber },
    { type:"SD Card Reader", icon:"◉", status:"BLOCKED", color:T.red },
    { type:"3.5mm Audio Jack", icon:"◎", status:"ALLOWED", color:T.green },
    { type:"HDMI / DisplayPort", icon:"◎", status:"ALLOWED", color:T.green },
    { type:"Ethernet (RJ-45)", icon:"◎", status:"CONTROLLED", color:T.amber },
    { type:"Bluetooth 5.x", icon:"◉", status:"BLOCKED", color:T.red },
  ];

  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Device & Port Control" sub="All physical ports monitored. Authentication required for removable storage." />
      {showAuth && (
        <div style={{ position:"fixed", inset:0, background:"#00000088", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:T.bg2, border:`1px solid ${T.border2}`, borderRadius:12, padding:32, width:360, textAlign:"center", boxShadow:`0 0 40px ${T.amber}22` }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔑</div>
            <div style={{ color:T.amber, fontWeight:700, fontSize:14, letterSpacing:1, marginBottom:4, ...mono }}>DEVICE ACCESS REQUEST</div>
            <div style={{ color:T.muted2, fontSize:12, marginBottom:20, ...sans }}>
              {devices.find(d=>d.id===showAuth)?.name}<br/>requires administrator authentication.
            </div>
            <div style={{ fontSize:9, color:T.muted, letterSpacing:1.5, marginBottom:6, ...mono }}>ADMIN PIN (use: 1234)</div>
            <input type="password" value={authPin} onChange={e=>setAuthPin(e.target.value)}
              placeholder="••••••" maxLength={6}
              style={{ width:"100%", background:T.bg0, color:T.text, border:`1px solid ${T.border2}`, borderRadius:6,
                padding:"12px", textAlign:"center", letterSpacing:8, fontSize:20, ...mono, outline:"none", marginBottom:16 }} />
            <div style={{ display:"flex", gap:10 }}>
              <Btn color={T.red} style={{ flex:1 }} onClick={()=>{setShowAuth(null);setAuthPin("");}}>DENY</Btn>
              <Btn color={T.green} style={{ flex:1 }} onClick={()=>authorize(showAuth)}>AUTHENTICATE</Btn>
            </div>
          </div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        <Panel title="Global Port Policy">
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            {[["BLOCK_ALL","Block All (Max Security)",T.red],["AUTH_REQUIRED","Auth Required",T.amber],["ALLOW_TRUSTED","Allow Trusted Only",T.green]].map(([v,l,c])=>(
              <button key={v} onClick={()=>setGlobalPolicy(v)}
                style={{ padding:"9px 16px", border:`1px solid ${globalPolicy===v?c:T.border}`,
                  background:globalPolicy===v?c+"20":T.bg3, color:globalPolicy===v?c:T.muted2,
                  borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600, ...mono }}>
                {l}
              </button>
            ))}
          </div>
          {portTypes.map(p=>(
            <div key={p.type} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"9px 0", borderBottom:`1px solid ${T.border+"55"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Dot color={p.color} />
                <span style={{ fontSize:12, color:T.text, ...sans }}>{p.type}</span>
              </div>
              <ActionBadge action={p.status} />
            </div>
          ))}
        </Panel>

        <Panel title="Connected Devices">
          {devices.map(d=>(
            <div key={d.id} style={{ background:T.bg3, borderRadius:8, padding:"12px 14px",
              marginBottom:10, border:`1px solid ${d.status==="BLOCKED"?T.red+"30":d.status==="PENDING"?T.amber+"30":T.border}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:T.text, ...sans }}>{d.name}</div>
                  <div style={{ fontSize:10, color:T.muted, ...mono }}>{d.type} · {d.port} · Last: {d.lastSeen}</div>
                </div>
                <ActionBadge action={d.status} />
              </div>
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                {d.status !== "ALLOWED" && <Btn sm color={T.green} onClick={()=>setShowAuth(d.id)}>🔑 AUTHENTICATE</Btn>}
                {d.status === "ALLOWED" && !d.trusted && <Btn sm color={T.blue}>TRUST PERMANENTLY</Btn>}
                {d.status === "ALLOWED" && <Btn sm color={T.red} onClick={()=>setDevices(dv=>dv.map(x=>x.id===d.id?{...x,status:"BLOCKED",trusted:false}:x))}>REVOKE</Btn>}
              </div>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
};

/* Network Scanner */
const NetworkScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef();
  const scan = () => { setScanning(true); setProgress(0); setDone(false);
    ref.current = setInterval(()=>setProgress(p=>{ if(p>=100){ clearInterval(ref.current); setScanning(false); setDone(true); return 100; } return p+1.2; }), 50); };

  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Network Vulnerability Scanner" sub="Nmap + OpenVAS + custom probes | Auto-scheduled | Multi-subnet aware" />
      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
        {[["Quick Scan","192.168.1.0/24"],["Deep Scan","Full subnet + service fingerprint"],["CVE Scan","CVE database correlation"],["IoT Scan","Shodan-style probe"]].map(([l,d])=>(
          <div key={l} style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:8, padding:"12px 16px", cursor:"pointer", flex:1, minWidth:160 }}
            onClick={scan}>
            <div style={{ fontSize:12, fontWeight:600, color:T.blue, marginBottom:4, ...mono }}>{l}</div>
            <div style={{ fontSize:10, color:T.muted, ...sans }}>{d}</div>
          </div>
        ))}
      </div>
      {(scanning || done) && (
        <div style={{ background:T.bg2, border:`1px solid ${T.border}`, borderRadius:10, padding:"16px 20px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:12, color:scanning?T.cyan:T.green, ...mono }}>{scanning?"🔍 Scanning 192.168.1.0/24...":"✓ Scan complete — 3 vulnerabilities found"}</span>
            <span style={{ fontSize:12, color:T.muted, ...mono }}>{Math.floor(progress)}%</span>
          </div>
          <div style={{ height:5, background:T.border, borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${T.blue},${T.cyan})`, transition:"width .08s", borderRadius:3 }} />
          </div>
          {scanning && <div style={{ marginTop:8, fontSize:10, color:T.muted, ...mono }}>→ Probing 192.168.1.{Math.floor(progress*2.5)}... service fingerprinting...</div>}
        </div>
      )}
      <Panel title="Discovered Hosts — Vulnerability Report">
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["IP Address","Hostname","OS","Open Ports","Vulns","Risk","Actions"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {NET_HOSTS.map(h=>(
              <tr key={h.ip} className="row-hover">
                <TD><span style={{ color:T.cyan, ...mono }}>{h.ip}</span></TD>
                <TD><span style={{ color:T.text }}>{h.host}</span></TD>
                <TD><span style={{ color:T.muted2, fontSize:11 }}>{h.os}</span></TD>
                <TD><span style={{ color:T.amber, ...mono, fontSize:11 }}>{h.open.join(", ")}</span></TD>
                <TD><span style={{ color:h.vulns>0?T.red:T.green, fontWeight:700, ...mono }}>{h.vulns}</span></TD>
                <TD><RiskBadge risk={h.risk} /></TD>
                <TD><div style={{ display:"flex", gap:6 }}>
                  <Btn sm color={T.blue}>DETAILS</Btn>
                  {h.vulns>0&&<Btn sm color={T.red}>REMEDIATE</Btn>}
                </div></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
};

/* Web Scanner */
const WebScanner = () => {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const scan = () => { if(!url) return; setScanning(true); setTimeout(()=>setScanning(false),2200); };
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Web & Application Scanner" sub="OWASP Top 10 | SQLi · XSS · CSRF · SSRF · Broken Auth | Header analysis" />
      <Panel title="New Scan Target" style={{ marginBottom:20 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://target.corp.internal"
            style={{ flex:1, background:T.bg0, color:T.text, border:`1px solid ${T.border2}`, borderRadius:6,
              padding:"10px 14px", fontSize:12, ...mono, outline:"none" }} />
          {[["Quick","OWASP basics"],["Full","All checks + fuzzing"],["API","REST/GraphQL mode"]].map(([l,d])=>(
            <button key={l} onClick={scan} title={d}
              style={{ padding:"10px 18px", background:T.blueD, color:T.blue, border:`1px solid ${T.blue}35`,
                borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:700, ...mono }}>
              {l} SCAN
            </button>
          ))}
        </div>
        {scanning && <div style={{ marginTop:12, fontSize:11, color:T.cyan, ...mono, animation:"pulse 1s infinite" }}>🔍 Scanning {url || "target"}...</div>}
      </Panel>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {WEB_TARGETS.map((t,i)=>(
          <div key={i} style={{ background:T.bg2, border:`1px solid ${t.status==="CRITICAL"?T.red+"40":t.status==="WARNING"?T.amber+"40":T.border}`, borderRadius:10, padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13, color:T.cyan, fontWeight:600, ...mono }}>{t.url}</div>
                <div style={{ fontSize:10, color:T.muted, marginTop:3, ...mono }}>Security Score: <span style={{ color:t.score<50?T.red:t.score<75?T.amber:T.green, fontWeight:700 }}>{t.score}/100</span></div>
              </div>
              <ActionBadge action={t.status==="CRITICAL"?"BLOCKED":t.status==="WARNING"?"ALERTED":"ALLOW"} />
            </div>
            <div style={{ height:5, background:T.border, borderRadius:3, marginBottom:14 }}>
              <div style={{ height:"100%", width:`${t.score}%`, borderRadius:3,
                background:t.score<50?T.red:t.score<75?T.amber:T.green }} />
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {t.issues.map((iss,j)=>(
                <span key={j} style={{ fontSize:10, color:T.amber, background:T.amberD,
                  border:`1px solid ${T.amber}30`, borderRadius:4, padding:"3px 10px", ...mono }}>
                  ⚠ {iss}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* IDS/IPS */
const IdsIps = () => (
  <div style={{ animation:"fadeIn .3s ease" }}>
    <PageHeader title="IDS / IPS Engine — Suricata" sub="Signature + behavioral detection | Auto-block | Real-time alerting" />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
      <Stat label="Events Today"   value="7"   color={T.red}    />
      <Stat label="Auto-Blocked"   value="5"   color={T.amber}  />
      <Stat label="Active Rules"   value="32k" sub="Suricata ET Pro" color={T.blue} />
      <Stat label="False Positives" value="0"  color={T.green}  />
    </div>
    <Panel title="Live Threat Feed" action={<Dot color={T.red} pulse />}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr>{["Timestamp","Suricata Rule","Source IP","Protocol","Severity","Action"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
        <tbody>
          {IDS_EVENTS.map((e,i)=>(
            <tr key={i} className="row-hover" style={{ background:e.sev==="CRITICAL"?T.red+"08":"transparent" }}>
              <TD><span style={{ color:T.muted, ...mono, fontSize:11 }}>{e.time}</span></TD>
              <TD><span style={{ color:T.text, fontSize:12 }}>{e.rule}</span></TD>
              <TD><span style={{ color:T.cyan, ...mono, fontSize:11 }}>{e.src}</span></TD>
              <TD><span style={{ color:T.purple, ...mono, fontSize:11 }}>{e.proto}</span></TD>
              <TD><RiskBadge risk={e.sev} /></TD>
              <TD><ActionBadge action={e.action} /></TD>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  </div>
);

/* VPN */
const Vpn = () => {
  const [tunnels, setTunnels] = useState([
    { name:"WireGuard — Remote Office", ep:"vpn.corp.com:51820", cipher:"ChaCha20-Poly1305", rx:"1.2 GB", tx:"340 MB", uptime:"14h 22m", status:"UP" },
    { name:"OpenVPN — Cloud AWS",       ep:"34.120.0.5:1194",    cipher:"AES-256-GCM",        rx:"4.5 GB", tx:"890 MB", uptime:"3d 7h",   status:"UP" },
    { name:"IPSec — Branch Site B",     ep:"10.20.0.1:500",      cipher:"AES-256-SHA256",      rx:"—",      tx:"—",      uptime:"—",        status:"DOWN" },
  ]);
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="VPN & Secure Tunnels" sub="WireGuard · OpenVPN · IPSec | Kill switch armed | Split-tunnel configurable" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:24 }}>
        {tunnels.map(t=>(
          <div key={t.name} style={{ background:T.bg2, border:`1px solid ${t.status==="UP"?T.green+"30":T.red+"30"}`, borderRadius:10, padding:"18px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:600, color:T.text, ...sans }}>{t.name}</span>
              <Dot color={t.status==="UP"?T.green:T.red} pulse={t.status==="UP"} />
            </div>
            {[["Endpoint",t.ep],["Cipher",t.cipher],["RX",t.rx],["TX",t.tx],["Uptime",t.uptime]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0",
                borderBottom:`1px solid ${T.border+"55"}` }}>
                <span style={{ fontSize:11, color:T.muted, ...sans }}>{k}</span>
                <span style={{ fontSize:11, color:T.muted2, ...mono }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <Btn sm color={t.status==="UP"?T.red:T.green}>{t.status==="UP"?"DISCONNECT":"CONNECT"}</Btn>
              <Btn sm color={T.blue}>CONFIG</Btn>
            </div>
          </div>
        ))}
      </div>
      <Panel title="Kill Switch & Routing Policy">
        {[["Kill Switch (block traffic if VPN drops)","ARMED",T.green],
          ["DNS Leak Prevention","ENABLED",T.green],
          ["IPv6 Leak Prevention","ENABLED",T.green],
          ["Split Tunneling","DISABLED",T.amber],
          ["Auto-reconnect on drop","ENABLED",T.green],
          ["Stealth / Obfuscated tunnel","AVAILABLE",T.blue],
        ].map(([l,v,c])=>(
          <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border+"55"}` }}>
            <span style={{ fontSize:12, color:T.text, ...sans }}>{l}</span>
            <span style={{ fontSize:10, fontWeight:700, color:c, ...mono }}>{v}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
};

/* Infrastructure */
const Infra = () => (
  <div style={{ animation:"fadeIn .3s ease" }}>
    <PageHeader title="Infrastructure Map" sub="Personal machine · Network devices · Enterprise · Cloud — unified view" />
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
      {[
        { zone:"Personal Machine", color:T.cyan, hosts:[
          {n:"kali-workstation",r:"SECURE",d:"Kali 2024 · 32GB RAM · RTX 4080"},{n:"Sentinel Agent",r:"ACTIVE",d:"v3.1.0 running all modules"},
        ]},
        { zone:"Local Network (LAN)", color:T.blue, hosts:[
          {n:"gateway.local",r:"LOW",d:"OpenWRT · 192.168.1.1"},{n:"nas.local",r:"MEDIUM",d:"TrueNAS · 2 CVEs detected"},
          {n:"win-server-dc",r:"HIGH",d:"Windows Server 2022 · 3 CVEs"},{n:"camera-hallway",r:"CRITICAL",d:"IoT · 4 CVEs detected"},
        ]},
        { zone:"Cloud / Enterprise", color:T.purple, hosts:[
          {n:"AWS East · us-east-1",r:"NONE",d:"EC2 + WAF + Shield"},{n:"Azure AD Tenant",r:"NONE",d:"Identity + Conditional Access"},
          {n:"GCP Logging Sink",r:"NONE",d:"SIEM connector active"},{n:"Corp VPN Gateway",r:"NONE",d:"10.0.0.5 · WireGuard"},
        ]},
      ].map(z=>(
        <Panel key={z.zone} title={z.zone} style={{ borderTop:`3px solid ${z.color}` }}>
          {z.hosts.map(h=>(
            <div key={h.n} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:`1px solid ${T.border+"55"}` }}>
              <div>
                <div style={{ fontSize:12, color:T.text, fontWeight:500, ...sans }}>{h.n}</div>
                <div style={{ fontSize:10, color:T.muted, marginTop:2, ...mono }}>{h.d}</div>
              </div>
              <RiskBadge risk={h.r==="ACTIVE"||h.r==="SECURE"||h.r==="NONE"?"NONE":h.r} />
            </div>
          ))}
        </Panel>
      ))}
    </div>
  </div>
);

/* Logs */
const Logs = () => {
  const [filter, setFilter] = useState("ALL");
  const filtered = filter==="ALL" ? LOG_ENTRIES : LOG_ENTRIES.filter(l=>l.level===filter);
  const levelColor = { BLOCK:T.red, ALLOW:T.green, ALERT:T.amber, LIMIT:T.blue };
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Logs & Forensics" sub="Unified log stream · All layers · Exportable · SIEM-ready" />
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["ALL","BLOCK","ALLOW","ALERT","LIMIT"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"7px 16px", border:`1px solid ${filter===f?levelColor[f]||T.blue:T.border}`,
              background:filter===f?(levelColor[f]||T.blue)+"18":T.bg2, color:filter===f?(levelColor[f]||T.blue):T.muted2,
              borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600, ...mono }}>
            {f}
          </button>
        ))}
        <Btn color={T.green} style={{ marginLeft:"auto" }}>↓ EXPORT CSV</Btn>
        <Btn color={T.blue}>→ SIEM PUSH</Btn>
      </div>
      <Panel title={`Log Stream — ${filtered.length} entries`}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead><tr>{["Timestamp","Level","Src","Dst","Proto","Bytes","Rule"].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {filtered.map((l,i)=>(
              <tr key={i} className="row-hover">
                <TD><span style={{ color:T.muted, ...mono, fontSize:10 }}>{l.ts}</span></TD>
                <TD><ActionBadge action={l.level} /></TD>
                <TD><span style={{ color:T.cyan, ...mono, fontSize:11 }}>{l.src}</span></TD>
                <TD><span style={{ color:T.muted2, ...mono, fontSize:11 }}>{l.dst}</span></TD>
                <TD><span style={{ color:T.purple, ...mono, fontSize:11 }}>{l.proto}</span></TD>
                <TD><span style={{ color:T.muted2, ...mono, fontSize:11 }}>{l.bytes}B</span></TD>
                <TD><span style={{ color:T.blue, ...mono, fontSize:10 }}>{l.rule}</span></TD>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
};

/* Settings */
const Settings = () => {
  const sections = [
    { title:"Authentication & Access", color:T.blue, items:[
      ["Credential Provider (Linux PAM)","ENABLED"],["TOTP / 2FA","ENFORCED"],
      ["Hardware Key (YubiKey FIDO2)","OPTIONAL"],["Max login attempts","3"],
      ["Lockout duration","15 min"],["Session timeout","30 min"],
      ["Geo-IP restriction","ENABLED"],["Zero-Trust: re-auth every 8h","ENABLED"],
    ]},
    { title:"Firewall & Network", color:T.cyan, items:[
      ["Default policy","DROP ALL"],["SPI tracking table size","65536"],
      ["DPI engine","Suricata 7.x"],["Anti-spoofing (rp_filter)","STRICT"],
      ["Stealth mode (no ICMP reply)","ENABLED"],["NAT masquerade","ENABLED"],
      ["Rate limit (new conn/s)","50"],["Anti-DDoS SYN cookies","ENABLED"],
    ]},
    { title:"USB & Device Control", color:T.amber, items:[
      ["Default USB policy","BLOCK ALL"],["Storage device auth","PIN + Admin"],
      ["Trusted device persist","YES"],["Audit all device events","YES"],
      ["Bluetooth","BLOCKED"],["Auto-run / autoplay","DISABLED"],
    ]},
    { title:"IDS/IPS & Scanning", color:T.red, items:[
      ["Suricata ruleset","ET Pro + Custom"],["Scan schedule","Daily 03:00"],
      ["Auto-block on CRITICAL","YES"],["Threat Intel feeds","4 active"],
      ["CVE correlation","Enabled"],["Web scan schedule","Weekly Sun 01:00"],
    ]},
    { title:"Resilience & Fail-Safe", color:T.green, items:[
      ["Fail-closed on crash","YES"],["Watchdog daemon","ENABLED"],
      ["Config backup (encrypted)","Daily"],["Rollback on bad rules","ENABLED"],
      ["Immutable audit log","ENABLED"],["Health check interval","30s"],
    ]},
  ];
  return (
    <div style={{ animation:"fadeIn .3s ease" }}>
      <PageHeader title="Security Parameters" sub="All configurable settings across every security layer" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {sections.map(s=>(
          <Panel key={s.title} title={s.title} style={{ borderTop:`3px solid ${s.color}` }}>
            {s.items.map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"9px 0", borderBottom:`1px solid ${T.border+"55"}` }}>
                <span style={{ fontSize:12, color:T.text, ...sans }}>{k}</span>
                <span style={{ fontSize:10, color:s.color, fontWeight:700, ...mono }}>{v}</span>
              </div>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  );
};

/* Page Header */
const PageHeader = ({ title, sub }) => (
  <div style={{ marginBottom:24 }}>
    <h1 style={{ fontSize:22, fontWeight:700, color:T.text, ...sans, marginBottom:4 }}>{title}</h1>
    <p style={{ fontSize:12, color:T.muted2, ...mono }}>{sub}</p>
  </div>
);

/* ── Root App ─────────────────────────────────────────────────────────────────*/
const PAGES = { overview:<Overview/>, firewall:<Firewall/>, devices:<DeviceControl/>,
  netscan:<NetworkScanner/>, webscan:<WebScanner/>, idsips:<IdsIps/>,
  vpn:<Vpn/>, infra:<Infra/>, logs:<Logs/>, settings:<Settings/> };

export default function App() {
  const [tab, setTab] = useState("overview");
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return ()=>clearInterval(t); }, []);

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, color:T.text, display:"flex", flexDirection:"column" }}>
      <style>{css}</style>

      {/* Top Bar */}
      <div style={{ background:T.bg1, borderBottom:`1px solid ${T.border}`, padding:"0 24px",
        display:"flex", alignItems:"center", justifyContent:"space-between", height:52, flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:`linear-gradient(135deg,${T.blue},${T.cyan})`,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>◈</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:T.text, letterSpacing:.5, ...mono }}>SENTINEL</div>
            <div style={{ fontSize:9, color:T.muted, letterSpacing:2, ...mono }}>ENTERPRISE SECURITY SUITE · KALI LINUX</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          {[["●",T.green,"ALL SYSTEMS OPERATIONAL"],["●",T.red,"1 CRITICAL ALERT"],["●",T.amber,"3 WARNINGS"]].map(([dot,c,l])=>(
            <span key={l} style={{ fontSize:11, color:c, ...mono, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ fontSize:8, animation:"pulse 2s infinite" }}>{dot}</span> {l}
            </span>
          ))}
          <span style={{ fontSize:11, color:T.muted, ...mono }}>
            {time.toLocaleTimeString("en-US",{hour12:false})} · admin@sentinel
          </span>
        </div>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* Sidebar */}
        <div style={{ width:220, background:T.bg1, borderRight:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", flexShrink:0, overflowY:"auto" }}>
          <div style={{ padding:"20px 16px 12px", fontSize:9, color:T.muted, letterSpacing:2, ...mono }}>NAVIGATION</div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
                background:tab===n.id?T.bg3:"transparent", color:tab===n.id?T.blue:T.muted2,
                border:"none", borderLeft:`2px solid ${tab===n.id?T.blue:"transparent"}`,
                cursor:"pointer", textAlign:"left", fontSize:12, fontWeight:tab===n.id?600:400,
                transition:"all .12s", ...sans }}>
              <span style={{ fontSize:14, ...mono, color:tab===n.id?T.blue:T.muted }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
          <div style={{ marginTop:"auto", padding:"16px", borderTop:`1px solid ${T.border}` }}>
            <div style={{ fontSize:10, color:T.muted, ...mono, marginBottom:8 }}>SYSTEM</div>
            {[["CPU","14%",T.green],["RAM","2.1/32GB",T.green],["NET","↑2.3MB/s",T.blue]].map(([k,v,c])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:10, color:T.muted, ...mono }}>{k}</span>
                <span style={{ fontSize:10, color:c, ...mono }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"28px 32px" }}>
          {PAGES[tab]}
        </div>
      </div>
    </div>
  );
}
