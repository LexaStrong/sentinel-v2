# 🐉 KALI LINUX INTEGRATION GUIDE

## System-Level Security Integration

### Prerequisites & Setup

```bash
# Update Kali
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y \
    nodejs npm \
    nmap \
    suricata \
    suricata-update \
    nikto \
    zaproxy \
    usbutils \
    libusb-1.0-0-dev \
    build-essential \
    python3-dev \
    git

# Verify installations
node --version          # v16+
nmap --version
suricata --version
udevadm --version
```

---

## Kernel Module Management

### USB Device Blocking (via Kernel)

**Disable USB storage at kernel level** (maximum security):

```bash
# Edit /etc/modprobe.d/disable-usb.conf
sudo nano /etc/modprobe.d/disable-usb.conf

# Add these lines to BLOCK different device types:
# Block USB storage
blacklist usb_storage

# Block USB HID (optional - may disable keyboard/mouse)
# blacklist usbhid

# Block Bluetooth
blacklist bluetooth
blacklist btusb

# Block SD card readers
blacklist mmc_block

# Then rebuild initramfs
sudo update-initramfs -u

# Reboot for changes
sudo reboot
```

**Alternative: Just disable at udev level** (more flexible):

In `src/engines/usb-control-engine.js`, Sentinel creates:
```bash
/etc/udev/rules.d/99-sentinel-usb.rules
```

This intercepts USB connections before drivers load.

---

## Firewall Integration (iptables → nftables)

### Modern Approach: nftables

If Kali is using `nftables` instead of `iptables`:

```bash
# Check current firewall
sudo iptables -L      # Old style
sudo nft list ruleset # New style

# Sentinel can work with both via `iptables-legacy`:
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
```

### Firewall Rules Persistence

Make firewall rules survive reboot:

```bash
# Install iptables-persistent
sudo apt install -y iptables-persistent

# Save current rules
sudo iptables-save | sudo tee /etc/iptables/rules.v4
sudo ip6tables-save | sudo tee /etc/iptables/rules.v6

# Restore on boot (automatic)
sudo systemctl enable netfilter-persistent
```

---

## IDS/IPS Integration (Suricata)

### Installation & Configuration

```bash
# Install Suricata with PPA
sudo add-apt-repository ppa:oisf/suricata-stable
sudo apt update
sudo apt install -y suricata

# Update threat signatures
sudo suricata-update

# Enable eve-log output (JSON)
sudo nano /etc/suricata/suricata.yaml

# Find and ensure enabled:
# eve-log:
#   enabled: true
#   filename: eve.json
#   types:
#     - alert
#     - anomaly
```

### Start Suricata Service

```bash
# Test configuration
sudo suricata -c /etc/suricata/suricata.yaml -T

# Create systemd service
sudo nano /etc/systemd/system/suricata.service
```

**Content**:
```ini
[Unit]
Description=Suricata IDS/IPS Engine
After=network.target
Documentation=https://docs.suricata.io/

[Service]
Type=simple
ExecStart=/usr/bin/suricata -c /etc/suricata/suricata.yaml -i eth0
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Enable**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable suricata
sudo systemctl start suricata

# Monitor
sudo journalctl -u suricata -f
```

### Update Threat Signatures (Weekly)

```bash
# Manual update
sudo suricata-update -V

# Cron job for automatic updates
sudo crontab -e

# Add line:
# 0 3 * * 0 /usr/bin/suricata-update && systemctl reload suricata
```

---

## Network Interface Configuration

### Capture Traffic for Inspection

```bash
# List interfaces
ip link show

# Set capture interface (usually eth0 or wlan0)
# In electron-main.js or config:
CAPTURE_INTERFACE="eth0"

# Set promiscuous mode (for packet capture)
sudo ip link set eth0 promisc on

# Verify
ip link show eth0

# Disable promiscuous mode later
sudo ip link set eth0 promisc off
```

### Multi-Interface Monitoring

For bridged/bonded setups:

```bash
# Monitor specific VLAN
sudo tcpdump -i eth0.100 -w capture.pcap

# Sentinel config:
{
  "network": {
    "interfaces": ["eth0", "wlan0"],
    "vlans": [100, 200, 300]
  }
}
```

---

## Privilege Escalation Handling

### Run Sentinel with Required Privileges

**Option 1: Full root (simplest)**
```bash
sudo npm run electron-dev
sudo npm run electron
```

**Option 2: Limited privilege escalation (more secure)**

Create sudoers entry:
```bash
sudo nano /etc/sudoers.d/sentinel

# Add lines:
sentinel ALL=(ALL) NOPASSWD: /usr/sbin/iptables
sentinel ALL=(ALL) NOPASSWD: /usr/sbin/iptables-save
sentinel ALL=(ALL) NOPASSWD: /usr/bin/suricata*
sentinel ALL=(ALL) NOPASSWD: /usr/bin/nmap
sentinel ALL=(ALL) NOPASSWD: /usr/bin/nikto
sentinel ALL=(ALL) NOPASSWD: /usr/bin/lsusb
sentinel ALL=(ALL) NOPASSWD: /sbin/udevadm
sentinel ALL=(ALL) NOPASSWD: /bin/echo
```

**Option 3: Use PolicyKit (modern Gnome/KDE)**

Create policy kit file:
```bash
sudo nano /usr/share/polkit-1/actions/com.sentinel.security.policy

# Content:
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE policyconfig PUBLIC "-//freedesktop//DTD PolicyKit Policy Configuration 1.0//EN"
  "http://www.freedesktop.org/standards/PolicyKit/1/policyconfig.dtd">
<policyconfig>
  <action id="com.sentinel.security.firewall">
    <message>Sentinel Security Suite requires authentication to manage firewall</message>
    <defaults>
      <allow_any>no</allow_any>
      <allow_inactive>no</allow_inactive>
      <allow_active>auth_admin_keep</allow_active>
    </defaults>
  </action>
</policyconfig>
```

---

## System Services Integration

### Install as Kali Service

```bash
# Build the application
npm run electron-build

# Create installation script
sudo nano /usr/local/bin/install-sentinel.sh

#!/bin/bash
# Install Sentinel
INSTALL_DIR="/opt/sentinel"
sudo mkdir -p $INSTALL_DIR
sudo cp dist/sentinel*.AppImage $INSTALL_DIR/sentinel

# Create symlink
sudo ln -s $INSTALL_DIR/sentinel /usr/local/bin/sentinel

# Make executable
sudo chmod +x /usr/local/bin/sentinel
```

### Auto-start on Boot

```bash
# Create systemd service
sudo nano /etc/systemd/system/sentinel.service

[Unit]
Description=Sentinel Security Suite
After=network-online.target suricata.service
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/sentinel
Restart=always
RestartSec=5
Environment="DISPLAY=:0"
Environment="XAUTHORITY=/root/.Xauthority"

[Install]
WantedBy=graphical.target
```

**Enable**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sentinel
sudo systemctl start sentinel
```

---

## Performance Tuning for Kali

### CPU & Memory Optimization

```bash
# Check current resources
free -h
top -b -n 1 | head -20

# Sentinel optimizations in config:
{
  "performance": {
    "maxLogSize": 104857600,        // 100MB
    "logRotationDays": 30,
    "maxMemoryCacheEntries": 10000,
    "packetBufferSize": 65536,
    "threadPool": 4                  // CPU cores
  }
}
```

### Network Optimization

For high-speed networks (> 1Gbps):

```bash
# Increase network buffer sizes
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728

# Make permanent
sudo nano /etc/sysctl.conf
# Add:
net.core.rmem_max=134217728
net.core.wmem_max=134217728

# Apply
sudo sysctl -p
```

### Monitor Performance

```bash
# Real-time monitoring
watch -n 1 'ps aux | grep sentinel'

# Detailed network stats
nstat -a

# CPU/Memory by process
htop -p $(pgrep -f electron)
```

---

## Kali-Specific Security Hardening

### SELinux / AppArmor

On Kali with AppArmor:

```bash
# Create Sentinel profile
sudo nano /etc/apparmor.d/opt.sentinel.sentinel

#include <tunables/global>

profile sentinel /opt/sentinel/sentinel {
  #include <abstractions/base>
  #include <abstractions/nameservice>
  
  /opt/sentinel/** r,
  /proc/sys/net/ipv4/** r,
  /sys/bus/usb/devices/** rw,
  /proc/sys/kernel/perf_event_paranoid rw,
  
  capability net_admin,
  capability sys_admin,
  capability sys_module,
  capability sys_ptrace,
}
```

**Enable**:
```bash
sudo apparmor_parser -r /etc/apparmor.d/opt.sentinel.sentinel
```

### Mandatory Access Control

Check current MAC status:
```bash
# SELinux (RHEL-based)
getenforce

# AppArmor (Debian-based Kali)
aa-status
```

---

## Forensic Logging on Kali

### Auditd Integration

Send Sentinel logs to auditd:

```bash
# Install auditd
sudo apt install -y auditd

# Add audit rules
sudo auditctl -w /etc/sentinel-security/ -p wa -k sentinel_config
sudo auditctl -w ~/.sentinel-security/logs/ -p wa -k sentinel_logs

# Search audit logs
sudo ausearch -k sentinel_config

# Make permanent
sudo nano /etc/audit/rules.d/sentinel.rules
# Add:
-w /etc/sentinel-security/ -p wa -k sentinel_config
-w /home/*/.sentinel-security/logs/ -p wa -k sentinel_logs
```

### Centralized Logging

Send to ELK Stack or Splunk:

```bash
# Filebeat configuration
sudo nano /etc/filebeat/filebeat.yml

filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /home/*/.sentinel-security/logs/*.log

output.elasticsearch:
  hosts: ["elk.local:9200"]

# Start Filebeat
sudo systemctl enable filebeat
sudo systemctl start filebeat
```

---

## Testing & Validation

### Verify Kali Integration

```bash
# Check all engines
sudo sentinel --check

# Expected output:
# ✓ Firewall Engine: OK (10 rules loaded)
# ✓ USB Control: OK (4 devices monitored)
# ✓ IDS/IPS: OK (Suricata running)
# ✓ Network Scanner: OK (Nmap available)
# ✓ Web Scanner: OK (Nikto + ZAP available)
```

### Simulate Threats

```bash
# Test firewall blocking
sudo nmap -sn 192.168.1.0/24

# Test IDS detection
sudo nmap -sA -p 1-1000 localhost

# Test USB blocking
# Insert USB device → Should be blocked
# Check logs:
tail -f ~/.sentinel-security/logs/sentinel-security.log

# Test network scanning
sentinel-cli scan network 192.168.1.0/24
```

---

## Deployment Checklist

- [ ] Kali Linux fully updated
- [ ] All security tools installed
- [ ] Suricata rules updated
- [ ] Firewall rules persisted
- [ ] udev rules configured
- [ ] Privilege escalation handled
- [ ] Systemd service created
- [ ] AppArmor/SELinux profiles added
- [ ] Auditd logging configured
- [ ] Performance tested
- [ ] All engines verified operational
- [ ] 24-hour stability test passed

---

## Troubleshooting Kali-Specific Issues

### Suricata Issues
```bash
# Suricata not finding rules
sudo suricata-update -V
sudo systemctl restart suricata

# Check eve.json output
sudo tail -f /var/log/suricata/eve.json
```

### USB Control Not Working
```bash
# Check udev rules
sudo udevadm info -e | grep usb
sudo udevadm test /sys/devices/pci0000:00/0000:00:14.0/usb1/1-1

# Reload udev
sudo udevadm control --reload-rules
```

### Firewall Rules Not Applied
```bash
# Check iptables
sudo iptables -L -n -v

# Check nftables
sudo nft list ruleset

# Reload Sentinel rules
sudo systemctl restart sentinel
```

---

## Production Deployment on Kali

```bash
# 1. Build release
npm run electron-build

# 2. Install
sudo dpkg -i dist/sentinel*.deb

# 3. Verify
sudo sentinel --version
sudo sentinel --check

# 4. Start service
sudo systemctl enable sentinel
sudo systemctl start sentinel

# 5. Monitor
sudo journalctl -u sentinel -f
```

You're now ready to deploy Sentinel on Kali Linux! 🐉🛡️
