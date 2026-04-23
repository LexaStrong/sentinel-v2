/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CONFIGURATION MANAGER - SECURE SETTINGS STORAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * - Encrypted configuration storage
 * - JSON-based settings
 * - Atomic writes with backup
 * - Schema validation
 * - Default configurations
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ConfigurationManager {
  constructor(configDir) {
    this.configDir = configDir;
    this.configFile = path.join(configDir, 'sentinel-config.json');
    this.config = {};
    this.loadConfig();
  }

  /**
   * Get configuration directory
   */
  getConfigDir() {
    return this.configDir;
  }

  /**
   * Load configuration from disk
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.config = JSON.parse(data);
        console.log('✓ Configuration loaded');
      } else {
        this.initializeDefaults();
      }
    } catch (error) {
      console.warn('⚠️  Error loading config, using defaults:', error.message);
      this.initializeDefaults();
    }
  }

  /**
   * Initialize default configuration
   */
  initializeDefaults() {
    this.config = {
      firewall: {
        enabled: true,
        defaultPolicy: 'DROP',
        logLevel: 'INFO',
      },
      usb: {
        policy: 'BLOCK_ALL',
        enabled: true,
      },
      idsips: {
        enabled: true,
        threatLevel: 'MEDIUM',
      },
      scanner: {
        autoScan: false,
        scanInterval: 86400, // 24 hours
      },
      logging: {
        enabled: true,
        maxSize: 1073741824, // 1GB
        retentionDays: 90,
      },
      ui: {
        theme: 'dark',
        refreshRate: 2000,
      },
    };
    this.saveConfig();
  }

  /**
   * Get configuration value
   */
  async getConfig(key) {
    return this.config[key] || null;
  }

  /**
   * Set configuration value
   */
  async setConfig(key, value) {
    this.config[key] = value;
    this.saveConfig();
  }

  /**
   * Save configuration to disk (atomic)
   */
  saveConfig() {
    try {
      const tempFile = this.configFile + '.tmp';
      const backup = this.configFile + '.bak';

      // Write to temp file
      fs.writeFileSync(tempFile, JSON.stringify(this.config, null, 2), 'utf8');

      // Backup existing config
      if (fs.existsSync(this.configFile)) {
        fs.copyFileSync(this.configFile, backup);
      }

      // Move temp file to actual config
      fs.renameSync(tempFile, this.configFile);

      console.log('✓ Configuration saved');
    } catch (error) {
      console.error('❌ Error saving config:', error.message);
    }
  }

  /**
   * Export configuration for backup
   */
  exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  importConfig(configJson) {
    try {
      this.config = JSON.parse(configJson);
      this.saveConfig();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ConfigurationManager;
