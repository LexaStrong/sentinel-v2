# 🛡️ SENTINEL SECURITY SUITE v2.0
## Enterprise-Grade Multi-Layer Security Platform

### Overview
Sentinel is a comprehensive security suite built with Electron for Linux (optimized for Kali) that provides enterprise-grade protection across multiple security domains:

- **Physical Port Security** - Auto-block USB/ports with authentication
- **Network Firewall** - SPI/DPI with default-deny policy
- **Threat Detection** - IDS/IPS with real-time blocking
- **Vulnerability Scanning** - Network & web application assessment
- **Forensic Logging** - Complete audit trail for incident response

---

## 🏗️ ARCHITECTURE

### Multi-Layer Security Model

```
┌─────────────────────────────────────────────┐
│         ELECTRON MAIN PROCESS               │
│  (OS-level access, privilege escalation)    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Firewall     │  │ USB Control  │        │
│  │ (SPI/DPI)    │  │ (udev)       │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ IDS/IPS      │  │ Net Scanner  │        │
│  │ (Suricata)   │  │ (Nmap)       │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ┌──────────────┐  ┌──────────────┐        │
│  │ Web Scanner  │  │ Auth Service │        │
│  │ (ZAP/Nikto)  │  │ (MFA/RBAC)   │        │
│  └──────────────┘  └──────────────┘        │
│                                             │
│  ┌──────────────────────────────────┐      │
│  │ Config Manager | Forensics Log   │      │
│  └──────────────────────────────────┘      │
│                                             │
├─────────────────────────────────────────────┤
│  IPC Bridge (Secure Channel)                │
├─────────────────────────────────────────────┤
│         REACT FRONTEND (Sandbox)            │
│     (Corporate Dashboard UI)                │
└─────────────────────────────────────────────┘

↓ OS Integration (requires root)

┌─────────────────────────────────────────────┐
│         KALI LINUX KERNEL                   │
│  - iptables/netfilter (firewall)            │
│  - udev (device control)                    │
│  - sysfs (system interface)                 │
└─────────────────────────────────────────────┘
```

---

## 🔧 SECURITY ENGINES

### 1. **Firewall Engine (SPI/DPI)**
**File**: `src/engines/firewall-engine.js`

Features:
- **Stateful Packet Inspection (SPI)** - Tracks connection state
- **Deep Packet Inspection (DPI)** - Analyzes payload content
- **Default-Deny Policy** - Blocks all by default
- **Granular Rules** - IP, port, protocol, app-level control
- **Anti-DDoS** - Rate limiting & traffic shaping
- **Anti-Spoofing** - RFC1918 validation
- **Stealth Mode** - Port hiding

Integration:
- Uses `iptables` on Kali Linux
- Manages `netfilter` rules
- Persistence to disk (rules saved)

Example Rules:
```javascript
{
  name: "Allow HTTPS outbound",
  proto: "TCP",
  src: "LAN",
  dst: "ANY",
  port: "443",
  dir: "OUT",
  action: "ALLOW",
  layer: "SPI"
}
```

---

### 2. **USB Control Engine**
**File**: `src/engines/usb-control-engine.js`

Features:
- **Physical Port Control** - Block USB/removable media
- **Authentication Required** - 2-factor auth for access
- **Whitelist/Blacklist** - Trust devices permanently
- **Global Policies**:
  - `BLOCK_ALL` - Maximum security
  - `AUTH_REQUIRED` - Prompt on connection
  - `ALLOW_TRUSTED` - Only whitelisted devices

Global Port Types Managed:
```
✓ USB-A 2.0/3.0/3.1
✓ USB-C / Thunderbolt
✓ USB Hub
✗ Bluetooth (blacklisted)
✗ SD Card Reader (blocked by default)
✓ Security Keys (e.g., YubiKey - whitelisted)
```

Implementation:
- Uses `udev` rules for interception
- Manages `/sys/bus/usb/devices/*/authorized`
- Logs all access attempts

---

### 3. **IDS/IPS Engine**
**File**: `src/engines/ids-ips-engine.js`

Features:
- **Signature-Based Detection** - Suricata with ET/Emerging Threats rules
- **Behavior-Based Detection** - Anomaly detection
- **Real-Time Blocking** - Auto-block malicious traffic
- **Threat Intelligence** - Known malware/C2 detection
- **Auto-Response** - Block source IP on critical threats

Integration:
- Spawns Suricata process
- Parses eve-log JSON output
- Auto-updates threat signatures
- Blocks IPs via iptables on detection

Example Event:
```javascript
{
  timestamp: "2024-12-15T14:42:07Z",
  rule: "ET SCAN Nmap SYN Scan",
  source: { ip: "203.0.113.5", port: 12345 },
  destination: { ip: "10.0.0.5", port: 22 },
  severity: "HIGH",
  action: "BLOCKED"
}
```

---

### 4. **Network Scanner Engine**
**File**: `src/engines/network-scanner-engine.js`

Features:
- **Host Discovery** - Nmap scan of subnets
- **Port Scanning** - Service identification
- **Vulnerability Detection** - CVE correlation
- **Multi-Subnet Aware** - LAN + remote networks
- **Topology Mapping** - Network visualization

Scan Types:
- Quick Scan (top 100 ports)
- Deep Scan (all ports + service fingerprint)
- CVE Scan (vulnerability correlation)
- IoT Scan (known default credentials)

Example Result:
```javascript
{
  ip: "192.168.1.22",
  hostname: "win-server-dc",
  openPorts: [135, 445, 3389],
  vulnerabilities: 3,
  risk: "HIGH"
}
```

---

### 5. **Web/App Scanner Engine**
**File**: `src/engines/webapp-scanner-engine.js`

Features:
- **SSL/TLS Analysis** - Certificate validation
- **Header Security** - CSP, HSTS, X-Frame-Options
- **Injection Detection** - SQL, XSS, RFI testing
- **OWASP Top 10** - Automatic checks
- **Security Score** - 0-100 rating

Integration:
- Uses OWASP ZAP API
- Runs Nikto web scanner
- Analyzes HTTP response headers
- Checks certificate validity

Example Finding:
```javascript
{
  type: "SQL_INJECTION",
  severity: "CRITICAL",
  message: "Potential SQL injection in search parameter",
  path: "/search.php?q=1' OR '1'='1"
}
```

---

## 🔐 SECURITY SERVICES

### Authentication Service
**File**: `src/services/authentication-service.js`

- Multi-factor authentication (MFA/TOTP)
- PIN-based device access
- Role-based access control (RBAC)
- Session management
- Secure credential storage

Roles:
- **Admin** - Full access (firewall, USB, IDS, settings)
- **User** - Read-only (dashboard, logs)

---

### Configuration Manager
**File**: `src/services/configuration-manager.js`

- Encrypted settings storage
- Atomic writes with backup
- Schema validation
- Defaults for all options

Stored Configs:
```json
{
  "firewall": { "enabled": true, "policy": "DROP" },
  "usb": { "policy": "BLOCK_ALL" },
  "idsips": { "enabled": true },
  "scanner": { "autoScan": false }
}
```

---

### Forensics Logger
**File**: `src/services/forensics-logger.js`

- Comprehensive security event logging
- Structured JSON logs
- Automatic log rotation (100MB)
- Export (JSON, CSV, syslog)
- Append-only (tamper-proof)

Log Levels:
- CRITICAL (threat detected, auth failed)
- HIGH (blocked, rule triggered)
- MEDIUM (warning, anomaly)
- LOW (info, allow)

---

## 📊 IPC API

### Secure Bridge (React ↔ Electron)

All communication via `window.sentinelAPI`:

#### Firewall
```javascript
await sentinelAPI.invoke('firewall:get-rules')
await sentinelAPI.invoke('firewall:add-rule', ruleData)
await sentinelAPI.invoke('firewall:delete-rule', ruleId)
await sentinelAPI.invoke('firewall:toggle-rule', ruleId)
await sentinelAPI.invoke('firewall:get-statistics')
```

#### USB Control
```javascript
await sentinelAPI.invoke('usb:get-devices')
await sentinelAPI.invoke('usb:authenticate-device', deviceId, pin)
await sentinelAPI.invoke('usb:block-device', deviceId)
await sentinelAPI.invoke('usb:trust-device', deviceId)
await sentinelAPI.invoke('usb:set-global-policy', policy)
```

#### IDS/IPS
```javascript
await sentinelAPI.invoke('idsips:get-events', limit)
await sentinelAPI.invoke('idsips:get-threats')
await sentinelAPI.invoke('idsips:get-statistics')
```

#### Scanners
```javascript
await sentinelAPI.invoke('netscan:start-scan', targets)
await sentinelAPI.invoke('netscan:get-results', scanId)
await sentinelAPI.invoke('webscan:scan-target', url)
await sentinelAPI.invoke('webscan:get-results', scanId)
```

#### Logging & Auth
```javascript
await sentinelAPI.invoke('logs:get-entries', filter)
await sentinelAPI.invoke('logs:export', format) // 'json'|'csv'|'syslog'
await sentinelAPI.invoke('auth:validate-pin', pin)
await sentinelAPI.invoke('dashboard:get-status')
```

---

## 🚀 INSTALLATION & SETUP

### Prerequisites
```bash
# Core
- Node.js 16+
- Electron 26+
- React 18+

# Security Tools (on Kali Linux)
sudo apt update
sudo apt install -y \
  nmap \
  suricata \
  nikto \
  zaproxy \
  usbutils \
  libusb-1.0-0-dev

# Optional: Update Suricata rules
sudo suricata-update
```

### Installation Steps

1. **Clone & Install**
```bash
cd /home/demiurge/Desktop/projects\ 101/sentinel
npm install
```

2. **Development Mode**
```bash
npm run electron-dev
# Runs React dev server + Electron in watch mode
```

3. **Build**
```bash
npm run electron-build
# Creates .deb, .snap, .AppImage for distribution
```

4. **First Run**
```bash
# Run with elevated privileges (required for firewall/USB)
sudo npm run electron

# Or pre-built binary
sudo ./dist/sentinel-security-suite*.AppImage
```

---

## ⚙️ KALI LINUX INTEGRATION

### System Requirements
- Kernel 5.10+ (for udev, netfilter)
- Root privileges (for firewall, USB control)
- 1GB free disk space (for logs)

### Directory Structure
```
~/.sentinel-security/
├── sentinel-config.json        # Main config
├── firewall-rules.json         # Firewall rules
├── logs/
│   ├── sentinel-security.log   # Main security log
│   ├── sentinel-audit.log      # Auth/access logs
│   └── sentinel-threats.log    # IDS/threat events
└── rules/                      # Suricata rules
```

### Systemd Service (Optional)
```ini
# /etc/systemd/system/sentinel.service
[Unit]
Description=Sentinel Security Suite
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/sentinel
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable sentinel
sudo systemctl start sentinel
```

---

## 📈 PERFORMANCE & RESILIENCE

### Optimizations
- **SPI/DPI** - Connection tracking with low CPU overhead
- **IPS Blocking** - Millisecond response time
- **Memory** - Configurable log retention (default 100MB per file)
- **Network** - Packet processing doesn't block UI

### Fail-Safe Design
- **Firewall Fail-Closed** - If engine crashes, default-deny applies
- **USB Lockdown** - Auto-block on reboot if unauthorized
- **Persistent Logs** - Append-only, survives crashes
- **Config Backup** - Automatic .bak on write

---

## 🛡️ SECURITY BEST PRACTICES

### For Users
1. **Change default PIN** - First time after install
2. **Enable MFA** - Additional security layer
3. **Review firewall rules** - Audit all additions
4. **Monitor USB access** - Check logs for suspicious devices
5. **Keep signatures updated** - Run `suricata-update` weekly

### For Administrators
1. **RBAC separation** - Use admin/user roles
2. **Audit logs regularly** - Export/archive for compliance
3. **Test incident response** - Verify auto-blocking works
4. **Network segmentation** - Isolate Kali workstation
5. **Secure credentials** - Protect stored PINs/MFA secrets

---

## 🐛 TROUBLESHOOTING

### Firewall Rules Not Applied
```bash
# Check iptables status
sudo iptables -L -n

# Reload rules manually
sudo /opt/sentinel/reload-firewall.sh

# Check logs
tail -f ~/.sentinel-security/logs/sentinel-security.log
```

### USB Devices Not Detected
```bash
# Check udev rules
sudo udevadm info -e | grep "usb"

# Reload udev
sudo udevadm control --reload-rules
sudo udevadm trigger

# Test device
sudo lsusb
```

### Suricata Not Running
```bash
# Check if installed
which suricata

# Start manually
sudo suricata -c /etc/suricata/suricata.yaml -i eth0

# Check logs
sudo tail -f /var/log/suricata/eve.json
```

---

## 📝 ROADMAP

- [ ] Cloud integration (AWS/GCP security hub)
- [ ] Mobile companion app
- [ ] Advanced ML-based anomaly detection
- [ ] Hardware-accelerated packet filtering
- [ ] Blockchain audit logging
- [ ] GraphQL query language for logs
- [ ] Multi-node cluster support
- [ ] Zero Trust policy builder

---

## 📄 LICENSE
MIT - Open source security suite

## 🤝 CONTRIBUTING
Contributions welcome. Please follow security best practices.

## 📧 SUPPORT
- Docs: See this README
- Issues: GitHub Issues
- Security: security@sentinel.local (PGP key available)

---

**Built with security depth, control granularity, performance efficiency, and resilience.** 🛡️⚡
