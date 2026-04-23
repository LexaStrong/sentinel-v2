# SENTINEL SECURITY SUITE - Windows Deployment Guide

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10 Pro/Enterprise, Windows 11, Windows Server 2019/2022
- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 500MB for application + 2GB for logs
- **CPU**: Intel/AMD x64 processor
- **Admin Privileges**: Required for firewall and USB control

### Recommended Requirements
- **OS**: Windows 11 Pro/Enterprise or Windows Server 2022
- **RAM**: 16GB
- **Disk Space**: 1GB for application + 10GB for logs
- **Network**: 1Gbps for optimal threat detection
- **Security Software**: Windows Defender enabled (built-in)

---

## 🔧 Installation Steps

### Step 1: Install Node.js and Dependencies

```bash
# Download Node.js v16+ LTS from https://nodejs.org/
# Install globally (add to PATH)

# Verify installation
node --version  # Should show v16.0.0 or higher
npm --version   # Should show 7.0.0 or higher
```

### Step 2: Install Sentinel Security Suite

```bash
# Clone or download the repository
cd "C:\Program Files\Sentinel Security Suite"

# Install dependencies
npm install

# Verify Electron installation
npx electron --version
```

### Step 3: Configure Administrator Access

```powershell
# Run PowerShell as Administrator
# Add current user to local Administrators group (if not already)
Add-LocalGroupMember -Group "Administrators" -Member "$env:USERNAME"

# Restart for group membership to take effect
shutdown /r /t 30
```

### Step 4: Install Optional Security Tools

For full feature support, install these optional tools:

```powershell
# Install Snort for advanced IDS/IPS (optional)
# Download from: https://www.snort.org/downloads

# Install Nmap for network scanning (optional)
# Download from: https://nmap.org/download.html

# Verify installations
snort --version
nmap --version
```

---

## 🚀 Running the Application

### Development Mode

```bash
# Terminal 1: Start React development server
npm start

# Terminal 2: Run Electron app (in separate terminal)
npm run electron-dev
```

### Production Build

```bash
# Build React application
npm run build

# Build Electron app as standalone executable
npm run electron-build

# Output locations:
# - dist/Sentinel-Security-Suite-2.0.0.exe     (Portable EXE)
# - dist/Sentinel-Security-Suite-2.0.0.msi     (Installer)
# - dist/Sentinel-Security-Suite-2.0.0.zip     (Portable ZIP)
```

### Run as Service (Windows Server)

```powershell
# Create Windows Service using NSSM (Non-Sucking Service Manager)
# Download from: https://nssm.cc/download

nssm install SentinelSecuritySuite "C:\Program Files\Sentinel Security Suite\Sentinel-Security-Suite.exe"
nssm set SentinelSecuritySuite AppDirectory "C:\Program Files\Sentinel Security Suite"

# Start service
nssm start SentinelSecuritySuite

# Check service status
Get-Service SentinelSecuritySuite | Format-List *
```

---

## 🔐 Initial Configuration

### First Launch

1. **Authentication**
   - Default PIN: `1234` (change immediately!)
   - Change PIN: Settings → Account → Change PIN
   - Enable MFA: Settings → Account → Enable MFA

2. **Firewall Setup**
   - Policy: Default-deny (all traffic blocked by default)
   - Whitelist: Add allowed applications and services
   - Test: Try accessing a website to verify allowlist

3. **USB Control**
   - Policy: BLOCK_ALL (default)
   - Authentication: User must enter PIN to use USB devices
   - Whitelist: Add trusted USB devices (security keys, printers, etc.)

4. **IDS/IPS**
   - Windows Defender: Enabled and updated
   - Threat Signatures: Updated automatically
   - Auto-Block: Critical threats automatically blocked

### Change Default PIN

```bash
# At application startup, Settings → Account → Change PIN
# Enter current PIN: 1234
# Enter new PIN: (your secure PIN, min 4 digits)
# Confirm new PIN
```

### Enable Multi-Factor Authentication (MFA)

```bash
# Settings → Account → Enable MFA
# Copy the secret code (QR code or text)
# Add to authenticator app (Google Authenticator, Authy, etc.)
# Enter MFA token to complete setup
```

---

## 🛡️ Security Features by Module

### Windows Firewall Engine

**Features**:
- Stateful Packet Inspection (SPI)
- Deep Packet Inspection (DPI)
- Default-deny inbound/outbound policy
- Application-layer filtering
- Real-time rule management

**CLI Commands** (PowerShell):
```powershell
# View all firewall rules
netsh advfirewall firewall show rule name=all

# Add a rule (allow outbound HTTPS)
netsh advfirewall firewall add rule name="Allow-HTTPS" `
  dir=out action=allow protocol=tcp remoteport=443

# Delete a rule
netsh advfirewall firewall delete rule name="Allow-HTTPS"

# Reset firewall to defaults
netsh advfirewall reset
```

### Windows USB Control Engine

**Features**:
- Auto-detect all USB devices
- Block by default (BLOCK_ALL policy)
- Per-device PIN authentication
- Trusted device management
- Device classification (storage, HID, security key, etc.)

**CLI Commands** (PowerShell):
```powershell
# List all USB devices
Get-WmiObject Win32_USBControllerDevice | ForEach-Object { [wmi]$_.Dependent }

# Disable USB device
Disable-PnpDevice -InstanceId "USB\VID_1234&PID_5678\SERIAL" -Confirm:$false

# Enable USB device
Enable-PnpDevice -InstanceId "USB\VID_1234&PID_5678\SERIAL" -Confirm:$false

# View USB device registry
Get-ItemProperty HKLM:\System\CurrentControlSet\Services\USBSTOR
```

### Windows IDS/IPS Engine

**Features**:
- Windows Defender integration (real-time protection)
- Event Log monitoring (Security events)
- Snort IDS support (optional, advanced)
- Automatic threat response (IP blocking)
- Signature updates

**CLI Commands** (PowerShell):
```powershell
# Check Windows Defender status
Get-MpPreference | Select-Object DisableRealtimeMonitoring, AntivirusEnabled

# Update Defender signatures
Update-MpSignature

# Full scan with Windows Defender
Start-MpScan -ScanType FullScan

# View Event Log security events
Get-EventLog -LogName Security -Newest 100

# Export Event Log
wevtutil epl "Sentinel Security" "C:\sentinel-logs.evtx"
```

---

## 📊 Dashboard Usage

### Overview Tab
- System health summary
- Active threats count
- Firewall rule statistics
- USB device status

### Firewall Tab
- View/add/edit/delete rules
- Enable/disable rules
- Import/export rules
- View traffic statistics

### Device Control Tab
- List all USB devices
- Allow/block individual devices
- Set global policy (BLOCK_ALL, AUTH_REQUIRED, ALLOW_TRUSTED)
- Manage trusted devices

### Threats Tab
- Real-time threat feed
- Critical threats highlighted
- Auto-blocked IPs
- Threat source information

### Logs Tab
- Event log search and filter
- Export logs (JSON, CSV, EVTX)
- View log statistics
- Date range filtering

---

## 🔍 Troubleshooting

### Firewall Rules Not Applied

**Problem**: Added rule but traffic still blocked/allowed

**Solution**:
```powershell
# Verify rule exists
netsh advfirewall firewall show rule name="your-rule-name"

# Check firewall is enabled
netsh advfirewall show allprofiles

# Restart Windows Firewall service
Restart-Service -Name mpssvc -Force
```

### USB Devices Not Detected

**Problem**: USB devices don't appear in device list

**Solution**:
```powershell
# Rescan USB devices
[Runtime.InteropServices.Marshal]::ReleaseComObject((New-Object -ComObject Shell.Application).NameSpace(0x11))

# Check USB registry
Get-ChildItem HKLM:\SYSTEM\CurrentControlSet\Enum\USB

# Re-enumerate USB hub
Disable-PnpDevice -InstanceId "USB\ROOT_HUB*" -Confirm:$false
Start-Sleep -Seconds 2
Enable-PnpDevice -InstanceId "USB\ROOT_HUB*" -Confirm:$false
```

### Windows Defender Not Scanning

**Problem**: File scan doesn't complete or hangs

**Solution**:
```powershell
# Check Defender status
Get-MpComputerStatus

# Disable real-time monitoring temporarily
Set-MpPreference -DisableRealtimeMonitoring $true

# Run quick scan
Start-MpScan -ScanType QuickScan

# Re-enable monitoring
Set-MpPreference -DisableRealtimeMonitoring $false
```

### Event Log Errors

**Problem**: Sentinel logs not appearing in Windows Event Log

**Solution**:
```powershell
# Create Event Log source
$logName = "Sentinel Security"
$source = "Sentinel"

if (-not [System.Diagnostics.EventLog]::SourceExists($source)) {
  New-EventLog -LogName $logName -Source $source
}

# View Sentinel events
Get-EventLog -LogName "Sentinel Security" -Newest 50

# Export to file
wevtutil epl "Sentinel Security" "C:\sentinel-export.evtx"
```

### Permission Denied Errors

**Problem**: "Access Denied" when applying firewall rules or blocking USB

**Solution**:
1. Verify running with Administrator privileges:
   ```powershell
   # Check if admin
   [bool]([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups | `
   Where-Object { $_.Value.EndsWith('-512') })
   ```

2. Right-click application → "Run as administrator"

3. Or configure to run as admin permanently:
   ```powershell
   # Create scheduled task to run as admin
   $Action = New-ScheduledTaskAction -Execute "C:\Program Files\Sentinel\Sentinel.exe"
   Register-ScheduledTask -Action $Action -TaskName "SentinelSecuritySuite" -RunLevel Highest
   ```

---

## 📦 Uninstallation

### Remove Application

```bash
# Option 1: MSI Installer
# Control Panel → Programs → Programs and Features → Uninstall

# Option 2: Portable EXE
# Delete folder: C:\Program Files\Sentinel Security Suite

# Option 3: Command line
wmic product where name="Sentinel Security Suite" call uninstall
```

### Remove Firewall Rules

```powershell
# Delete all Sentinel firewall rules
netsh advfirewall firewall delete rule name="Sentinel*" dir=in
netsh advfirewall firewall delete rule name="Sentinel*" dir=out
```

### Remove Event Log

```powershell
# Remove Sentinel event log
Remove-EventLog -LogName "Sentinel Security" -Confirm:$false
```

### Clean Data

```bash
# Remove configuration and logs
Remove-Item -Path "$env:USERPROFILE\.sentinel-security" -Recurse -Force
```

---

## 🚀 Advanced Configuration

### Custom Firewall Rules from Script

```powershell
# script-add-rules.ps1
$rules = @(
  @{
    Name = "Allow-RDP"
    Dir = "in"
    Protocol = "tcp"
    RemotePort = 3389
    Action = "allow"
  },
  @{
    Name = "Block-Telnet"
    Dir = "in"
    Protocol = "tcp"
    RemotePort = 23
    Action = "block"
  }
)

foreach ($rule in $rules) {
  netsh advfirewall firewall add rule `
    name="$($rule.Name)" `
    dir=$($rule.Dir) `
    action=$($rule.Action) `
    protocol=$($rule.Protocol) `
    remoteport=$($rule.RemotePort)
  
  Write-Host "Added rule: $($rule.Name)"
}
```

### Automated Threat Response

```powershell
# Monitor and auto-block IPs
$ips = @("192.168.1.100", "10.0.0.50")

foreach ($ip in $ips) {
  netsh advfirewall firewall add rule `
    name="Block-$ip" `
    dir=in `
    action=block `
    remoteip=$ip
  
  Write-EventLog -LogName "Sentinel Security" `
    -Source "Sentinel" `
    -EventId 3001 `
    -EntryType Warning `
    -Message "Blocked IP: $ip"
}
```

### Compliance Logging

```powershell
# Export logs for compliance audits
$exportPath = "C:\Logs\Sentinel-Audit-$(Get-Date -Format 'yyyy-MM-dd').csv"

Get-EventLog -LogName "Sentinel Security" | 
  Select-Object TimeGenerated, EntryType, Message |
  Export-Csv -Path $exportPath -NoTypeInformation

Write-Host "Logs exported to: $exportPath"
```

---

## 📞 Support & Updates

### Check for Updates

```bash
npm outdated  # Check for package updates
npm update    # Update to latest compatible versions
```

### Report Issues

1. Check logs: `Settings → Logs → Export`
2. Check event log: `Event Viewer → Sentinel Security`
3. Report to: support@sentinel-security.com

### Security Updates

- Windows Defender: Automatic (Windows Update)
- Sentinel Rules: Check `Settings → Security → Update Signatures`
- Application: Check `Help → Check for Updates`

---

## ✅ Verification Checklist

After installation, verify:

- [ ] Application starts without errors
- [ ] Firewall is enabled (netsh advfirewall show allprofiles)
- [ ] USB control active (can detect USB devices)
- [ ] Windows Defender running and updated
- [ ] Event Log source created ("Sentinel Security")
- [ ] Logs directory exists (`%USERPROFILE%\.sentinel-security\logs`)
- [ ] Firewall rules applied (netsh advfirewall firewall show rule name=all)
- [ ] Dashboard loads and shows data
- [ ] Can authenticate with PIN
- [ ] Network connectivity working (DNS, DHCP)

---

This guide covers production deployment on any Windows version. For Kali Linux deployment, see [KALI-INTEGRATION.md](KALI-INTEGRATION.md).
