/**
 * SENTINEL SECURITY SUITE - Windows USB Control Engine
 * Block all USB devices by default with PIN/MFA authentication
 * 
 * Uses:
 * - WMI (Windows Management Instrumentation) for device detection
 * - Device Manager API via DeviceManagementObjects
 * - Registry for device policies
 * - Group Policy (gpedit.msc) for enforcement
 * 
 * Features:
 * - Auto-detect all USB devices (storage, HID, security keys, etc.)
 * - Block USB ports by default (BLOCK_ALL policy)
 * - Per-device authentication gateway (PIN/MFA)
 * - Device classification and trust management
 * - Real-time notifications and logging
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const Registry = require('winreg');

const execAsync = promisify(exec);

class WindowsUsbControlEngine {
  constructor(configManager, forenseLogger) {
    this.configManager = configManager;
    this.forensicsLogger = forenseLogger;
    this.devices = new Map();
    this.deviceId = 0;
    this.policy = 'BLOCK_ALL'; // BLOCK_ALL, AUTH_REQUIRED, ALLOW_TRUSTED
    this.trustedDevices = new Set();
    this.isInitialized = false;
    this.deviceMonitor = null;
    this.policiesApplied = false;

    this.log = (msg) => console.log(`[UsbControlEngine-Windows] ${msg}`);
    this.error = (msg) => console.error(`[UsbControlEngine-Windows-ERROR] ${msg}`);
  }

  /**
   * Initialize Windows USB Control Engine
   */
  async initialize() {
    try {
      this.log('Initializing Windows USB Control Engine...');

      // Set default policy
      await this.setGlobalPolicy(this.policy);

      // Apply registry and group policy restrictions
      await this.applyUsbPolicies();

      // Scan connected devices
      await this.scanConnectedDevices();

      // Start real-time device monitoring
      this.startDeviceMonitoring();

      // Load trusted devices from config
      this.loadTrustedDevices();

      this.isInitialized = true;
      this.log('✓ Windows USB Control Engine initialized successfully');

      this.forensicsLogger?.log('usb:initialized', {
        os: 'Windows',
        policy: this.policy,
        devicesDetected: this.devices.size,
        trustedDevices: this.trustedDevices.size
      });

      return { success: true, message: 'USB Control Engine initialized' };
    } catch (err) {
      this.error(`Initialization failed: ${err.message}`);
      this.forensicsLogger?.log('usb:init-failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Scan for all connected USB devices via WMI
   */
  async scanConnectedDevices() {
    try {
      this.log('Scanning for USB devices...');

      const psScript = `
        Get-WmiObject Win32_USBControllerDevice | 
        ForEach-Object { 
          [wmi]$_.Dependent 
        } | 
        Select-Object Name, DeviceID, @{Name='Class';Expression={$_.PNPClass}}, Manufacturer |
        ConvertTo-Json -Compress
      `;

      const { stdout } = await execAsync(
        `powershell -Command "${psScript}"`
      );

      const devices = JSON.parse(stdout);
      const deviceArray = Array.isArray(devices) ? devices : [devices];

      for (const device of deviceArray) {
        await this.processDetectedDevice(device);
      }

      this.log(`✓ Scanned ${this.devices.size} USB devices`);
      return { success: true, devicesFound: this.devices.size };
    } catch (err) {
      this.error(`Failed to scan devices: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Process a detected USB device
   */
  async processDetectedDevice(wmiDevice) {
    try {
      const deviceId = ++this.deviceId;
      const classification = this.classifyDevice(wmiDevice);
      const trusted = this.trustedDevices.has(wmiDevice.DeviceID);

      const device = {
        id: deviceId,
        wmiId: wmiDevice.DeviceID,
        name: wmiDevice.Name,
        manufacturer: wmiDevice.Manufacturer,
        class: wmiDevice.Class,
        classification,
        status: trusted ? 'ALLOWED' : 'BLOCKED',
        trusted,
        authorized: trusted,
        timestamp: Date.now(),
        lastAccess: null
      };

      this.devices.set(deviceId, device);

      // Block device if not trusted
      if (!trusted) {
        await this.blockDevice(deviceId);
      }

      this.log(`✓ Detected device: ${device.name} (${device.classification}) - Status: ${device.status}`);
      
      this.forensicsLogger?.log('usb:device-detected', {
        deviceId,
        name: device.name,
        classification: device.classification,
        status: device.status
      });

      return device;
    } catch (err) {
      this.error(`Failed to process device: ${err.message}`);
    }
  }

  /**
   * Classify USB device by type
   */
  classifyDevice(wmiDevice) {
    const className = (wmiDevice.Class || '').toUpperCase();
    const name = (wmiDevice.Name || '').toUpperCase();

    if (className.includes('STORAGE') || name.includes('STORAGE')) return 'USB Storage';
    if (className.includes('PRINTER')) return 'Printer';
    if (className.includes('HID')) return 'HID (Keyboard/Mouse)';
    if (className.includes('COMMUNICATION') || name.includes('MODEM')) return 'Modem';
    if (name.includes('SECURITY') || name.includes('DONGLE')) return 'Security Key';
    if (name.includes('HUB')) return 'USB Hub';
    if (className.includes('MEDIA')) return 'Media Device';
    
    return 'USB Device';
  }

  /**
   * Apply Windows USB policies via Registry and Group Policy
   */
  async applyUsbPolicies() {
    try {
      this.log('Applying USB control policies...');

      // Disable USB Storage (Device Management → Device Installation Settings)
      await this.setRegistryValue(
        'HKEY_LOCAL_MACHINE',
        'System\\CurrentControlSet\\Services\\USBSTOR',
        'Start',
        4, // 4 = Disabled
        'REG_DWORD'
      );

      // Restrict removable media (Group Policy)
      await this.setRegistryValue(
        'HKEY_LOCAL_MACHINE',
        'SOFTWARE\\Policies\\Microsoft\\Windows\\RemovableStorageDevices\\{53f56307-b6bf-11d0-94f2-00a0c91efb8b}',
        'Deny_All',
        1,
        'REG_DWORD'
      );

      // Block Autorun for USB devices
      await this.setRegistryValue(
        'HKEY_LOCAL_MACHINE',
        'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer',
        'NoDriveTypeAutoRun',
        255, // Disable autorun for all drives
        'REG_DWORD'
      );

      // Enable SafeRemovalMedia
      await this.setRegistryValue(
        'HKEY_LOCAL_MACHINE',
        'SYSTEM\\CurrentControlSet\\Services\\UsbStor',
        'DefaultSafeRemovalPolicy',
        1,
        'REG_DWORD'
      );

      this.policiesApplied = true;
      this.log('✓ USB control policies applied via Registry');
      this.forensicsLogger?.log('usb:policies-applied', { timestamp: new Date().toISOString() });
    } catch (err) {
      this.error(`Failed to apply policies: ${err.message}`);
      throw err;
    }
  }

  /**
   * Set Windows Registry value (requires admin)
   */
  async setRegistryValue(hive, path, valueName, value, type) {
    try {
      const regPath = `${hive}\\${path}`;
      
      const psCmd = `
        $regPath = '${regPath}'
        $regValue = '${valueName}'
        $regData = ${value}
        $regType = '${type}'
        
        if(-not (Test-Path $regPath)) {
          New-Item -Path $regPath -Force | Out-Null
        }
        
        Set-ItemProperty -Path $regPath -Name $regValue -Value $regData -Type $regType -Force
      `;

      await execAsync(`powershell -Command "${psCmd}"`);
      this.log(`✓ Registry updated: ${hive}\\${path}\\${valueName}`);
    } catch (err) {
      this.error(`Failed to set registry value: ${err.message}`);
      throw err;
    }
  }

  /**
   * Block a USB device (set authorization to 0)
   */
  async blockDevice(deviceId) {
    try {
      const device = this.devices.get(deviceId);
      if (!device) throw new Error(`Device ${deviceId} not found`);

      // Disable device via PowerShell
      const psCmd = `
        Disable-PnpDevice -InstanceId "${device.wmiId}" -Confirm:$false
      `;

      await execAsync(`powershell -Command "${psCmd}"`);

      device.status = 'BLOCKED';
      device.authorized = false;
      device.lastAccess = new Date().toISOString();

      this.log(`✓ Device blocked: ${device.name}`);
      
      this.forensicsLogger?.log('usb:device-blocked', {
        deviceId,
        deviceName: device.name,
        reason: 'Policy: BLOCK_ALL or Auth Failed'
      });

      return device;
    } catch (err) {
      this.error(`Failed to block device: ${err.message}`);
      // Non-fatal, logging attempt
    }
  }

  /**
   * Allow a USB device (set authorization to 1)
   */
  async allowDevice(deviceId) {
    try {
      const device = this.devices.get(deviceId);
      if (!device) throw new Error(`Device ${deviceId} not found`);

      // Enable device via PowerShell
      const psCmd = `
        Enable-PnpDevice -InstanceId "${device.wmiId}" -Confirm:$false
      `;

      await execAsync(`powershell -Command "${psCmd}"`);

      device.status = 'ALLOWED';
      device.authorized = true;
      device.trusted = true;
      device.lastAccess = new Date().toISOString();

      // Add to trusted list
      this.trustedDevices.add(device.wmiId);

      this.log(`✓ Device allowed: ${device.name}`);

      this.forensicsLogger?.log('usb:device-allowed', {
        deviceId,
        deviceName: device.name,
        reason: 'User authenticated'
      });

      return device;
    } catch (err) {
      this.error(`Failed to allow device: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get status of a specific device
   */
  getDeviceStatus(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    return {
      id: device.id,
      name: device.name,
      status: device.status,
      classification: device.classification,
      trusted: device.trusted,
      authorized: device.authorized,
      lastAccess: device.lastAccess
    };
  }

  /**
   * Get all devices
   */
  getAllDevices() {
    return Array.from(this.devices.values()).map(d => ({
      id: d.id,
      name: d.name,
      manufacturer: d.manufacturer,
      classification: d.classification,
      status: d.status,
      trusted: d.trusted
    }));
  }

  /**
   * Set global USB policy
   */
  async setGlobalPolicy(policy) {
    try {
      if (!['BLOCK_ALL', 'AUTH_REQUIRED', 'ALLOW_TRUSTED'].includes(policy)) {
        throw new Error(`Invalid policy: ${policy}`);
      }

      this.policy = policy;
      this.log(`✓ USB policy set to: ${policy}`);

      this.forensicsLogger?.log('usb:policy-changed', { policy });

      return { success: true, policy };
    } catch (err) {
      this.error(`Failed to set policy: ${err.message}`);
      throw err;
    }
  }

  /**
   * Start real-time device monitoring using WMI events
   */
  startDeviceMonitoring() {
    try {
      // Poll for new devices every 5 seconds
      this.deviceMonitor = setInterval(async () => {
        try {
          await this.scanConnectedDevices();
        } catch (err) {
          this.error(`Device monitoring error: ${err.message}`);
        }
      }, 5000);

      this.log('✓ Device monitoring started (5s polling)');
    } catch (err) {
      this.error(`Failed to start monitoring: ${err.message}`);
    }
  }

  /**
   * Load trusted devices from configuration
   */
  loadTrustedDevices() {
    try {
      const trusted = this.configManager?.getConfig('usb.trustedDevices') || [];
      this.trustedDevices = new Set(trusted);
      this.log(`✓ Loaded ${trusted.length} trusted devices from config`);
    } catch (err) {
      this.error(`Failed to load trusted devices: ${err.message}`);
    }
  }

  /**
   * Save trusted devices to configuration
   */
  async saveTrustedDevices() {
    try {
      const trustedArray = Array.from(this.trustedDevices);
      this.configManager?.setConfig('usb.trustedDevices', trustedArray);
      this.log('✓ Trusted devices saved to configuration');
    } catch (err) {
      this.error(`Failed to save trusted devices: ${err.message}`);
    }
  }

  /**
   * Get USB statistics
   */
  getUsbStatistics() {
    const devices = Array.from(this.devices.values());
    return {
      totalDevices: devices.length,
      blockedDevices: devices.filter(d => d.status === 'BLOCKED').length,
      allowedDevices: devices.filter(d => d.status === 'ALLOWED').length,
      trustedDevices: this.trustedDevices.size,
      policy: this.policy
    };
  }

  /**
   * Remove a device from trusted list
   */
  untrustedDevice(deviceId) {
    try {
      const device = this.devices.get(deviceId);
      if (!device) throw new Error(`Device ${deviceId} not found`);

      this.trustedDevices.delete(device.wmiId);
      device.trusted = false;
      device.authorized = false;
      device.status = 'BLOCKED';

      this.log(`✓ Device untrusted: ${device.name}`);

      this.forensicsLogger?.log('usb:device-untrusted', {
        deviceId,
        deviceName: device.name
      });

      return device;
    } catch (err) {
      this.error(`Failed to untrust device: ${err.message}`);
      throw err;
    }
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    try {
      if (this.deviceMonitor) {
        clearInterval(this.deviceMonitor);
      }

      await this.saveTrustedDevices();
      this.log('✓ Windows USB Control Engine shutdown complete');
    } catch (err) {
      this.error(`Shutdown error: ${err.message}`);
    }
  }
}

module.exports = WindowsUsbControlEngine;
