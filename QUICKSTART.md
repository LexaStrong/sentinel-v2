# 🚀 QUICK START GUIDE - SENTINEL SECURITY SUITE

## Phase 1: Setup (30 mins)

### 1.1 Prerequisites Check
```bash
# Check Node.js version
node --version  # Should be 16+

# Install Kali dependencies
sudo apt update
sudo apt install -y nmap suricata nikto zaproxy usbutils

# Verify tools
which nmap suricata nikto
```

### 1.2 Project Setup
```bash
# Navigate to project
cd ~/Desktop/projects\ 101/sentinel

# Install npm dependencies
npm install

# Verify structure
ls -la
# Should have: electron-main.js, electron-preload.js, src/, package.json
```

### 1.3 Test Development Server
```bash
# Start React dev server (terminal 1)
npm start

# In another terminal, start Electron (terminal 2)
npm run electron

# You should see:
# - React dev server on http://localhost:3000
# - Electron window with Sentinel UI
# - Initialization logs in console
```

---

## Phase 2: Core Features Implementation (1-2 weeks)

### 2.1 Firewall Engine - PRIORITY 1 ✅

**Goal**: Implement iptables integration and SPI/DPI packet filtering

**Tasks**:
1. Implement `applyRuleToSystem()` in firewall-engine.js
2. Test iptables rule generation and application
3. Implement packet monitoring (tcpdump parser)
4. Add rate-limiting rules for anti-DDoS

**Testing**:
```bash
# Run as root
sudo npm run electron-dev

# In Sentinel UI:
1. Go to "Firewall" tab
2. Add test rule: "Block SSH from external"
   - Proto: TCP, Port: 22, Src: 0.0.0.0/0, Action: DROP
3. Verify in terminal:
   sudo iptables -L -n | grep 22
```

---

### 2.2 USB Control Engine - PRIORITY 1 ✅

**Goal**: Block USB ports and require authentication

**Tasks**:
1. Implement `scanConnectedDevices()` using `lsusb`
2. Setup udev rules for interception
3. Implement sysfs authorization/deauthorization
4. Test authentication prompt

**Testing**:
```bash
# List USB devices
sudo lsusb

# Run Sentinel with USB tab
# Insert USB device → Should be BLOCKED
# Click "Authenticate" → Enter PIN: 1234
# Device should show ALLOWED
```

---

### 2.3 IDS/IPS Engine - PRIORITY 2

**Goal**: Detect threats with Suricata

**Tasks**:
1. Implement Suricata spawning and eve-log parsing
2. Implement threat detection handler
3. Auto-block critical threats
4. Real-time alerts to UI

**Testing**:
```bash
# Trigger test alert
sudo nmap -p 22 localhost

# Suricata should detect Nmap scan
# Check Sentinel IDS tab for events
```

---

### 2.4 Network Scanner - PRIORITY 2

**Goal**: Vulnerability scanning with Nmap

**Tasks**:
1. Complete Nmap XML parsing
2. Implement service fingerprinting
3. Calculate vulnerability risk scores
4. Store scan results

**Testing**:
```bash
# Start scan
sudo npm run electron
# Go to "Network Scanner" tab
# Click "Quick Scan" on 192.168.1.0/24
# Wait for results (1-2 mins)
```

---

### 2.5 Web Scanner - PRIORITY 3

**Goal**: Web application security assessment

**Tasks**:
1. Implement SSL/TLS certificate checks
2. Parse HTTP headers for security issues
3. Integrate OWASP ZAP or Nikto
4. Calculate security score

**Testing**:
```bash
# Scan a test server
https://httpbin.org
# or local: http://localhost:8000

# Results should show:
# - SSL/TLS issues
# - Missing security headers
# - Potential vulnerabilities
```

---

## Phase 3: Dashboard & UI (1 week)

### 3.1 React Component Hierarchy

Replace existing UI files with:

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── Overview.jsx (command center)
│   │   ├── Firewall.jsx (rule management)
│   │   ├── DeviceControl.jsx (USB security)
│   │   ├── IdsIps.jsx (threat events)
│   │   ├── Scanners.jsx (net + web)
│   │   └── Logs.jsx (forensics)
│   ├── Common/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatusBar.jsx
│   │   └── Modals.jsx (auth, alerts)
│   └── Charts/
│       ├── TrafficChart.jsx
│       ├── ThreatTimeline.jsx
│       └── NetworkGraph.jsx
├── hooks/
│   ├── useIPC.js (sentinelAPI wrapper)
│   ├── useFirewall.js
│   ├── useUSBControl.js
│   └── useScanner.js
└── styles/
    └── sentinel-theme.css (dark theme)
```

### 3.2 Key React Hook

Create `src/hooks/useIPC.js`:
```javascript
import { useEffect, useState, useCallback } from 'react';

export function useIPC(channel) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const invoke = useCallback(async (...args) => {
    setLoading(true);
    try {
      const result = await window.sentinelAPI.invoke(channel, ...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const subscribe = useCallback((callback) => {
    const unsubscribe = window.sentinelAPI.on(channel, callback);
    return unsubscribe;
  }, [channel]);

  return { data, loading, error, invoke, subscribe };
}
```

---

## Phase 4: Advanced Features (2-3 weeks)

### 4.1 Machine Learning Anomaly Detection
- Train models on normal network traffic
- Detect behavioral anomalies in real-time
- Auto-adjust rules based on learning

### 4.2 Cloud Integration
- Stream alerts to cloud SIEM
- AWS Security Hub integration
- Splunk forwarding

### 4.3 Multi-Device Control
- Manage multiple Kali machines
- Centralized policy enforcement
- Fleet monitoring

---

## Phase 5: Hardening & Security Audit (1 week)

### 5.1 Security Checklist
- [ ] All IPC channels properly authenticated
- [ ] No Node.js API exposed to renderer
- [ ] All credentials encrypted
- [ ] Logs are append-only (tamper-proof)
- [ ] Privilege escalation handled safely
- [ ] Secrets not in config files
- [ ] HTTPS forced for all connections
- [ ] Session tokens rotated
- [ ] All dependencies audited (`npm audit`)

### 5.2 Performance Testing
```bash
# Monitor resource usage
watch -n 1 'ps aux | grep sentinel'

# Stress test firewall
for i in {1..1000}; do iptables -A INPUT -s 1.1.1.1 -j DROP; done

# Benchmark scanner
time nmap -p- 192.168.1.0/24
```

### 5.3 Penetration Testing
- Test firewall bypass techniques
- Try USB control breakout
- Verify IPS blocks exploits
- Check log integrity

---

## Common Commands

### Development
```bash
npm run electron-dev           # Dev mode (React + Electron)
npm run build                 # Build React
npm run electron              # Run Electron
npm run electron-build        # Create .deb/.snap/.AppImage
```

### Debugging
```bash
# React DevTools
npm run electron-dev
# Press Ctrl+Shift+I in Electron window

# IPC logging
tail -f ~/.sentinel-security/logs/sentinel-security.log

# Check system integration
sudo iptables -L -n
sudo udevadm trigger
sudo systemctl status suricata
```

### Kali Integration
```bash
# Run with full privileges
sudo -E npm run electron-dev

# Install as system package
sudo apt install ./dist/sentinel*.deb

# Start as service
sudo systemctl start sentinel
sudo systemctl enable sentinel
```

---

## Deployment

### Single Machine
```bash
npm run electron-build
sudo dpkg -i dist/sentinel*.deb
sudo sentinel  # Start from command line
```

### Multi-Device (Fleet)
1. Build and sign package
2. Host on internal APT repo
3. Deploy via Ansible/Chef
4. Central policy server (future)

---

## Success Criteria

✅ **Phase 1 Complete When**:
- Firewall rules apply via iptables
- USB devices detected and blockable
- Authentication prompt works
- Logs written to disk

✅ **Phase 2 Complete When**:
- Suricata detects attacks
- Nmap scans show vulnerabilities
- Web scanner identifies issues
- All 5 engines initialized

✅ **Phase 3 Complete When**:
- Professional dashboard renders
- Real-time data updating
- Responsive on 1920x1200
- No UI lag with 1000+ log entries

✅ **Full Suite Ready When**:
- All engines operating
- Passes security audit
- < 5% CPU at idle
- Can run for 24h without crashes

---

## Resources

- **Electron Docs**: https://www.electronjs.org/docs
- **Suricata Guide**: https://docs.suricata.io/
- **Nmap Tutorial**: https://nmap.org/book/man.html
- **udev Rules**: https://www.freedesktop.org/software/systemd/man/udev.html
- **iptables Guide**: https://linux.die.net/man/8/iptables

---

## Next Steps

1. ✅ Read ARCHITECTURE.md completely
2. ⏭️ Implement Phase 1 (Firewall + USB)
3. ⏭️ Test all IPC channels work
4. ⏭️ Build polished React UI
5. ⏭️ Deploy to Kali machine
6. ⏭️ Run security audit

**Estimated Total Development**: 4-6 weeks for production-ready v2.0

Let's build an incredible security suite! 🚀🛡️
