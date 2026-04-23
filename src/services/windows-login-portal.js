/**
 * SENTINEL SECURITY SUITE - Windows Login Portal
 * Secure authentication portal that runs immediately after Windows login
 * 
 * Features:
 * - Interactive MFA prompt at Windows logon
 * - PIN validation + TOTP authentication
 * - Password recovery with backdoor passcode
 * - Process-level access control (blocks all until authenticated)
 * - First-run setup wizard
 */

const { app, BrowserWindow, Menu, ipcMain, dialog, session } = require('electron');
const { exec } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const path = require('path');
const os = require('os');
const fs = require('fs');

const execAsync = promisify(exec);

class WindowsLoginPortal {
  constructor(configManager, authService, forensicsLogger) {
    this.configManager = configManager;
    this.authService = authService;
    this.forensicsLogger = forensicsLogger;
    
    this.loginWindow = null;
    this.isAuthenticated = false;
    this.authenticationAttempts = 0;
    this.maxAttempts = 3;
    this.lockoutTime = 300000; // 5 minutes
    this.isLockedOut = false;
    this.recoveryPasscode = '4884275725808017'; // Hardcoded backdoor
    this.alternateRecoveryPasscode = '!@mL3x@str0ng';
    this.blockAllProcesses = true;
    this.allowedProcesses = ['cmd.exe', 'powershell.exe', 'conhost.exe', 'terminal.exe'];

    this.log = (msg) => console.log(`[LoginPortal-Windows] ${msg}`);
    this.error = (msg) => console.error(`[LoginPortal-Windows-ERROR] ${msg}`);
  }

  /**
   * Initialize Windows Login Portal
   */
  async initialize() {
    try {
      this.log('Initializing Windows Login Portal...');

      // Check if first-run setup is needed
      const firstRun = !this.configManager?.getConfig('portal.initialized');
      
      if (firstRun) {
        this.log('First-run detected - showing setup wizard');
        return { firstRun: true, action: 'setup' };
      }

      // Check if already authenticated this session
      if (this.isAuthenticated) {
        this.log('✓ Already authenticated this session');
        return { authenticated: true };
      }

      // Show login portal
      this.createLoginWindow();

      return { initialized: true };
    } catch (err) {
      this.error(`Initialization failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create login portal window (overlay on Windows login screen area)
   */
  createLoginWindow() {
    try {
      // Get primary display
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.bounds;

      this.loginWindow = new BrowserWindow({
        width: 500,
        height: 650,
        x: Math.floor((width - 500) / 2),
        y: Math.floor((height - 650) / 2),
        alwaysOnTop: true,
        frame: false,
        transparent: false,
        resizable: false,
        movable: false,
        modal: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableRemoteModule: false,
          sandbox: true,
          preload: path.join(__dirname, 'portal-preload.js')
        }
      });

      // Load login portal UI
      const portalHTML = this.generateLoginPortalHTML();
      this.loginWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(portalHTML)}`);

      // Handle close attempt (prevent escape)
      this.loginWindow.on('close', (e) => {
        e.preventDefault();
        this.log('⚠️ User attempted to close login portal - blocked');
        dialog.showErrorBox('Access Denied', 'You must authenticate to continue');
      });

      this.log('✓ Login portal created and displayed');
      return this.loginWindow;
    } catch (err) {
      this.error(`Failed to create login window: ${err.message}`);
      throw err;
    }
  }

  /**
   * Generate login portal HTML (embedded UI)
   */
  generateLoginPortalHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Sentinel Security - Authentication Required</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
          }
          
          .portal-container {
            background: rgba(22, 33, 62, 0.95);
            border: 2px solid #00d4ff;
            border-radius: 15px;
            padding: 40px;
            width: 100%;
            max-width: 450px;
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
            backdrop-filter: blur(10px);
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .logo {
            font-size: 48px;
            margin-bottom: 15px;
          }
          
          .title {
            font-size: 24px;
            color: #00d4ff;
            margin-bottom: 10px;
            font-weight: 600;
          }
          
          .subtitle {
            color: #888;
            font-size: 12px;
          }
          
          .status {
            background: rgba(0, 212, 255, 0.1);
            border-left: 3px solid #00d4ff;
            padding: 10px 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            color: #00d4ff;
            font-size: 12px;
          }
          
          .form-group {
            margin-bottom: 20px;
          }
          
          label {
            display: block;
            color: #00d4ff;
            font-size: 12px;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          input {
            width: 100%;
            padding: 12px;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid #00d4ff;
            color: #fff;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s;
          }
          
          input:focus {
            outline: none;
            background: rgba(0, 212, 255, 0.2);
            box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
          }
          
          input::placeholder {
            color: #666;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 25px;
          }
          
          button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 5px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s;
          }
          
          .btn-primary {
            background: #00d4ff;
            color: #1a1a2e;
          }
          
          .btn-primary:hover {
            background: #00b8d4;
            box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
          }
          
          .btn-recovery {
            background: transparent;
            color: #00d4ff;
            border: 1px solid #00d4ff;
          }
          
          .btn-recovery:hover {
            background: rgba(0, 212, 255, 0.1);
          }
          
          .error-message {
            color: #ff4444;
            font-size: 12px;
            margin-top: 10px;
            text-align: center;
            display: none;
          }
          
          .error-message.show {
            display: block;
          }
          
          .warning {
            background: rgba(255, 68, 68, 0.1);
            border-left: 3px solid #ff4444;
            padding: 10px 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            color: #ff4444;
            font-size: 11px;
            display: none;
          }
          
          .warning.show {
            display: block;
          }
          
          .lockout-message {
            text-align: center;
            color: #ff4444;
            margin-top: 20px;
          }
          
          .attempt-counter {
            font-size: 11px;
            color: #888;
            text-align: center;
            margin-top: 15px;
          }
          
          .tab-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            border-bottom: 1px solid rgba(0, 212, 255, 0.2);
          }
          
          .tab-btn {
            flex: 1;
            padding: 10px;
            background: transparent;
            color: #666;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 12px;
            text-transform: uppercase;
          }
          
          .tab-btn.active {
            color: #00d4ff;
            border-bottom-color: #00d4ff;
          }
        </style>
      </head>
      <body>
        <div class="portal-container">
          <div class="header">
            <div class="logo">🛡️</div>
            <div class="title">SENTINEL SECURITY</div>
            <div class="subtitle">Authentication Required</div>
          </div>
          
          <div class="status">
            🔒 Access to system is restricted until authentication is complete
          </div>
          
          <div class="warning" id="warning-lockout">
            ⚠️ Too many failed attempts. Account locked for 5 minutes.
          </div>
          
          <div class="tab-buttons">
            <button class="tab-btn active" data-tab="login">Login</button>
            <button class="tab-btn" data-tab="recovery">Recovery</button>
          </div>
          
          <!-- LOGIN TAB -->
          <div id="tab-login">
            <form id="login-form">
              <div class="form-group">
                <label>Enter PIN</label>
                <input 
                  type="password" 
                  id="pin" 
                  placeholder="4-digit PIN" 
                  maxlength="10"
                  autocomplete="off"
                >
              </div>
              
              <div class="form-group">
                <label>MFA Token (if enabled)</label>
                <input 
                  type="text" 
                  id="mfa" 
                  placeholder="6-digit code (optional)"
                  maxlength="6"
                  autocomplete="off"
                >
              </div>
              
              <div id="error-message" class="error-message"></div>
              <div class="attempt-counter" id="attempt-counter"></div>
              
              <div class="button-group">
                <button type="submit" class="btn-primary">AUTHENTICATE</button>
                <button type="button" class="btn-recovery" id="recovery-tab-btn">RECOVER</button>
              </div>
            </form>
          </div>
          
          <!-- RECOVERY TAB -->
          <div id="tab-recovery" style="display: none;">
            <div class="form-group">
              <label>Password Recovery</label>
              <input 
                type="password" 
                id="recovery-code" 
                placeholder="Enter recovery passcode"
                autocomplete="off"
              >
            </div>
            
            <div id="recovery-error" class="error-message"></div>
            
            <div class="button-group">
              <button type="button" class="btn-primary" id="recovery-submit">RECOVER ACCESS</button>
              <button type="button" class="btn-recovery" id="login-tab-btn">BACK TO LOGIN</button>
            </div>
          </div>
        </div>
        
        <script>
          const MAX_ATTEMPTS = 3;
          const LOCKOUT_TIME = 300000; // 5 minutes
          let attempts = 0;
          let locked = false;
          
          // Tab switching
          document.querySelector('[data-tab="login"]').addEventListener('click', () => {
            document.getElementById('tab-login').style.display = 'block';
            document.getElementById('tab-recovery').style.display = 'none';
            document.querySelector('[data-tab="login"]').classList.add('active');
            document.querySelector('[data-tab="recovery"]').classList.remove('active');
          });
          
          document.querySelector('[data-tab="recovery"]').addEventListener('click', () => {
            document.getElementById('tab-login').style.display = 'none';
            document.getElementById('tab-recovery').style.display = 'block';
            document.querySelector('[data-tab="login"]').classList.remove('active');
            document.querySelector('[data-tab="recovery"]').classList.add('active');
          });
          
          document.getElementById('recovery-tab-btn').addEventListener('click', () => {
            document.querySelector('[data-tab="recovery"]').click();
          });
          
          document.getElementById('login-tab-btn').addEventListener('click', () => {
            document.querySelector('[data-tab="login"]').click();
          });
          
          // Login form submission
          document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (locked) {
              document.getElementById('error-message').textContent = '❌ Account locked. Try again later.';
              document.getElementById('error-message').classList.add('show');
              return;
            }
            
            const pin = document.getElementById('pin').value;
            const mfa = document.getElementById('mfa').value;
            
            if (!pin) {
              document.getElementById('error-message').textContent = '❌ PIN is required';
              document.getElementById('error-message').classList.add('show');
              return;
            }
            
            try {
              const result = await window.portalAPI.authenticate(pin, mfa);
              
              if (result.success) {
                // Authenticated - close portal and allow app access
                window.portalAPI.authSuccess();
              } else {
                attempts++;
                document.getElementById('error-message').textContent = \`❌ \${result.error}\`;
                document.getElementById('error-message').classList.add('show');
                
                if (attempts >= MAX_ATTEMPTS) {
                  locked = true;
                  document.getElementById('warning-lockout').classList.add('show');
                  
                  setTimeout(() => {
                    locked = false;
                    attempts = 0;
                    document.getElementById('warning-lockout').classList.remove('show');
                  }, LOCKOUT_TIME);
                }
                
                document.getElementById('attempt-counter').textContent = 
                  \`Attempts remaining: \${MAX_ATTEMPTS - attempts}\`;
              }
            } catch (err) {
              document.getElementById('error-message').textContent = '❌ Authentication error';
              document.getElementById('error-message').classList.add('show');
            }
          });
          
          // Recovery form submission
          document.getElementById('recovery-submit').addEventListener('click', async () => {
            const code = document.getElementById('recovery-code').value;
            
            if (!code) {
              document.getElementById('recovery-error').textContent = '❌ Recovery passcode required';
              document.getElementById('recovery-error').classList.add('show');
              return;
            }
            
            try {
              const result = await window.portalAPI.validateRecoveryCode(code);
              
              if (result.success) {
                document.getElementById('recovery-error').textContent = '';
                window.portalAPI.authSuccess();
              } else {
                document.getElementById('recovery-error').textContent = '❌ Invalid recovery passcode';
                document.getElementById('recovery-error').classList.add('show');
              }
            } catch (err) {
              document.getElementById('recovery-error').textContent = '❌ Recovery error';
              document.getElementById('recovery-error').classList.add('show');
            }
          });
          
          // Focus management
          document.getElementById('pin').focus();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Handle login authentication
   */
  async handleLoginAuthentication(pin, mfaToken = '') {
    try {
      if (this.isLockedOut) {
        return { success: false, error: 'Account locked due to too many attempts' };
      }

      // Validate PIN
      const pinValid = this.authService.validatePin(pin);
      if (!pinValid) {
        this.authenticationAttempts++;
        this.forensicsLogger?.log('portal:auth-failed', {
          reason: 'Invalid PIN',
          attempt: this.authenticationAttempts
        });

        if (this.authenticationAttempts >= this.maxAttempts) {
          this.isLockedOut = true;
          setTimeout(() => {
            this.isLockedOut = false;
            this.authenticationAttempts = 0;
          }, this.lockoutTime);

          return {
            success: false,
            error: `Too many failed attempts. Account locked for ${this.lockoutTime / 1000} seconds`,
            lockout: true
          };
        }

        return {
          success: false,
          error: 'Invalid PIN',
          attempts_remaining: this.maxAttempts - this.authenticationAttempts
        };
      }

      // Validate MFA if provided
      if (mfaToken) {
        const mfaValid = this.authService.validateMFA(mfaToken);
        if (!mfaValid) {
          this.authenticationAttempts++;
          return {
            success: false,
            error: 'Invalid MFA token'
          };
        }
      }

      // Authentication successful
      this.isAuthenticated = true;
      this.authenticationAttempts = 0;

      this.forensicsLogger?.log('portal:auth-success', {
        timestamp: new Date().toISOString(),
        mfaUsed: !!mfaToken
      });

      return { success: true, authenticated: true };
    } catch (err) {
      this.error(`Authentication error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Handle password recovery with backdoor passcode
   */
  async handlePasswordRecovery(passcode) {
    try {
      // Check backdoor passphrases
      if (passcode === this.recoveryPasscode || passcode === this.alternateRecoveryPasscode) {
        this.isAuthenticated = true;

        this.forensicsLogger?.log('portal:recovery-success', {
          timestamp: new Date().toISOString(),
          method: 'recovery_passcode'
        });

        return { success: true, authenticated: true };
      }

      this.forensicsLogger?.log('portal:recovery-failed', {
        timestamp: new Date().toISOString(),
        attempt: 'invalid_passcode'
      });

      return { success: false, error: 'Invalid recovery passcode' };
    } catch (err) {
      this.error(`Recovery error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Close login portal after successful authentication
   */
  closeLoginPortal() {
    if (this.loginWindow) {
      this.loginWindow.close();
      this.loginWindow = null;
    }

    this.log('✓ Login portal closed - authentication successful');
  }

  /**
   * Block all processes except allowed ones
   */
  async enforceProcessControl() {
    try {
      if (!this.blockAllProcesses || this.isAuthenticated) {
        return;
      }

      this.log('Enforcing process-level access control...');

      // Kill all user processes except cmd/powershell
      const psCmd = `
        Get-Process | 
        Where-Object { 
          $_.Name -notin @('System', 'Idle', 'Registry', 'csrss', 'lsass', 'svchost', 'wininit', 'cmd', 'powershell', 'conhost', 'terminal', 'electron', 'sentinel') 
        } | 
        Stop-Process -Force -ErrorAction SilentlyContinue
      `;

      await execAsync(`powershell -Command "${psCmd}"`);

      this.log('✓ Process control enforced');
    } catch (err) {
      this.error(`Process control error: ${err.message}`);
    }
  }

  /**
   * Disable process control after authentication
   */
  async releaseProcessControl() {
    if (!this.isAuthenticated) {
      this.log('⚠️ Cannot release process control - not authenticated');
      return;
    }

    this.blockAllProcesses = false;
    this.log('✓ Process control released - full system access granted');
  }

  /**
   * Get portal status
   */
  getStatus() {
    return {
      authenticated: this.isAuthenticated,
      locked: this.isLockedOut,
      attempts: this.authenticationAttempts,
      processControlActive: this.blockAllProcesses,
      allowedProcesses: this.allowedProcesses
    };
  }
}

module.exports = WindowsLoginPortal;
