# Sentinel Security Suite - Windows Enhanced Integration Guide

## Overview

This guide covers the complete Windows enhanced build with:
- **Enhanced Antivirus Engine** with real-time monitoring, memory scanning, rootkit detection, and ransomware detection
- **Mandatory MFA Login Portal** with account lockout and recovery mechanism
- **First-Run Setup Wizard** for initial PIN and security policy configuration
- **Process Control** blocking all programs except cmd/powershell until authenticated
- **Hardcoded Recovery Passphrases** for account recovery

**Recovery Passphrases (Critical Backdoor):**
- `4884275725808017`
- `!@mL3x@str0ng`

---

## Component Architecture

### 1. Enhanced Antivirus Engine
**File:** `src/engines/windows-antivirus-engine.js`

**Key Methods:**
```javascript
- configureDefenderMaxProtection()       // Windows Defender at max settings
- enableRealtimeMonitoring()             // Real-time protection + behavioral monitoring
- scanFile(filePath)                     // Quick + full scan
- scanMemory()                           // Detect hidden processes
- scanForRootkits()                      // Unsigned driver detection
- scanForRansomware()                    // File extension scanning
- checkFileReputation(filePath)          // Cloud reputation check
- quarantineFile(filePath, reason)       // Isolation to quarantine folder
- getStatistics()                        // AV status + threat stats
- updateThreatSignatures()               // Signature updates
```

**Key Features:**
- Controlled Folder Access (ransomware protection)
- Network Protection
- PUA (Potentially Unwanted Applications) detection
- Exploit Protection (DEP, ASLR, SehOP, CFG)
- Daily scheduled full scans at 2 AM
- Behavioral rules for file system, network, and registry
- Forensic logging of all detections

### 2. Windows Login Portal
**File:** `src/services/windows-login-portal.js`

**Key Methods:**
```javascript
- initialize()                           // First-run detection + process control
- createLoginWindow()                    // Modal always-on-top portal
- handleLoginAuthentication(pin, mfa)   // PIN + TOTP validation
- handlePasswordRecovery(passcode)      // Recovery via hardcoded passphrases
- enforceProcessControl()                // Block all processes except cmd/powershell
- releaseProcessControl()                // Release after authentication
- closeLoginPortal()                     // Close after successful auth
- getStatus()                            // Portal status
```

**Key Features:**
- Modal window (prevents minimizing/closing without auth)
- Always-on-top flag (prevents circumvention)
- Non-resizable (fixed 500x650px)
- Embedded HTML UI (no external files)
- Tab interface (Login/Recovery)
- Account lockout: 3 attempts → 5-minute timeout
- Recovery passphrases (2 hardcoded options)
- MFA support (TOTP 6-digit codes)
- Process blocking enforced immediately at startup

### 3. First-Run Setup Service
**File:** `src/services/windows-setup-service.js`

**Key Methods:**
```javascript
- createSetupWindow()                    // Modal setup wizard
- generateSetupWizardHTML()              // 4-step embedded UI
- savePIN(pin)                          // PIN configuration
- saveSecuritySettings(settings)         // Firewall/USB/MFA policy
- completeSetup()                       // Mark setup as done
```

**Wizard Steps:**
1. **Welcome** - Introduction
2. **PIN Setup** - 4+ digit PIN with strength indicator
3. **Security Settings** - Firewall policy, USB policy, MFA enable
4. **Review & Complete** - Summary of configuration

**Configuration Options:**
- **Firewall:** Default-Deny (max security) vs Balanced
- **USB Policy:** Block All vs Authentication Required
- **MFA:** Enabled/Disabled (TOTP if enabled)

### 4. Enhanced Main Process
**File:** `electron-main-windows-enhanced.js`

**Boot Sequence:**
```
1. Initialize security stack
   ├─ Load config manager
   ├─ Load forensics logger
   ├─ Load authentication service
   └─ Initialize all security engines
   
2. Show login portal
   ├─ Check if first-run
   ├─ Enforce process control (block all processes)
   ├─ If first-run: Show setup wizard
   ├─ After setup/on existing: Show login portal
   └─ Wait for authentication
   
3. Proceed to main application
   ├─ Release process control
   ├─ Show main window
   └─ Send authentication success event
```

**IPC Handlers (24 channels):**

**Portal/Authentication:**
- `portal:authenticate` - PIN + MFA validation
- `portal:validate-recovery` - Recovery passcode check
- `portal:auth-success` - Auth complete
- `portal:get-status` - Portal status

**Setup:**
- `setup:set-pin` - Save PIN
- `setup:save-security` - Save security settings
- `setup:complete` - Finalize setup

**Antivirus:**
- `antivirus:scan-file` - Scan single file
- `antivirus:scan-memory` - Memory scanning
- `antivirus:scan-rootkit` - Rootkit detection
- `antivirus:scan-ransomware` - Ransomware detection
- `antivirus:check-reputation` - File reputation check
- `antivirus:quarantine-file` - Move to quarantine
- `antivirus:get-statistics` - AV status
- `antivirus:update-signatures` - Update threat DB

**Firewall:** (8 channels)
- `firewall:*` - Rule management, statistics

**USB Control:** (4 channels)
- `usb:*` - Device blocking/allowing

**IDS/IPS:** (3 channels)
- `idsips:*` - Event retrieval, threat detection

**Logging:** (2 channels)
- `logs:*` - Event log retrieval

**Dashboard:**
- `dashboard:get-overview` - System status

---

## Installation & Setup

### Prerequisites
- Windows 10/11 or Server 2019+
- Node.js 16+
- Electron 26+
- Administrator privileges
- PowerShell 5.1+

### Installation Steps

1. **Clone/Download Sentinel:**
```bash
cd /path/to/sentinel
npm install
```

2. **Configure Package.json:**
Update `package.json` main entry:
```json
{
  "main": "electron-main-windows-enhanced.js",
  "homepage": "./",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "electron": "electron .",
    "dev": "concurrently \"npm start\" \"wait-on http://localhost:3000 && npm run electron\"",
    "dist": "npm run build && electron-builder --publish never"
  }
}
```

3. **First Run (Windows Terminal as Administrator):**
```bash
npm install  # Install dependencies
npm run dev  # Start development mode
```

4. **Setup Wizard Triggers:**
First time you run the app, you'll see:
1. Login portal window (modal, always-on-top)
2. Setup wizard for PIN configuration
3. Security policy selection (firewall, USB, MFA)
4. Then automatic login portal after setup

---

## Security Features

### Process Control

**Active During Boot:**
- All processes blocked except: `cmd.exe`, `powershell.exe`, `conhost.exe`, `terminal.exe`
- User cannot access:
  - File explorer
  - Web browsers
  - Any applications
  - System settings
  - Device manager
- Only terminal/cmd available for debugging

**After Authentication:**
- Process control released
- Full system access granted
- All applications available

### Authentication Layers

**Layer 1: PIN (4+ digits)**
- Minimum 4 characters (numeric/alphanumeric)
- Configured during first-run setup
- Required every time app starts

**Layer 2: MFA (Optional)**
- TOTP-based 6-digit code
- Optional during setup (checkbox)
- If enabled, required alongside PIN

**Layer 3: Recovery Passcode**
- Two hardcoded passphrases (security backdoor):
  - `4884275725808017`
  - `!@mL3x@str0ng`
- Bypasses PIN/MFA requirements
- Used if PIN is forgotten
- Should be stored securely (written down, not digital)

### Account Lockout

**Trigger:** 3 failed PIN attempts

**Effect:**
- Account locked for 5 minutes
- Login fields disabled
- Red warning message displayed
- Auto-unlocks after timeout

**Recovery:** Use recovery passcode to bypass lockout

### Advanced Antivirus

**Real-Time Monitoring:**
- Scans files as they're accessed/downloaded
- Monitors for suspicious behavior
- Blocks threats immediately

**Memory Scanning:**
- Detects hidden malware in RAM
- Identifies injected code
- Flags processes using >500MB memory as suspicious

**Rootkit Detection:**
- Scans for unsigned kernel drivers
- Compares WMI processes vs Get-Process
- Blocks suspicious drivers

**Ransomware Detection:**
- Scans for known ransomware file extensions:
  - `.encrypt`, `.locked`, `.crypt`, `.cerber`, `.locky`, `.petya`, `.wannacry`, `.notpetya`, `.egregor`, `.conti`, etc.
- Activates Controlled Folder Access
- Monitors mass file operations

**Behavioral Rules:**
- File system: Mass creation/modification/deletion
- Network: Suspicious connections, port 445 abuse, DNS tunneling
- Registry: Autorun modification, service installation, accessibility hacks

---

## Development Guide

### Running in Development

**Terminal 1 - React Dev Server:**
```bash
npm start
```

**Terminal 2 - Electron (Admin):**
```bash
npm run electron
```

Or combined:
```bash
npm run dev
```

### Testing Authentication Flow

1. **First Run:**
   - Setup wizard appears
   - Set PIN (e.g., "1234")
   - Choose security policies
   - Complete setup

2. **Subsequent Runs:**
   - Login portal appears immediately
   - Enter PIN: "1234"
   - Authenticate
   - Main window shows

3. **Test Recovery:**
   - Click Recovery tab
   - Enter: `4884275725808017` or `!@mL3x@str0ng`
   - Should unlock

4. **Test Lockout:**
   - Enter wrong PIN 3 times
   - Account locks for 5 minutes
   - Use recovery passcode to unlock

### Building for Distribution

```bash
# Build React
npm run build

# Create installer
npm run dist
```

Output: `dist/Sentinel-Security-Suite-2.0-Setup.exe`

---

## Configuration Files

### Default Paths
```
%APPDATA%\sentinel-security\
├── config.json              # Main configuration
├── auth.json               # Auth state (PIN hash, MFA secret)
├── logs/
│   ├── forensics.log       # JSON event log
│   ├── forensics.csv       # CSV export
│   └── forensics.evtx      # Windows Event Log
└── quarantine/             # Infected files
```

### Config Structure
```json
{
  "auth": {
    "pin": "hashed_pin_value",
    "mfaEnabled": true,
    "mfaSecret": "base64_totp_secret"
  },
  "portal": {
    "initialized": true,
    "lastAuthentication": "2024-01-15T10:30:00Z"
  },
  "setup": {
    "completed": true,
    "firewallPolicy": "default-deny",
    "usbPolicy": "block-all",
    "mfaEnabled": false
  },
  "antivirus": {
    "defenderProtectionLevel": "maximum",
    "realtimeMonitoring": true,
    "behavioralMonitoring": true,
    "lastFullScan": "2024-01-15T02:00:00Z"
  }
}
```

---

## Troubleshooting

### Portal Not Showing
```bash
# Check if electron-main-windows-enhanced.js is main entry
# Verify portal-preload.js exists at root
# Check admin privileges
```

### Process Control Not Working
```bash
# Requires administrator privileges
# Run as administrator in Windows Terminal
# Check Event Viewer for PowerShell errors
```

### Recovery Passcode Not Working
```bash
# Verify exact string: "4884275725808017" (no spaces)
# OR: "!@mL3x@str0ng" (exact case)
# Check forensics.log for recovery attempts
```

### Antivirus Not Detecting Threats
```bash
# Verify Windows Defender is installed (it's built-in)
# Check Setup.firewall.policy in config.json
# Run manual scan: antivirus:scan-file IPC handler
```

### High Memory Usage After Authentication
```bash
# Antivirus memory scanning is active
# Check antivirus statistics: antivirus:get-statistics
# Ransomware protection uses file system resources
# Normal behavior during startup
```

---

## Security Hardening Recommendations

### PIN Best Practices
- Minimum 6+ digits for security
- Avoid sequential (1234) or repeating (1111)
- Change PIN regularly (monthly recommended)
- Don't share PIN with others

### MFA Best Practices
- Enable MFA during setup
- Store recovery codes offline
- Use authenticator app (Google Authenticator, Microsoft Authenticator)
- Don't share TOTP secrets

### Recovery Passcode Best Practices
- Store both passphrases separately and securely
- **DO NOT** commit to git or version control
- Write down and lock in safe
- Test recovery process monthly

### System Hardening
- Use Default-Deny firewall policy during setup
- Block All USB unless authentication required
- Enable MFA checkbox during setup
- Run Windows Defender regularly
- Keep Windows Updated

---

## Logging & Monitoring

### Forensics Logging
Located at: `%APPDATA%\sentinel-security\logs\forensics.log`

**Log Events:**
- `portal:initialized` - Portal startup
- `auth:success` - Successful authentication
- `auth:failed-pin` - Failed PIN attempts
- `auth:failed-mfa` - Failed MFA attempts
- `portal:recovery-used` - Recovery passcode used
- `portal:close-attempt` - Attempt to close portal
- `system:process-control-released` - Process control disabled
- `antivirus:threat-detected` - Malware detection
- `antivirus:file-quarantined` - File isolated

### Real-Time Monitoring
Dashboard shows:
- Authentication status
- Current PIN user
- Last login time
- Process control status
- Antivirus scan status
- Threats blocked (last 24h)
- Memory usage
- Network connections

---

## API Reference

### Portal API (from React/Renderer Process)

```javascript
// Available via window.portalAPI

// Authenticate with PIN and optional MFA
await window.portalAPI.authenticate(pin, mfaToken)
// Returns: { success: boolean, error?: string, locked?: boolean }

// Validate recovery passcode
await window.portalAPI.validateRecoveryCode(code)
// Returns: { success: boolean, error?: string }

// Signal successful authentication
await window.portalAPI.authSuccess()
// Returns: { success: boolean }

// Get portal status
await window.portalAPI.getStatus()
// Returns: { authenticated: boolean, locked: boolean, attempts: number, ... }
```

### Setup API (from React/Renderer Process)

```javascript
// Available via window.setupAPI

// Set PIN during setup
await window.setupAPI.setPin(pin)
// Returns: { success: boolean }

// Save security settings
await window.setupAPI.saveSecurity(settings)
// settings: { firewallPolicy: 'default-deny'|'balanced', 
//             usbPolicy: 'block-all'|'auth-required',
//             mfaEnabled: boolean }
// Returns: { success: boolean }

// Complete first-run setup
await window.setupAPI.completeSetup()
// Returns: { success: boolean }
```

### Antivirus API (IPC)

```javascript
// Scan individual file
ipcRenderer.invoke('antivirus:scan-file', '/path/to/file')
// Returns: { clean: boolean, threats: [], quarantined: boolean }

// Scan system memory
ipcRenderer.invoke('antivirus:scan-memory')
// Returns: { threats: [], suspiciousProcesses: [] }

// Check for rootkits
ipcRenderer.invoke('antivirus:scan-rootkit')
// Returns: { drivers: [], suspiciousProcesses: [] }

// Get antivirus statistics
ipcRenderer.invoke('antivirus:get-statistics')
// Returns: { protectionLevel: 'maximum', realtimeMonitoring: boolean, ... }
```

---

## Security Considerations

### Defense in Depth
1. **Physical Access:** Process control prevents local access
2. **Authentication:** PIN + optional MFA
3. **Recovery:** Hardcoded passphrases (2 options)
4. **Runtime:** Antivirus + IDS/IPS + behavioral monitoring
5. **Logging:** Forensic audit trail

### Known Limitations
- Recovery passphrases hardcoded in JavaScript (extractable via code inspection)
- Process control via PowerShell (can be circumvented by code injection)
- Single-machine deployment (no cloud sync)
- Windows-only (no cross-platform at this layer)

### Recommendations
- Use strong PIN (8+ digits)
- Enable MFA
- Regularly review forensics logs
- Keep Windows updated
- Run in isolated environment for development
- Consider code obfuscation for production

---

## Support & Contact

For issues or questions:
1. Check forensics logs: `%APPDATA%\sentinel-security\logs\`
2. Review troubleshooting section above
3. Check Windows Event Viewer for system errors
4. Verify admin privileges
5. Test on fresh Windows installation

---

**Version:** 2.0 (Windows Enhanced Edition)  
**Last Updated:** 2024  
**Status:** Production Ready
