/**
 * SENTINEL SECURITY SUITE - Windows Authentication Service
 * Multi-factor authentication with Windows credential integration
 * 
 * Features:
 * - Windows credential validation (local user account)
 * - PIN-based authentication
 * - TOTP MFA support
 * - Windows domain account integration
 * - Session management
 * - Role-based access control (RBAC)
 */

const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindowsAuthenticationService {
  constructor(configManager) {
    this.configManager = configManager;
    this.sessions = new Map();
    this.sessionTimeout = 3600000; // 1 hour
    this.mfaEnabled = false;
    this.mfaSecret = null;
    this.currentUser = null;
    this.userRole = 'user'; // 'admin' or 'user'

    this.log = (msg) => console.log(`[AuthService-Windows] ${msg}`);
    this.error = (msg) => console.error(`[AuthService-Windows-ERROR] ${msg}`);
  }

  /**
   * Initialize Windows Authentication Service
   */
  async initialize() {
    try {
      this.log('Initializing Windows Authentication Service...');

      // Get current Windows user
      this.currentUser = await this.getCurrentWindowsUser();
      this.log(`✓ Current user: ${this.currentUser}`);

      // Check if admin
      this.userRole = await this.checkAdminPrivileges() ? 'admin' : 'user';
      this.log(`✓ User role: ${this.userRole}`);

      // Load MFA settings
      this.mfaEnabled = this.configManager?.getConfig('auth.mfaEnabled') || false;
      this.mfaSecret = this.configManager?.getConfig('auth.mfaSecret') || null;

      return { success: true, user: this.currentUser, role: this.userRole };
    } catch (err) {
      this.error(`Initialization failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get current Windows username
   */
  async getCurrentWindowsUser() {
    try {
      const { stdout } = await execAsync('echo %USERNAME%', { shell: 'cmd.exe' });
      return stdout.trim();
    } catch (err) {
      return 'Unknown';
    }
  }

  /**
   * Check if running with admin privileges
   */
  async checkAdminPrivileges() {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "[bool]([System.Security.Principal.WindowsIdentity]::GetCurrent().Groups | Where-Object { $_.Value.EndsWith(\'-512\') })"'
      );
      return stdout.trim() === 'True';
    } catch {
      return false;
    }
  }

  /**
   * Validate Windows credentials against local user account
   */
  async validateWindowsCredentials(username, password) {
    try {
      // Use WMIC or cmdkey to validate credentials
      const psCmd = `
        Add-Type -AssemblyName System.DirectoryServices
        $directoryEntry = New-Object System.DirectoryServices.DirectoryEntry("WinNT://.", $username, $password)
        try {
          $directoryEntry.Bind($true)
          $true
        } catch {
          $false
        }
      `;

      const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
      return stdout.trim() === 'True';
    } catch {
      return false;
    }
  }

  /**
   * Validate PIN (simple numeric authentication)
   */
  validatePin(pin) {
    try {
      const configPin = this.configManager?.getConfig('auth.pin') || '1234'; // Default demo PIN
      return pin === configPin;
    } catch {
      return false;
    }
  }

  /**
   * Validate TOTP MFA token
   */
  validateMFA(token) {
    try {
      if (!this.mfaEnabled || !this.mfaSecret) {
        return false;
      }

      // TOTP validation using secret
      const secret = Buffer.from(this.mfaSecret, 'base64');
      const counter = Math.floor(Date.now() / 30000);

      const hmac = crypto
        .createHmac('sha1', secret)
        .update(Buffer.alloc(8));

      // Write counter to buffer (big-endian)
      for (let i = 7; i >= 0; --i) {
        hmac.update(Buffer.from([counter & 0xff]));
        counter = counter >> 8;
      }

      const digest = hmac.digest('hex');
      const offset = parseInt(digest.substring(digest.length - 1), 16);
      const otp = (parseInt(digest.substring(offset * 2, offset * 2 + 8), 16) & 0x7fffffff) % 1000000;

      return otp.toString().padStart(6, '0') === token;
    } catch (err) {
      this.error(`MFA validation error: ${err.message}`);
      return false;
    }
  }

  /**
   * Authenticate user with PIN and optional MFA
   */
  async authenticate(pin, mfaToken = null) {
    try {
      // Validate PIN
      if (!this.validatePin(pin)) {
        throw new Error('Invalid PIN');
      }

      // Validate MFA if enabled
      if (this.mfaEnabled) {
        if (!mfaToken) {
          throw new Error('MFA token required');
        }
        if (!this.validateMFA(mfaToken)) {
          throw new Error('Invalid MFA token');
        }
      }

      // Create session
      const sessionId = this.createSession(this.userRole);
      return { success: true, sessionId, user: this.currentUser, role: this.userRole };
    } catch (err) {
      this.log(`Authentication failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create new session
   */
  createSession(role) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      id: sessionId,
      user: this.currentUser,
      role,
      created: Date.now(),
      expires: Date.now() + this.sessionTimeout,
      permissions: this.getPermissionsForRole(role)
    };

    this.sessions.set(sessionId, session);
    this.log(`✓ Session created: ${sessionId} (${role})`);

    return sessionId;
  }

  /**
   * Validate session
   */
  validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    if (session.expires < Date.now()) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Get permissions for role
   */
  getPermissionsForRole(role) {
    const permissions = {
      admin: [
        'firewall:*',
        'usb:*',
        'idsips:*',
        'scanner:*',
        'logs:*',
        'auth:*',
        'config:*',
        'system:*'
      ],
      user: [
        'firewall:view',
        'firewall:toggle-rule',
        'usb:view',
        'usb:allow-device',
        'idsips:view',
        'scanner:view',
        'logs:view',
        'auth:change-pin'
      ]
    };

    return permissions[role] || [];
  }

  /**
   * Check if session has permission
   */
  hasPermission(sessionId, resource) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const permissions = session.permissions;
    
    // Check exact match or wildcard
    return permissions.includes(resource) || 
           permissions.includes(`${resource.split(':')[0]}:*`) ||
           permissions.includes('*');
  }

  /**
   * Get current user info
   */
  getCurrentUserInfo() {
    return {
      user: this.currentUser,
      role: this.userRole,
      mfaEnabled: this.mfaEnabled,
      activeSessions: this.sessions.size
    };
  }

  /**
   * Enable MFA (generate secret)
   */
  enableMFA() {
    try {
      // Generate random secret for TOTP
      this.mfaSecret = crypto.randomBytes(32).toString('base64');
      this.mfaEnabled = true;

      this.configManager?.setConfig('auth.mfaEnabled', true);
      this.configManager?.setConfig('auth.mfaSecret', this.mfaSecret);

      this.log('✓ MFA enabled');
      return { success: true, secret: this.mfaSecret };
    } catch (err) {
      this.error(`Failed to enable MFA: ${err.message}`);
      throw err;
    }
  }

  /**
   * Disable MFA
   */
  disableMFA() {
    try {
      this.mfaEnabled = false;
      this.mfaSecret = null;

      this.configManager?.setConfig('auth.mfaEnabled', false);
      this.configManager?.setConfig('auth.mfaSecret', null);

      this.log('✓ MFA disabled');
      return { success: true };
    } catch (err) {
      this.error(`Failed to disable MFA: ${err.message}`);
      throw err;
    }
  }

  /**
   * Change PIN
   */
  changePIN(oldPin, newPin) {
    try {
      const currentPin = this.configManager?.getConfig('auth.pin') || '1234';
      
      if (oldPin !== currentPin) {
        throw new Error('Current PIN is incorrect');
      }

      if (newPin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }

      this.configManager?.setConfig('auth.pin', newPin);
      this.log('✓ PIN changed');

      return { success: true };
    } catch (err) {
      this.error(`Failed to change PIN: ${err.message}`);
      throw err;
    }
  }

  /**
   * Logout session
   */
  logout(sessionId) {
    try {
      this.sessions.delete(sessionId);
      this.log(`✓ Session logged out: ${sessionId}`);
      return { success: true };
    } catch (err) {
      this.error(`Logout error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.expires < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log(`✓ Cleaned up ${cleaned} expired sessions`);
    }
  }
}

module.exports = WindowsAuthenticationService;
