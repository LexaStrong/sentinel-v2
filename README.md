# Sentinel Security Suite v2.0 - Windows Enhanced Edition

🛡️ **Enterprise-Grade Windows Security Suite with Advanced Threat Protection**

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)
![Status](https://img.shields.io/badge/status-Production%20Ready-green)

---

## 📋 Overview

Sentinel Security Suite v2.0 is a comprehensive Windows security platform featuring mandatory MFA authentication, advanced antivirus protection, absolute process control, and professional monitoring dashboard.

**Built with:** Electron 26+ | React 18+ | Node.js 22+ | Windows PowerShell 5.1+

---

## ✨ Key Features

### 🔐 Authentication & Access Control
- **Multi-Layer Authentication** - PIN (bcrypt) + MFA (TOTP) + Recovery passphrases
- **Mandatory Portal** - Always-on-top modal at app startup
- **Account Protection** - Lockout after 3 failed attempts (5-minute timeout)
- **Recovery Mechanism** - 2 hardcoded emergency passphrases
- **Process Control** - Only cmd/powershell available until authenticated

### 🦾 Advanced Antivirus
- Real-time file monitoring
- Memory introspection (hidden process detection)
- Rootkit detection (unsigned driver scanning)
- Ransomware protection (30+ file extensions)
- File reputation checks (SHA256 cloud database)
- Behavioral analysis (filesystem, network, registry)
- Quarantine functionality
- Daily automated scans

### 🔥 Network Security
- **Firewall** - Stateful & Deep Packet Inspection with default-deny policy
- **IDS/IPS** - Real-time intrusion detection & prevention
- **Network Scanner** - Active vulnerability scanning
- **Web Scanner** - URL reputation & phishing detection

### 🎮 Device Control
- USB device enumeration & classification
- Per-device blocking/allowing
- Trusted device list management
- Authentication requirement option

### 📊 Professional Dashboard
- Real-time security monitoring
- 9+ feature tabs
- Threat event timeline
- Forensic log viewer
- Configuration management

---

## 🚀 Quick Start

### Prerequisites
- Windows 10/11 or Server 2019+
- Node.js 16+ (v22.22.2 recommended)
- npm 8+ (v9.2.0 recommended)
- Administrator privileges

### Installation

```bash
# Clone repository
git clone https://github.com/LexaStrong/sentinel-v2.git
cd sentinel-v2

# Install dependencies
npm install

# Run development mode
npm run electron-windows-dev

# Build production
npm run build

# Create Windows installer
npm run electron-build-windows
```

**Output:** `dist/Sentinel-Security-Suite-2.0-Setup.exe`

---

## 📂 Project Structure

```
sentinel-v2/
├── electron-main-windows-enhanced.js       # Main Electron entry point (500+ lines)
├── portal-preload.js                       # Secure IPC bridge for login portal
├── setup-preload.js                        # Secure IPC bridge for setup wizard
├── src/
│   ├── engines/                            # Security engines
│   │   ├── windows-antivirus-engine.js    # Enhanced antivirus (350+ lines)
│   │   ├── windows-firewall-engine.js     # Stateful firewall
│   │   ├── windows-usb-control-engine.js  # USB device control
│   │   ├── windows-idsips-engine.js       # Intrusion detection
│   │   └── [more engines...]
│   ├── services/                           # Security services
│   │   ├── windows-login-portal.js        # MFA login (450+ lines)
│   │   ├── windows-setup-service.js       # Setup wizard (400+ lines)
│   │   ├── windows-authentication-service.js
│   │   └── windows-forensics-logger.js
│   ├── sentinel-security-suite.jsx         # React dashboard (700+ lines)
│   ├── index.js                            # React app entry
│   └── App.js                              # App wrapper
├── public/
│   └── index.html                          # HTML entry point
├── package.json                            # Build configuration
├── BUILD-GUIDE.md                          # Comprehensive build guide
├── COMPLETION-REPORT.md                    # Project completion report
└── [14+ documentation files]
```

---

## 🔐 Security Features

### Three-Layer Authentication

```
Layer 1: PIN (4+ digits, bcrypt hashed)
   ↓ or
Layer 2: PIN + MFA (6-digit TOTP)
   ↓ or
Layer 3: Recovery Passphrases (2 hardcoded options)
```

### Recovery Passphrases (Store Securely!)

```
Passcode 1: 4884275725808017
Passcode 2: !@mL3x@str0ng
```

**⚠️ IMPORTANT:** Store these in a secure location. They bypass PIN/MFA and account lockout. Never commit to version control.

### Process Control

**Before Authentication:**
- ✗ File explorer blocked
- ✗ Web browsers blocked
- ✗ System settings blocked
- ✗ All applications blocked
- ✓ cmd.exe available
- ✓ powershell.exe available

**After Authentication:**
- ✓ Full system access restored

---

## 🎯 Boot Sequence

```
1. Security Stack Initialization
   ├─ Configuration Manager
   ├─ Forensics Logger
   ├─ Authentication Service
   └─ All Security Engines

2. Process Control Enforcement
   └─ Block all processes except terminal

3. First-Run Setup
   ├─ PIN configuration
   ├─ Firewall policy selection
   ├─ USB policy selection
   └─ MFA enablement

4. MFA Login Portal
   ├─ PIN + MFA validation
   └─ Recovery passcode option

5. Authentication Success
   └─ Release process control

6. Main Application
   └─ Display monitoring dashboard
```

---

## 📡 IPC Channels (24 Total)

### Portal & Authentication (4)
- `portal:authenticate` - Validate PIN + MFA
- `portal:validate-recovery` - Check recovery code
- `portal:auth-success` - Notify auth complete
- `portal:get-status` - Portal status

### Setup (3)
- `setup:set-pin` - Save user PIN
- `setup:save-security` - Save policies
- `setup:complete` - Mark setup done

### Antivirus (8)
- `antivirus:scan-file` - Scan file
- `antivirus:scan-memory` - Scan memory
- `antivirus:scan-rootkit` - Detect rootkits
- `antivirus:scan-ransomware` - Detect ransomware
- `antivirus:check-reputation` - Check file rep
- `antivirus:quarantine-file` - Isolate threat
- `antivirus:get-statistics` - AV statistics
- `antivirus:update-signatures` - Update database

### Firewall (3) | USB (3) | IDS/IPS (2) | Dashboard (1)

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| Total Code | 2500+ lines |
| Components | 7 major |
| IPC Channels | 24 |
| Security Layers | 3 |
| Antivirus Features | 10+ |
| Documentation | 1000+ lines |
| Files | 43 total |

---

## 🛠️ Development

### Scripts

```bash
npm run electron-windows           # Run production build
npm run electron-windows-dev       # Run with React dev server
npm run build                      # Create React build
npm run electron-build-windows     # Create Windows installer
npm test                          # Run tests
```

### Debug Mode

```bash
DEBUG=sentinel:* npm run electron-windows-dev
```

---

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [BUILD-GUIDE.md](BUILD-GUIDE.md) | Complete build and deployment guide |
| [README-WINDOWS-ENHANCED.md](README-WINDOWS-ENHANCED.md) | Quick start guide |
| [WINDOWS-ENHANCED-INTEGRATION.md](WINDOWS-ENHANCED-INTEGRATION.md) | Full deployment reference |
| [WINDOWS-ENHANCED-IMPLEMENTATION-SUMMARY.md](WINDOWS-ENHANCED-IMPLEMENTATION-SUMMARY.md) | Technical implementation details |
| [COMPLETION-REPORT.md](COMPLETION-REPORT.md) | Project completion summary |
| [PROJECT-COMPLETE.md](PROJECT-COMPLETE.md) | Final status report |

---

## 🔍 Configuration

### Default Storage Location
```
%APPDATA%\sentinel-security\
├── config.json          # Configuration file
├── auth.json           # Authentication data
└── logs/
    ├── forensics.log
    ├── forensics.csv
    └── forensics.evtx
```

### Environment Variables
```bash
NODE_ENV=production              # Production mode
DEBUG=sentinel:*                 # Enable debugging
ELECTRON_ENABLE_LOGGING=1        # Electron logging
```

---

## 📋 System Requirements

| Requirement | Specification |
|------------|---|
| **OS** | Windows 10/11 or Server 2019+ |
| **RAM** | 4 GB minimum (8 GB recommended) |
| **Disk** | 500 MB free space |
| **Node.js** | 16+ (v22.22.2 tested) |
| **npm** | 8+ (v9.2.0 tested) |
| **PowerShell** | 5.1+ (Windows built-in) |

---

## 🚨 Troubleshooting

### npm install hangs
```bash
npm install --no-audit
npm install --legacy-peer-deps
```

### Electron won't launch
```bash
npm install electron --force
npm run electron-windows
```

### Portal not displaying
- Verify administrator privileges
- Check Windows Defender isn't blocking
- Review logs: `%APPDATA%\sentinel-security\logs\`

### Recovery passcode not working
- Verify exact spelling (case-sensitive)
- Try both passphrases
- Check forensic event logs

---

## 🎓 Next Steps

### For Testing
```bash
npm install
npm run electron-windows-dev
```

### For Production
```bash
npm run build
npm run electron-build-windows
```

### For Deployment
1. Copy `dist/Sentinel-Security-Suite-2.0-Setup.exe`
2. Run as Administrator on target system
3. Complete first-run setup
4. Authenticate with PIN
5. System ready

---

## 📞 Support

For issues, questions, or contributions:
- Check [BUILD-GUIDE.md](BUILD-GUIDE.md)
- Review [WINDOWS-ENHANCED-INTEGRATION.md](WINDOWS-ENHANCED-INTEGRATION.md)
- Check forensic logs in `%APPDATA%\sentinel-security\logs\`

---

## 📄 License

**Proprietary** - Sentinel Security Suite v2.0 is proprietary software.

---

## 🎉 Status

✅ **Production Ready**

- ✅ All components implemented
- ✅ All features tested
- ✅ Documentation complete
- ✅ Ready for deployment

---

## 👨‍💻 Development Team

**Built by:** Lex Strong  
**Project:** Sentinel Security Suite v2.0  
**Released:** April 2026  
**Version:** 2.0.0 - Windows Enhanced Edition  

---

**Made with 🛡️ for Windows Security**
