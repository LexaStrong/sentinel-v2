# SENTINEL SECURITY SUITE - Cross-Platform Setup & Development Guide

## 🌍 Platform Support Overview

| Feature | Linux (Kali) | Windows (10/11/Server) |
|---------|--------------|----------------------|
| **Firewall** | iptables/netfilter | Windows Firewall (NetSH) |
| **USB Control** | udev rules | WMI + Registry |
| **IDS/IPS** | Suricata | Windows Defender + Snort (optional) |
| **Network Scanning** | Nmap | Nmap (requires Windows build) |
| **Web Scanning** | Nikto/ZAP | Nikto/ZAP (requires Windows build) |
| **Authentication** | Linux PAM | Windows credentials |
| **Logging** | Syslog/Files | Windows Event Log |
| **Build** | .deb, .snap, .AppImage | .exe, .msi, .zip |

---

## 🏗️ Architecture - Platform Detection

The Sentinel Security Suite now supports **both Linux and Windows** with a single codebase using platform detection:

```
electron-main-crossplatform.js (entry point)
    ↓
    Detect OS platform: process.platform
    ↓
    ├─ Windows (win32)
    │  ├─ src/engines/windows-firewall-engine.js
    │  ├─ src/engines/windows-usb-control-engine.js
    │  ├─ src/engines/windows-idsips-engine.js
    │  ├─ src/services/windows-authentication-service.js
    │  └─ src/services/windows-forensics-logger.js
    │
    └─ Linux (linux)
       ├─ src/engines/firewall-engine.js
       ├─ src/engines/usb-control-engine.js
       ├─ src/engines/ids-ips-engine.js
       ├─ src/services/authentication-service.js
       └─ src/services/forensics-logger.js

    Shared (both platforms)
    ├─ src/engines/network-scanner-engine.js
    ├─ src/engines/webapp-scanner-engine.js
    ├─ src/services/configuration-manager.js
    ├─ electron-preload.js
    └─ React UI (src/App.jsx, src/components/)
```

---

## 📁 File Structure

### Windows-Specific Files

```
src/engines/
├─ windows-firewall-engine.js       (400 lines) - NetSH firewall management
├─ windows-usb-control-engine.js    (350 lines) - WMI USB device control
└─ windows-idsips-engine.js         (350 lines) - Defender + Event Log

src/services/
├─ windows-authentication-service.js (250 lines) - Windows credential validation
└─ windows-forensics-logger.js       (350 lines) - Event Log + file logging

Documentation/
├─ WINDOWS-DEPLOYMENT.md    (400+ lines) - Windows install & troubleshooting
├─ WINDOWS-DEVELOPMENT.md   (300+ lines) - Windows dev environment setup
└─ CROSS-PLATFORM.md        (200+ lines) - This file
```

### Linux-Specific Files

```
src/engines/
├─ firewall-engine.js       (400 lines) - iptables firewall
├─ usb-control-engine.js    (350 lines) - udev USB control
└─ ids-ips-engine.js        (350 lines) - Suricata IDS/IPS

src/services/
├─ authentication-service.js (250 lines) - Linux PAM auth
└─ forensics-logger.js       (350 lines) - Syslog/file logging

Documentation/
├─ KALI-INTEGRATION.md       (500+ lines) - Kali install guide
├─ QUICKSTART.md             (400+ lines) - Implementation phases
└─ ARCHITECTURE.md           (500+ lines) - System design
```

### Cross-Platform Files (Both)

```
src/engines/
├─ network-scanner-engine.js  (350 lines) - Nmap integration
└─ webapp-scanner-engine.js   (350 lines) - SSL/OWASP scanning

src/services/
└─ configuration-manager.js   (200 lines) - JSON config storage

Root/
├─ electron-main-crossplatform.js  (500+ lines) - Main process with platform detection
├─ electron-preload.js             (150+ lines) - Secure IPC bridge
├─ electron-preload.js             (150+ lines) - Secure IPC bridge
└─ package.json                    (70+ lines) - Dependencies & scripts
```

---

## 🚀 Getting Started - All Platforms

### 1. Install Node.js

**Windows**:
```powershell
# Download from https://nodejs.org/
# Run installer and select "Add to PATH"

node --version  # v16.0.0+
npm --version   # 7.0.0+
```

**Linux (Kali)**:
```bash
sudo apt update
sudo apt install -y nodejs npm

node --version  # v16.0.0+
npm --version   # 7.0.0+
```

### 2. Clone Repository

**Windows**:
```powershell
cd "C:\Program Files"
git clone https://github.com/your-org/sentinel-security-suite.git
cd sentinel-security-suite
npm install
```

**Linux**:
```bash
cd ~/Desktop/projects\ 101
git clone https://github.com/your-org/sentinel-security-suite.git
cd sentinel-security-suite
npm install
```

### 3. Development Setup

**Windows** (PowerShell, Admin):
```powershell
# Terminal 1: React development server
npm start

# Terminal 2: Electron app (separate terminal, also Admin)
npm run electron-dev
```

**Linux** (Bash, sudo):
```bash
# Terminal 1: React development server
npm start

# Terminal 2: Electron app (separate terminal, with sudo)
sudo npm run electron-dev
```

### 4. Production Build

**Windows**:
```powershell
npm run build                # Build React
npm run electron-build       # Build Electron
# Output: dist/Sentinel-Security-Suite-2.0.0.exe
```

**Linux**:
```bash
npm run build                # Build React
npm run electron-build       # Build Electron (.deb, .AppImage, .snap)
# Output: dist/Sentinel-Security-Suite-2.0.0.deb
```

---

## 🔄 Platform-Specific Code Examples

### Example 1: Checking Current Platform

```javascript
const os = require('os');
const platform = os.platform();

if (platform === 'win32') {
  console.log('Running on Windows');
  const WindowsFirewall = require('./src/engines/windows-firewall-engine');
  // Use Windows-specific engine
} else if (platform === 'linux') {
  console.log('Running on Linux');
  const LinuxFirewall = require('./src/engines/firewall-engine');
  // Use Linux-specific engine
}
```

### Example 2: Platform-Specific Initialization

```javascript
// In electron-main-crossplatform.js
async function initializeSecurityStack() {
  const PLATFORM = os.platform();
  
  if (PLATFORM === 'win32') {
    // Windows: Check admin privileges
    const isAdmin = await checkAdminPrivileges();
    if (!isAdmin) throw new Error('Windows Firewall requires admin');
    
  } else if (PLATFORM === 'linux') {
    // Linux: Check root/sudo
    const isRoot = process.getuid?.() === 0;
    if (!isRoot) throw new Error('Linux firewall requires sudo');
  }
}
```

### Example 3: Cross-Platform Logging

```javascript
// Same API, different implementations
const logger = IS_WINDOWS 
  ? new WindowsForensicsLogger(configManager)
  : new LinuxForensicsLogger(configManager);

// Works on both platforms
await logger.log('firewall:rule-added', { ruleId: 1 });
await logger.exportLogs('json');
```

---

## 🐍 Development Workflow

### Making Changes to Firewall Engine

**Windows**: Edit `src/engines/windows-firewall-engine.js`
**Linux**: Edit `src/engines/firewall-engine.js`

Both inherit the same interface but use different system tools:

```javascript
// Windows version
async addRule(ruleData) {
  // Uses: netsh advfirewall firewall add rule
}

// Linux version
async addRule(ruleData) {
  // Uses: iptables -A CHAIN ...
}
```

### Cross-Platform Feature Implementation

1. **Define interface** (what the feature does)
2. **Implement for each platform** (platform-specific logic)
3. **Test on both platforms**
4. **Document platform differences** in comments

Example:
```javascript
/**
 * Block a network connection
 * 
 * Windows: Uses netsh to add firewall rule
 * Linux: Uses iptables to DROP packets
 */
async blockConnection(sourceIp, destPort) {
  if (IS_WINDOWS) {
    await execAsync(`netsh advfirewall firewall add rule ...`);
  } else if (IS_LINUX) {
    await execAsync(`iptables -A INPUT -s ${sourceIp} -j DROP`);
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```bash
# Test network-scanner-engine (cross-platform)
npm test -- src/engines/network-scanner-engine.test.js

# Test Windows firewall engine
npm test -- src/engines/windows-firewall-engine.test.js

# Test Linux firewall engine
npm test -- src/engines/firewall-engine.test.js
```

### Integration Tests

```bash
# Windows: Test firewall + USB + IDS together
npm test -- integration/windows/security-stack.test.js

# Linux: Test firewall + USB + IDS together
npm test -- integration/linux/security-stack.test.js

# Cross-platform: Test network scanner on both
npm test -- integration/network-scanner.test.js
```

### End-to-End Tests

```bash
# Windows: Full UI + backend test
npm run electron-dev &
npm run test:e2e:windows

# Linux: Full UI + backend test
sudo npm run electron-dev &
npm run test:e2e:linux
```

---

## 🔌 Dependency Differences

### Windows Dependencies

```json
{
  "dependencies": {
    "winreg": "^1.2.4",           // Windows Registry access
    "powershell": "^3.1.0"        // PowerShell command execution
  }
}
```

**CLI Tools** (must be installed separately):
- `netsh` (built-in to Windows)
- `powershell` (built-in to Windows)
- `snort` (optional, for advanced IDS)
- `nmap` (optional, for network scanning)

### Linux Dependencies

```json
{
  "dependencies": {
    "pty.js": "^1.4.0"            // PTY for shell commands
  }
}
```

**CLI Tools** (install with package manager):
- `iptables` (usually pre-installed)
- `udev` (usually pre-installed)
- `suricata` (install via apt)
- `nmap` (install via apt)

### Common Dependencies (Both)

```json
{
  "dependencies": {
    "electron": "^26.0.0",        // Desktop app framework
    "react": "^18.2.0",           // UI framework
    "electron-is-dev": "^1.2.0"   // Dev/prod detection
  }
}
```

---

## 📊 Feature Parity Matrix

| Feature | Linux | Windows | Notes |
|---------|-------|---------|-------|
| Firewall Rules | ✅ | ✅ | Different CLI (iptables vs netsh) |
| USB Blocking | ✅ | ✅ | Different methods (udev vs WMI) |
| IDS/IPS | ✅ (Suricata) | ✅ (Defender) | Different engines |
| Network Scan | ✅ | ✅ | Nmap works on both |
| Web Scan | ✅ | ✅ | Cross-platform |
| Authentication | ✅ (PAM) | ✅ (Windows creds) | Different methods |
| Logging | ✅ | ✅ | Syslog vs Event Log |
| Default-Deny | ✅ | ✅ | Policy applied on both |
| Rate Limiting | ✅ | ✅ | Different implementation |
| Auto-Blocking | ✅ | ✅ | IP blocking on both |

---

## 🎯 Development Priorities

### Priority 1 (Both platforms functional)
- ✅ Firewall rules management
- ✅ USB device detection/blocking
- ✅ Real-time threat detection
- ✅ Event logging

### Priority 2 (UI polish)
- 🔄 Dashboard components (in progress)
- 🔄 Real-time graph updates
- 🔄 Dark theme refinement
- 🔄 Mobile responsiveness

### Priority 3 (Advanced features)
- [ ] ML-based threat detection
- [ ] Cloud integration (multi-device)
- [ ] Mobile app companion
- [ ] Compliance reporting (GDPR, HIPAA)

---

## 🐛 Platform-Specific Debugging

### Windows Debug Mode

```powershell
# Run with verbose logging
$env:DEBUG = "sentinel:*"
npm run electron-dev

# Monitor Event Log in real-time
Get-EventLog -LogName "Sentinel Security" -Newest 1 -Wait -FollowLog

# Check firewall rules
netsh advfirewall firewall show rule name=all | findstr Sentinel

# Monitor WMI USB events
wevtutil qe "System" /q:"*[System[EventID=20005]]" /rd:true /c:10
```

### Linux Debug Mode

```bash
# Run with verbose logging
DEBUG=sentinel:* sudo npm run electron-dev

# Monitor syslog in real-time
sudo tail -f /var/log/syslog | grep sentinel

# Check iptables rules
sudo iptables -L -n | grep Sentinel

# Monitor udev events
sudo udevadm monitor --property
```

---

## 📦 Building for Distribution

### Windows Distribution

```powershell
npm run build                    # Build React
npm run electron-build           # Creates:
                                # - Sentinel-Security-Suite-2.0.0.exe (portable)
                                # - Sentinel-Security-Suite-2.0.0.msi (installer)
                                # - Sentinel-Security-Suite-2.0.0-win64.zip

# Test installer
msiexec /i "dist\Sentinel-Security-Suite-2.0.0.msi"

# Create MSIX package for Windows Store (optional)
npm run electron-build -- --target msix
```

### Linux Distribution

```bash
npm run build                    # Build React
npm run electron-build           # Creates:
                                # - sentinel-security-suite_2.0.0_amd64.deb
                                # - sentinel-security-suite-2.0.0.AppImage
                                # - sentinel-security-suite-2.0.0.snap

# Test .deb package
sudo dpkg -i dist/sentinel-security-suite_2.0.0_amd64.deb

# Test AppImage
chmod +x dist/sentinel-security-suite-2.0.0.AppImage
./dist/sentinel-security-suite-2.0.0.AppImage

# Test snap package (if configured)
sudo snap install dist/sentinel-security-suite_2.0.0_amd64.snap
```

---

## 🚀 Deployment Checklists

### Pre-Release Checklist

- [ ] All tests passing on Windows 10/11 and Linux (Kali)
- [ ] Firewall tests: Add, toggle, delete rules working
- [ ] USB tests: Detect, block, allow working
- [ ] IDS/IPS tests: Threat detection and auto-block working
- [ ] Authentication: PIN + MFA working
- [ ] Logging: All events recorded and exportable
- [ ] UI: Dashboard responsive and real-time data updating
- [ ] Performance: <100ms for rule application, <1GB memory
- [ ] Security audit: IPC whitelist verified, no process injection
- [ ] Documentation: Installation, troubleshooting, API reference updated

### Release Deployment

```bash
# Tag release
git tag -a v2.0.0 -m "Release version 2.0.0"
git push origin v2.0.0

# Build for all platforms
npm run build
npm run electron-build

# Upload to release server
scp dist/* releases.sentinel-security.com:/packages/2.0.0/

# Update checksums and signatures
sha256sum dist/* > dist/checksums.txt
gpg --detach-sign dist/checksums.txt
```

---

## ✅ Verification Checklist

After setup, verify on each platform:

**Windows**:
- [ ] Node.js v16+ installed
- [ ] npm dependencies installed
- [ ] Admin privileges verified
- [ ] Firewall enabled (netsh advfirewall show allprofiles)
- [ ] Event Log source created
- [ ] Can start dev server (npm start)
- [ ] Can run Electron app (npm run electron-dev)

**Linux**:
- [ ] Node.js v16+ installed
- [ ] npm dependencies installed
- [ ] sudo privileges available
- [ ] Firewall can add rules (iptables)
- [ ] syslog accessible
- [ ] Can start dev server (npm start)
- [ ] Can run Electron app (sudo npm run electron-dev)

---

## 📞 Support

- **Windows Issues**: See [WINDOWS-DEPLOYMENT.md](WINDOWS-DEPLOYMENT.md)
- **Linux Issues**: See [KALI-INTEGRATION.md](KALI-INTEGRATION.md)
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation**: See [QUICKSTART.md](QUICKSTART.md)

---

**Sentinel Security Suite v2.0** - Cross-Platform Enterprise Security 🛡️
