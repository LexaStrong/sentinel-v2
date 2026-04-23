import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   SENTINEL ENTERPRISE SECURITY SUITE  |  Windows Enhanced Edition
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

/* ── Dashboard Status ──────────────────────────────────────────────────────── */
const DEFAULT_STATUS = {
  authenticated: true,
  platform: 'windows',
  bootPhase: 'main',
  antivirus: {
    protectionLevel: 'maximum',
    realtimeMonitoring: true,
    lastScan: new Date().toISOString(),
    threatsBlocked: 42,
    fileQuarantined: 3
  },
  firewall: {
    status: 'active',
    rulesActive: 10,
    packetsBlocked: 1247,
    connectionCount: 56
  },
  usb: {
    devicesBlocked: 2,
    devicesAllowed: 3,
    devicesPending: 1
  }
};

/* ── Mock Data ─────────────────────────────────────────────────────────────── */
const NAV = [
  { id:"overview",   icon:"⬡",  label:"Command Center" },
  { id:"antivirus",  icon:"◉",  label:"Antivirus Protection" },
  { id:"firewall",   icon:"◈",  label:"Firewall / SPI·DPI" },
  { id:"devices",    icon:"◎",  label:"Device Control" },
  { id:"netscan",    icon:"◍",  label:"Network Scanner" },
  { id:"webscan",    icon:"◬",  label:"Web & App Scanner" },
  { id:"idsips",     icon:"◫",  label:"IDS / IPS Engine" },
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
];

const ANTIVIRUS_DATA = [
  { time:"14:42:07", type:"Threat Detected", severity:"CRITICAL", file:"/Downloads/malware.exe", action:"QUARANTINED" },
  { time:"14:40:19", type:"Rootkit Scan",     severity:"HIGH", file:"System drivers", action:"BLOCKED" },
  { time:"14:38:52", type:"Ransomware Alert", severity:"HIGH", file:"/Desktop/document.encrypt", action:"QUARANTINED" },
  { time:"14:35:23", type:"Memory Scan",      severity:"MEDIUM", file:"Process: unknown.exe", action:"TERMINATED" },
  { time:"14:32:41", type:"File Reputation",  severity:"LOW", file:"/temp/suspicious.dll", action:"FLAGGED" },
];

const IDS_EVENTS = [
  { time:"14:42:07", rule:"ET SCAN Nmap SYN Scan",        src:"203.0.113.5",   proto:"TCP", sev:"HIGH",    action:"BLOCKED" },
  { time:"14:40:19", rule:"GPL SQL Injection Attempt",     src:"198.51.100.12", proto:"HTTP",sev:"CRITICAL",action:"BLOCKED" },
  { time:"14:38:52", rule:"ET POLICY TOR Traffic",         src:"192.168.1.22",  proto:"TCP", sev:"MEDIUM",  action:"ALERTED" },
  { time:"14:35:20", rule:"ET TROJAN Win32 Malware",       src:"10.0.0.5",      proto:"TCP", sev:"CRITICAL",action:"BLOCKED" },
  { time:"14:32:15", rule:"GPL SNMP Trap Community",       src:"192.168.1.50",  proto:"UDP", sev:"LOW",     action:"LOGGED"  },
];

export default function SentinelSecuritySuite() {
  const [tab, setTab] = useState("overview");
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // Load status from IPC
    const loadStatus = async () => {
      try {
        if (window.electronAPI?.invoke) {
          const overview = await window.electronAPI.invoke('dashboard:get-overview');
          setStatus(overview);
        }
      } catch (err) {
        console.log('Dashboard status:', DEFAULT_STATUS);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderTab = () => {
    switch (tab) {
      case "overview":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.cyan, marginBottom: "20px", textShadow: `0 0 10px ${T.cyan}80` }}>
              🔐 Command Center - Security Overview
            </h2>

            {/* Status Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "20px" }}>
              <div style={{
                background: T.bg2,
                border: `1px solid ${T.green}`,
                padding: "15px",
                borderRadius: "8px",
                cursor: "pointer"
              }}>
                <div style={{ color: T.green, fontSize: "12px", marginBottom: "5px" }}>ANTIVIRUS</div>
                <div style={{ color: T.text, fontSize: "18px", fontWeight: "bold" }}>MAXIMUM</div>
                <div style={{ color: T.muted, fontSize: "11px", marginTop: "5px" }}>
                  {status.antivirus?.threatsBlocked || 0} threats blocked
                </div>
              </div>

              <div style={{
                background: T.bg2,
                border: `1px solid ${T.blue}`,
                padding: "15px",
                borderRadius: "8px"
              }}>
                <div style={{ color: T.blue, fontSize: "12px", marginBottom: "5px" }}>FIREWALL</div>
                <div style={{ color: T.text, fontSize: "18px", fontWeight: "bold" }}>ACTIVE</div>
                <div style={{ color: T.muted, fontSize: "11px", marginTop: "5px" }}>
                  {status.firewall?.rulesActive || 0} rules active
                </div>
              </div>

              <div style={{
                background: T.bg2,
                border: `1px solid ${T.cyan}`,
                padding: "15px",
                borderRadius: "8px"
              }}>
                <div style={{ color: T.cyan, fontSize: "12px", marginBottom: "5px" }}>USB CONTROL</div>
                <div style={{ color: T.text, fontSize: "18px", fontWeight: "bold" }}>
                  {status.usb?.devicesAllowed || 0} ALLOWED
                </div>
                <div style={{ color: T.muted, fontSize: "11px", marginTop: "5px" }}>
                  {status.usb?.devicesBlocked || 0} blocked
                </div>
              </div>

              <div style={{
                background: T.bg2,
                border: `1px solid ${T.purple}`,
                padding: "15px",
                borderRadius: "8px"
              }}>
                <div style={{ color: T.purple, fontSize: "12px", marginBottom: "5px" }}>IDS/IPS</div>
                <div style={{ color: T.text, fontSize: "18px", fontWeight: "bold" }}>MONITORING</div>
                <div style={{ color: T.muted, fontSize: "11px", marginTop: "5px" }}>Active detection</div>
              </div>
            </div>

            {/* Recent Antivirus Events */}
            <h3 style={{ color: T.cyan, marginTop: "20px", marginBottom: "10px" }}>Recent Threats</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>TIME</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>EVENT</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>SEVERITY</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {ANTIVIRUS_DATA.slice(0, 5).map((evt, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                    <td style={{ padding: "8px", color: T.muted, fontSize: "11px" }}>{evt.time}</td>
                    <td style={{ padding: "8px", color: T.text, fontSize: "11px" }}>{evt.type}</td>
                    <td style={{ padding: "8px", color: evt.severity === "CRITICAL" ? T.red : evt.severity === "HIGH" ? T.amber : T.green, fontSize: "11px", fontWeight: "bold" }}>
                      {evt.severity}
                    </td>
                    <td style={{ padding: "8px", color: T.green, fontSize: "11px" }}>{evt.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "antivirus":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.green, marginBottom: "20px" }}>🦠 Antivirus Protection</h2>
            
            <div style={{
              background: T.bg2,
              border: `1px solid ${T.green}`,
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                <div>
                  <div style={{ color: T.green, fontSize: "11px", marginBottom: "5px" }}>PROTECTION LEVEL</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>MAXIMUM</div>
                </div>
                <div>
                  <div style={{ color: T.green, fontSize: "11px", marginBottom: "5px" }}>THREATS BLOCKED</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>{status.antivirus?.threatsBlocked || 0}</div>
                </div>
                <div>
                  <div style={{ color: T.green, fontSize: "11px", marginBottom: "5px" }}>FILES QUARANTINED</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>{status.antivirus?.fileQuarantined || 0}</div>
                </div>
              </div>
            </div>

            <h3 style={{ color: T.cyan, marginBottom: "10px" }}>Detection Events</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>TIME</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>TYPE</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>FILE/PROCESS</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2, fontSize: "11px" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {ANTIVIRUS_DATA.map((evt, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                    <td style={{ padding: "8px", color: T.muted, fontSize: "11px" }}>{evt.time}</td>
                    <td style={{ padding: "8px", color: T.text, fontSize: "11px" }}>{evt.type}</td>
                    <td style={{ padding: "8px", color: T.muted, fontSize: "11px" }}>{evt.file}</td>
                    <td style={{ padding: "8px", color: T.green, fontSize: "11px", fontWeight: "bold" }}>{evt.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "firewall":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.blue, marginBottom: "20px" }}>◈ Firewall / SPI·DPI</h2>
            
            <div style={{
              background: T.bg2,
              border: `1px solid ${T.blue}`,
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px" }}>
                <div>
                  <div style={{ color: T.blue, fontSize: "11px", marginBottom: "5px" }}>STATUS</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>ACTIVE</div>
                </div>
                <div>
                  <div style={{ color: T.blue, fontSize: "11px", marginBottom: "5px" }}>RULES ACTIVE</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>{FW_RULES.filter(r => r.active).length}</div>
                </div>
                <div>
                  <div style={{ color: T.blue, fontSize: "11px", marginBottom: "5px" }}>PACKETS BLOCKED</div>
                  <div style={{ color: T.text, fontSize: "16px", fontWeight: "bold" }}>1,247</div>
                </div>
              </div>
            </div>

            <h3 style={{ color: T.cyan, marginBottom: "10px" }}>Active Rules</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>RULE</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>PROTO</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>DIR</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>ACTION</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>LAYER</th>
                </tr>
              </thead>
              <tbody>
                {FW_RULES.filter(r => r.active).map((rule, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                    <td style={{ padding: "8px", color: T.text }}>{rule.name}</td>
                    <td style={{ padding: "8px", color: T.muted }}>{rule.proto}</td>
                    <td style={{ padding: "8px", color: T.muted }}>{rule.dir}</td>
                    <td style={{ padding: "8px", color: rule.action === "DROP" ? T.red : T.green }}>{rule.action}</td>
                    <td style={{ padding: "8px", color: T.cyan }}>{rule.layer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "devices":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.cyan, marginBottom: "20px" }}>◉ Device Control</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "20px" }}>
              <div style={{ background: T.bg2, border: `1px solid ${T.green}`, padding: "15px", borderRadius: "8px" }}>
                <div style={{ color: T.green, fontSize: "11px" }}>ALLOWED</div>
                <div style={{ color: T.text, fontSize: "20px", fontWeight: "bold" }}>{USB_DEVICES.filter(d => d.status === "ALLOWED").length}</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.amber}`, padding: "15px", borderRadius: "8px" }}>
                <div style={{ color: T.amber, fontSize: "11px" }}>PENDING</div>
                <div style={{ color: T.text, fontSize: "20px", fontWeight: "bold" }}>{USB_DEVICES.filter(d => d.status === "PENDING").length}</div>
              </div>
              <div style={{ background: T.bg2, border: `1px solid ${T.red}`, padding: "15px", borderRadius: "8px" }}>
                <div style={{ color: T.red, fontSize: "11px" }}>BLOCKED</div>
                <div style={{ color: T.text, fontSize: "20px", fontWeight: "bold" }}>{USB_DEVICES.filter(d => d.status === "BLOCKED").length}</div>
              </div>
            </div>

            <h3 style={{ color: T.cyan, marginBottom: "10px" }}>USB Devices</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>NAME</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>TYPE</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>PORT</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>STATUS</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>TRUSTED</th>
                </tr>
              </thead>
              <tbody>
                {USB_DEVICES.map((dev, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                    <td style={{ padding: "8px", color: T.text }}>{dev.name}</td>
                    <td style={{ padding: "8px", color: T.muted }}>{dev.type}</td>
                    <td style={{ padding: "8px", color: T.muted }}>{dev.port}</td>
                    <td style={{
                      padding: "8px",
                      color: dev.status === "ALLOWED" ? T.green : dev.status === "PENDING" ? T.amber : T.red
                    }}>
                      {dev.status}
                    </td>
                    <td style={{ padding: "8px", color: dev.trusted ? T.green : T.muted }}>{dev.trusted ? "YES" : "NO"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "idsips":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.purple, marginBottom: "20px" }}>◫ IDS / IPS Engine</h2>

            <h3 style={{ color: T.cyan, marginBottom: "10px" }}>Recent Events</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>TIME</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>RULE</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>SOURCE</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>SEVERITY</th>
                  <th style={{ padding: "8px", textAlign: "left", color: T.muted2 }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {IDS_EVENTS.map((evt, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }} className="row-hover">
                    <td style={{ padding: "8px", color: T.muted }}>{evt.time}</td>
                    <td style={{ padding: "8px", color: T.text }}>{evt.rule}</td>
                    <td style={{ padding: "8px", color: T.muted }}>{evt.src}</td>
                    <td style={{
                      padding: "8px",
                      color: evt.sev === "CRITICAL" ? T.red : evt.sev === "HIGH" ? T.amber : evt.sev === "MEDIUM" ? T.cyan : T.green,
                      fontWeight: "bold"
                    }}>
                      {evt.sev}
                    </td>
                    <td style={{ padding: "8px", color: evt.action === "BLOCKED" ? T.red : T.green }}>{evt.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "logs":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.cyan, marginBottom: "20px" }}>≡ Logs & Forensics</h2>
            
            <div style={{
              background: T.bg3,
              border: `1px solid ${T.border}`,
              padding: "15px",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "11px",
              color: T.green,
              maxHeight: "400px",
              overflow: "auto"
            }}>
              [14:42:07] Antivirus: Threat detected and quarantined<br/>
              [14:40:19] IDS/IPS: SQL Injection attempt blocked from 198.51.100.12<br/>
              [14:38:52] IDS/IPS: TOR traffic detected and logged<br/>
              [14:35:20] Antivirus: Rootkit scan completed - 0 threats<br/>
              [14:32:15] Firewall: Suspicious connection attempt blocked<br/>
              [14:30:00] System: Daily antivirus scan started<br/>
              [14:00:00] Portal: User authenticated successfully<br/>
              [13:45:00] System: Process control released after authentication<br/>
            </div>
          </div>
        );

      case "settings":
        return (
          <div style={{ padding: "20px", overflow: "auto", height: "100%" }}>
            <h2 style={{ color: T.cyan, marginBottom: "20px" }}>⚙ Settings</h2>
            
            <div style={{ background: T.bg2, border: `1px solid ${T.border}`, padding: "15px", borderRadius: "8px" }}>
              <h3 style={{ color: T.text, marginBottom: "10px" }}>System Information</h3>
              <div style={{ color: T.muted, fontSize: "12px", lineHeight: "1.8" }}>
                <div>• Platform: Windows (Enhanced Edition)</div>
                <div>• Version: 2.0</div>
                <div>• Authenticated: Yes</div>
                <div>• Boot Phase: Main Application</div>
                <div>• Process Control: Released</div>
                <div>• Antivirus: Maximum Protection</div>
                <div>• Firewall: Active (Default-Deny)</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg0, color: T.text, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{css}</style>

      {/* Sidebar */}
      <div style={{
        width: "250px",
        background: T.bg1,
        borderRight: `1px solid ${T.border}`,
        overflow: "auto",
        display: "flex",
        flexDirection: "column"
      }}>
        {/* Logo */}
        <div style={{ padding: "20px", borderBottom: `1px solid ${T.border}`, textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: T.cyan, textShadow: `0 0 10px ${T.cyan}40` }}>
            🔐 SENTINEL
          </div>
          <div style={{ fontSize: "10px", color: T.muted, marginTop: "5px" }}>Security Suite v2.0</div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, padding: "15px" }}>
          {NAV.map((nav) => (
            <div
              key={nav.id}
              onClick={() => setTab(nav.id)}
              style={{
                padding: "10px",
                marginBottom: "5px",
                background: tab === nav.id ? T.bg3 : "transparent",
                border: tab === nav.id ? `1px solid ${T.cyan}` : `1px solid transparent`,
                borderRadius: "5px",
                cursor: "pointer",
                transition: "all 0.2s",
                color: tab === nav.id ? T.cyan : T.muted,
                fontSize: "12px",
                fontWeight: tab === nav.id ? "600" : "400"
              }}
            >
              <span style={{ marginRight: "8px" }}>{nav.icon}</span>{nav.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: T.bg0 }}>
        {renderTab()}
      </div>
    </div>
  );
}
