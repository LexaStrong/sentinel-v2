/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SENTINEL SECURITY SUITE | ELECTRON MAIN PROCESS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Responsibilities:
 * - Window management & IPC bridge
 * - OS-level security engine initialization
 * - USB device control via udev
 * - Firewall rule injection (iptables/netfilter)
 * - IDS/IPS engine spawning (Suricata)
 * - Network scanning orchestration (Nmap)
 * - Privilege escalation handling (sudo/pkexec)
 * - Encrypted configuration storage
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { app, BrowserWindow, ipcMain, Menu, security } = require('electron');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

// Security engines
const FirewallEngine = require('./src/engines/firewall-engine');
const UsbControlEngine = require('./src/engines/usb-control-engine');
const IdsIpsEngine = require('./src/engines/ids-ips-engine');
const NetworkScannerEngine = require('./src/engines/network-scanner-engine');
const WebAppScannerEngine = require('./src/engines/webapp-scanner-engine');
const AuthenticationService = require('./src/services/authentication-service');
const ConfigurationManager = require('./src/services/configuration-manager');
const ForensicsLogger = require('./src/services/forensics-logger');

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE & ENGINES
// ─────────────────────────────────────────────────────────────────────────────

let mainWindow;
let firewallEngine;
let usbEngine;
let idsIpsEngine;
let networkScanner;
let webAppScanner;
let authService;
let configManager;
let forensicsLogger;

const CONFIG_DIR = path.join(os.homedir(), '.sentinel-security');
const LOG_DIR = path.join(CONFIG_DIR, 'logs');
const RULES_DIR = path.join(CONFIG_DIR, 'rules');

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW CREATION
// ─────────────────────────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1200,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      sandbox: true,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      // Sandbox prevents direct access to Node APIs
    },
    icon: path.join(__dirname, 'assets/sentinel-icon.png'),
  });

  // Load the app
  const startUrl = process.env.ELECTRON_START_URL || `file://${path.join(__dirname, 'build/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Dev tools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

app.on('ready', async () => {
  // Ensure config directories exist
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  if (!fs.existsSync(RULES_DIR)) fs.mkdirSync(RULES_DIR, { recursive: true });

  // Initialize services
  try {
    configManager = new ConfigurationManager(CONFIG_DIR);
    forensicsLogger = new ForensicsLogger(LOG_DIR);
    authService = new AuthenticationService(configManager);

    // Initialize security engines with privilege escalation check
    if (process.getuid?.() !== 0) {
      console.warn('⚠️  Not running as root. Some features require elevation.');
    }

    firewallEngine = new FirewallEngine(configManager, forensicsLogger);
    usbEngine = new UsbControlEngine(configManager, forensicsLogger);
    idsIpsEngine = new IdsIpsEngine(configManager, forensicsLogger);
    networkScanner = new NetworkScannerEngine(configManager, forensicsLogger);
    webAppScanner = new WebAppScannerEngine(configManager, forensicsLogger);

    console.log('✓ Security engines initialized');

    // Start security engines
    await firewallEngine.initialize();
    await usbEngine.initialize();
    await idsIpsEngine.initialize();

    console.log('✓ Security engines running');
  } catch (error) {
    console.error('❌ Engine initialization failed:', error);
  }

  createWindow();
  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────

function createMenu() {
  const template = [
    {
      label: 'Sentinel',
      submenu: [
        { label: 'About Sentinel', role: 'about' },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'DevTools', accelerator: 'CmdOrCtrl+Shift+I', click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - FIREWALL
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('firewall:get-rules', async () => {
  return firewallEngine.getRules();
});

ipcMain.handle('firewall:add-rule', async (event, rule) => {
  const result = await firewallEngine.addRule(rule);
  forensicsLogger.log('FIREWALL_RULE_ADDED', rule);
  mainWindow?.webContents.send('firewall:rule-added', result);
  return result;
});

ipcMain.handle('firewall:delete-rule', async (event, ruleId) => {
  await firewallEngine.deleteRule(ruleId);
  forensicsLogger.log('FIREWALL_RULE_DELETED', { ruleId });
  mainWindow?.webContents.send('firewall:rule-deleted', ruleId);
});

ipcMain.handle('firewall:toggle-rule', async (event, ruleId) => {
  const result = await firewallEngine.toggleRule(ruleId);
  forensicsLogger.log('FIREWALL_RULE_TOGGLED', { ruleId });
  return result;
});

ipcMain.handle('firewall:get-statistics', async () => {
  return firewallEngine.getStatistics();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - USB DEVICE CONTROL
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('usb:get-devices', async () => {
  return usbEngine.getConnectedDevices();
});

ipcMain.handle('usb:authenticate-device', async (event, deviceId, pin) => {
  const isValid = await authService.validatePin(pin);
  if (isValid) {
    await usbEngine.allowDevice(deviceId);
    forensicsLogger.log('USB_DEVICE_AUTHENTICATED', { deviceId });
    mainWindow?.webContents.send('usb:device-allowed', deviceId);
    return { success: true };
  }
  forensicsLogger.log('USB_AUTH_FAILED', { deviceId });
  return { success: false, error: 'Invalid PIN' };
});

ipcMain.handle('usb:block-device', async (event, deviceId) => {
  await usbEngine.blockDevice(deviceId);
  forensicsLogger.log('USB_DEVICE_BLOCKED', { deviceId });
  mainWindow?.webContents.send('usb:device-blocked', deviceId);
});

ipcMain.handle('usb:trust-device', async (event, deviceId) => {
  await usbEngine.trustDevice(deviceId);
  forensicsLogger.log('USB_DEVICE_TRUSTED', { deviceId });
  mainWindow?.webContents.send('usb:device-trusted', deviceId);
});

ipcMain.handle('usb:set-global-policy', async (event, policy) => {
  await usbEngine.setGlobalPolicy(policy);
  forensicsLogger.log('USB_POLICY_CHANGED', { policy });
  mainWindow?.webContents.send('usb:policy-changed', policy);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - IDS/IPS
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('idsips:get-events', async (event, limit = 100) => {
  return idsIpsEngine.getRecentEvents(limit);
});

ipcMain.handle('idsips:get-threats', async () => {
  return idsIpsEngine.getActivethreats();
});

ipcMain.handle('idsips:get-statistics', async () => {
  return idsIpsEngine.getStatistics();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - NETWORK SCANNER
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('netscan:start-scan', async (event, targets) => {
  try {
    const scanId = await networkScanner.startScan(targets);
    mainWindow?.webContents.send('netscan:scan-started', { scanId, targets });
    return { scanId };
  } catch (error) {
    console.error('Scan error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('netscan:get-results', async (event, scanId) => {
  return networkScanner.getScanResults(scanId);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - WEB/APP SCANNER
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('webscan:scan-target', async (event, url) => {
  try {
    const scanId = await webAppScanner.startScan(url);
    mainWindow?.webContents.send('webscan:scan-started', { scanId, url });
    return { scanId };
  } catch (error) {
    return { error: error.message };
  }
});

ipcMain.handle('webscan:get-results', async (event, scanId) => {
  return webAppScanner.getScanResults(scanId);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - LOGGING & FORENSICS
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('logs:get-entries', async (event, filter = {}) => {
  return forensicsLogger.getEntries(filter);
});

ipcMain.handle('logs:export', async (event, format = 'json') => {
  return forensicsLogger.exportLogs(format);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - AUTHENTICATION
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('auth:validate-pin', async (event, pin) => {
  return authService.validatePin(pin);
});

ipcMain.handle('auth:validate-mfa', async (event, token) => {
  return authService.validateMFA(token);
});

ipcMain.handle('auth:get-user-role', async () => {
  return authService.getCurrentUserRole();
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC HANDLERS - OVERVIEW/DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

ipcMain.handle('dashboard:get-status', async () => {
  return {
    firewall: firewallEngine.getStatus(),
    usb: usbEngine.getStatus(),
    idsips: idsIpsEngine.getStatus(),
    networkHealth: networkScanner.getNetworkHealth(),
    systemHealth: getSystemHealth(),
  };
});

function getSystemHealth() {
  try {
    const os_module = require('os');
    return {
      uptime: os_module.uptime(),
      cpuUsage: os_module.loadavg(),
      memoryUsage: {
        total: os_module.totalmem(),
        free: os_module.freemem(),
      },
    };
  } catch (error) {
    return {};
  }
}

module.exports = { mainWindow, firewallEngine, usbEngine, idsIpsEngine };
