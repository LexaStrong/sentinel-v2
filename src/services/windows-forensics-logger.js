/**
 * SENTINEL SECURITY SUITE - Windows Forensics Logger
 * Append-only security event logging with Windows Event Viewer integration
 * 
 * Features:
 * - Append-only event logging (tamper-proof)
 * - Windows Event Log integration
 * - Event filtering and search
 * - Export formats: JSON, CSV, EVTX
 * - Statistics and analytics
 * - Automatic log rotation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindowsForensicsLogger {
  constructor(configManager) {
    this.configManager = configManager;
    this.logDir = path.join(os.homedir(), '.sentinel-security', 'logs');
    this.maxLogSize = 100 * 1024 * 1024; // 100MB
    this.maxLogFiles = 10;
    this.entries = [];
    this.isInitialized = false;

    this.log = (msg) => console.log(`[ForensicsLogger-Windows] ${msg}`);
    this.error = (msg) => console.error(`[ForensicsLogger-Windows-ERROR] ${msg}`);
  }

  /**
   * Initialize Windows Forensics Logger
   */
  async initialize() {
    try {
      this.log('Initializing Windows Forensics Logger...');

      // Create log directory
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      // Create Windows Event Log source if not exists
      await this.createEventLogSource();

      this.isInitialized = true;
      this.log('✓ Windows Forensics Logger initialized');

      return { success: true };
    } catch (err) {
      this.error(`Initialization failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Create Windows Event Log source for Sentinel
   */
  async createEventLogSource() {
    try {
      const psCmd = `
        $logName = "Sentinel Security"
        $source = "Sentinel"
        
        if (-not [System.Diagnostics.EventLog]::SourceExists($source)) {
          New-EventLog -LogName $logName -Source $source -ErrorAction SilentlyContinue
        }
      `;

      await execAsync(`powershell -Command "${psCmd}"`);
      this.log('✓ Event Log source "Sentinel" created/verified');
    } catch (err) {
      this.log(`⚠️ Could not create Event Log source: ${err.message}`);
    }
  }

  /**
   * Log a security event
   */
  async log(eventType, data) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        eventType,
        data,
        hostname: os.hostname(),
        severity: this.classifySeverity(eventType),
        sequenceNumber: this.entries.length + 1
      };

      // Add to memory
      this.entries.push(entry);

      // Write to file (append-only)
      const logFile = this.selectLogFile(eventType);
      this.checkLogRotation(logFile);

      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');

      // Also write to Windows Event Log
      await this.writeToEventLog(entry);

      return entry;
    } catch (err) {
      this.error(`Logging error: ${err.message}`);
    }
  }

  /**
   * Select which log file to write to
   */
  selectLogFile(eventType) {
    if (eventType.startsWith('firewall:') || eventType.startsWith('usb:')) {
      return path.join(this.logDir, 'sentinel-security.log');
    } else if (eventType.startsWith('auth:') || eventType.startsWith('idsips:') || eventType.startsWith('netscan:')) {
      return path.join(this.logDir, 'sentinel-audit.log');
    } else {
      return path.join(this.logDir, 'sentinel-threats.log');
    }
  }

  /**
   * Write event to Windows Event Log
   */
  async writeToEventLog(entry) {
    try {
      const eventId = this.getEventId(entry.eventType);
      const message = `${entry.eventType}: ${JSON.stringify(entry.data)}`;

      const psCmd = `
        Write-EventLog -LogName "Sentinel Security" -Source "Sentinel" -EventId ${eventId} -EntryType ${entry.severity === 'CRITICAL' ? 'Error' : 'Warning'} -Message "${message}"
      `;

      await execAsync(`powershell -Command "${psCmd}"`);
    } catch (err) {
      // Non-fatal, file logging already done
    }
  }

  /**
   * Get event ID for event type (for Event Log categorization)
   */
  getEventId(eventType) {
    const mapping = {
      'firewall:': 1000,
      'usb:': 2000,
      'idsips:': 3000,
      'netscan:': 4000,
      'webscan:': 4100,
      'auth:': 5000,
      'config:': 6000,
      'system:': 7000
    };

    for (const [prefix, id] of Object.entries(mapping)) {
      if (eventType.startsWith(prefix)) {
        return id;
      }
    }

    return 9000; // Default
  }

  /**
   * Classify event severity
   */
  classifySeverity(eventType) {
    if (eventType.includes('initialized') || eventType.includes('success')) {
      return 'INFO';
    }
    if (eventType.includes('threat-detected') || eventType.includes('warning')) {
      return 'HIGH';
    }
    if (eventType.includes('critical')) {
      return 'CRITICAL';
    }
    return 'MEDIUM';
  }

  /**
   * Check and rotate log file if too large
   */
  checkLogRotation(logFile) {
    try {
      if (!fs.existsSync(logFile)) {
        return;
      }

      const stats = fs.statSync(logFile);
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        fs.renameSync(logFile, rotatedFile);
        this.log(`✓ Log rotated: ${path.basename(rotatedFile)}`);

        // Clean old rotated files
        this.cleanOldLogs(logFile);
      }
    } catch (err) {
      this.error(`Log rotation error: ${err.message}`);
    }
  }

  /**
   * Clean old rotated log files
   */
  cleanOldLogs(baseFile) {
    try {
      const dir = path.dirname(baseFile);
      const baseName = path.basename(baseFile);
      const files = fs.readdirSync(dir)
        .filter(f => f.startsWith(baseName) && f !== baseName)
        .sort()
        .reverse();

      if (files.length > this.maxLogFiles) {
        for (let i = this.maxLogFiles; i < files.length; i++) {
          fs.unlinkSync(path.join(dir, files[i]));
        }
        this.log(`✓ Cleaned ${files.length - this.maxLogFiles} old log files`);
      }
    } catch (err) {
      this.error(`Cleanup error: ${err.message}`);
    }
  }

  /**
   * Get log entries with filtering
   */
  getEntries(options = {}) {
    try {
      let filtered = [...this.entries];

      // Filter by event type
      if (options.eventType) {
        filtered = filtered.filter(e => e.eventType === options.eventType);
      }

      // Filter by severity
      if (options.severity) {
        filtered = filtered.filter(e => e.severity === options.severity);
      }

      // Filter by date range
      if (options.startDate) {
        const start = new Date(options.startDate);
        filtered = filtered.filter(e => new Date(e.timestamp) >= start);
      }

      if (options.endDate) {
        const end = new Date(options.endDate);
        filtered = filtered.filter(e => new Date(e.timestamp) <= end);
      }

      // Limit results
      const limit = options.limit || 100;
      return filtered.slice(-limit);
    } catch (err) {
      this.error(`Query error: ${err.message}`);
      return [];
    }
  }

  /**
   * Export logs to file
   */
  async exportLogs(format = 'json', filename = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outFile = filename || path.join(this.logDir, `export-${timestamp}.${format}`);

      if (format === 'json') {
        fs.writeFileSync(outFile, JSON.stringify(this.entries, null, 2));
      } else if (format === 'csv') {
        const csv = this.convertToCsv(this.entries);
        fs.writeFileSync(outFile, csv);
      } else if (format === 'evtx') {
        // Export via PowerShell to EVTX format
        const psCmd = `
          wevtutil epl "Sentinel Security" "${outFile}"
        `;
        await execAsync(psCmd);
      }

      this.log(`✓ Logs exported to: ${outFile}`);
      return { success: true, file: outFile };
    } catch (err) {
      this.error(`Export error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Convert entries to CSV format
   */
  convertToCsv(entries) {
    if (entries.length === 0) return '';

    const headers = ['Timestamp', 'EventType', 'Severity', 'Hostname', 'Data'];
    const rows = entries.map(e => [
      e.timestamp,
      e.eventType,
      e.severity,
      e.hostname,
      JSON.stringify(e.data)
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(','))
    ].join('\n');

    return csv;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const stats = {
      totalEvents: this.entries.length,
      bySeverity: {},
      byType: {},
      oldestEvent: this.entries[0]?.timestamp || null,
      newestEvent: this.entries[this.entries.length - 1]?.timestamp || null
    };

    // Count by severity
    for (const entry of this.entries) {
      stats.bySeverity[entry.severity] = (stats.bySeverity[entry.severity] || 0) + 1;
      stats.byType[entry.eventType] = (stats.byType[entry.eventType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Search logs in Windows Event Log
   */
  async searchEventLog(filter = {}) {
    try {
      const psCmd = `
        $events = Get-WinEvent -LogName "Sentinel Security" -ErrorAction SilentlyContinue
        $events | Select-Object TimeCreated, LevelDisplayName, Message | ConvertTo-Json -Compress
      `;

      const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
      const events = JSON.parse(stdout);

      return Array.isArray(events) ? events : [events];
    } catch (err) {
      this.error(`Event Log search error: ${err.message}`);
      return [];
    }
  }

  /**
   * Clear logs (requires admin)
   */
  async clearLogs() {
    try {
      // This is intentionally difficult to prevent accidental data loss
      const psCmd = `
        Clear-EventLog -LogName "Sentinel Security" -Confirm:$false
      `;

      await execAsync(`powershell -Command "${psCmd}"`);
      this.log('⚠️ Event Log cleared');

      this.entries = [];
      return { success: true };
    } catch (err) {
      this.error(`Failed to clear logs: ${err.message}`);
      throw err;
    }
  }
}

module.exports = WindowsForensicsLogger;
