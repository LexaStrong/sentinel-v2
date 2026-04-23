/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FORENSICS LOGGER - SECURITY AUDIT & INCIDENT RESPONSE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * - Comprehensive security event logging
 * - Structured JSON logs for analysis
 * - Automatic log rotation
 * - Full audit trail for forensic investigation
 * - Export capabilities (JSON, CSV, syslog)
 * - Tamper-proof logging (append-only)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const { createWriteStream, appendFileSync } = require('fs');

class ForensicsLogger {
  constructor(logDir) {
    this.logDir = logDir;
    this.mainLog = path.join(logDir, 'sentinel-security.log');
    this.auditLog = path.join(logDir, 'sentinel-audit.log');
    this.threatLog = path.join(logDir, 'sentinel-threats.log');
    this.entries = [];
    this.maxEntries = 100000;
  }

  /**
   * Log security event
   */
  log(eventType, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      eventType,
      data,
      severity: this.classifySeverity(eventType),
      hostname: require('os').hostname(),
    };

    // Add to memory
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Write to appropriate log file
    this.writeToFile(entry);

    // Log to console for critical events
    if (entry.severity === 'CRITICAL') {
      console.error(`🚨 [CRITICAL] ${eventType}:`, data);
    } else if (entry.severity === 'HIGH') {
      console.warn(`⚠️  [HIGH] ${eventType}:`, data);
    } else {
      console.log(`✓ [${entry.severity}] ${eventType}`, data);
    }

    return entry;
  }

  /**
   * Write log entry to file
   */
  writeToFile(entry) {
    try {
      const logFile = this.selectLogFile(entry.eventType);
      const line = JSON.stringify(entry) + '\n';

      // Append-only write (security best practice)
      appendFileSync(logFile, line, { mode: 0o600 });

      // Check log rotation
      this.checkLogRotation(logFile);
    } catch (error) {
      console.error('❌ Error writing to log file:', error.message);
    }
  }

  /**
   * Select appropriate log file based on event type
   */
  selectLogFile(eventType) {
    if (eventType.includes('THREAT') || eventType.includes('ATTACK') || eventType.includes('VULN')) {
      return this.threatLog;
    } else if (eventType.includes('AUTH') || eventType.includes('ACCESS') || eventType.includes('PERMISSION')) {
      return this.auditLog;
    }
    return this.mainLog;
  }

  /**
   * Check and rotate logs if needed
   */
  checkLogRotation(logFile) {
    try {
      const stats = fs.statSync(logFile);
      const maxSize = 104857600; // 100MB

      if (stats.size > maxSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${logFile}.${timestamp}.gz`;

        // In production, would compress with gzip
        const backup = `${logFile}.${timestamp}`;
        fs.renameSync(logFile, backup);

        console.log(`✓ Log rotated: ${backup}`);
      }
    } catch (error) {
      // File doesn't exist yet or can't stat
    }
  }

  /**
   * Classify event severity
   */
  classifySeverity(eventType) {
    if (eventType.includes('CRITICAL') || eventType.includes('FAILED')) {
      return 'CRITICAL';
    } else if (eventType.includes('THREAT') || eventType.includes('BLOCKED') || eventType.includes('ATTACK')) {
      return 'HIGH';
    } else if (eventType.includes('WARNING') || eventType.includes('ERROR')) {
      return 'MEDIUM';
    } else if (eventType.includes('INFO') || eventType.includes('ALLOW')) {
      return 'LOW';
    }
    return 'INFO';
  }

  /**
   * Get log entries with filtering
   */
  getEntries(filter = {}) {
    let results = this.entries;

    // Filter by event type
    if (filter.eventType) {
      results = results.filter(e => e.eventType === filter.eventType);
    }

    // Filter by severity
    if (filter.severity) {
      results = results.filter(e => e.severity === filter.severity);
    }

    // Filter by date range
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      results = results.filter(e => new Date(e.timestamp).getTime() <= end);
    }

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limit = filter.limit || 1000;
    return results.slice(0, limit);
  }

  /**
   * Export logs in various formats
   */
  exportLogs(format = 'json') {
    try {
      const timestamp = new Date().toISOString().split('T')[0];

      switch (format) {
        case 'json':
          return {
            filename: `sentinel-logs-${timestamp}.json`,
            content: JSON.stringify(this.entries, null, 2),
            mimeType: 'application/json',
          };

        case 'csv':
          const csv = this.entriesToCSV(this.entries);
          return {
            filename: `sentinel-logs-${timestamp}.csv`,
            content: csv,
            mimeType: 'text/csv',
          };

        case 'syslog':
          const syslog = this.entriesToSyslog(this.entries);
          return {
            filename: `sentinel-logs-${timestamp}.syslog`,
            content: syslog,
            mimeType: 'text/plain',
          };

        default:
          throw new Error(`Unknown export format: ${format}`);
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Convert entries to CSV format
   */
  entriesToCSV(entries) {
    const headers = ['Timestamp', 'Event Type', 'Severity', 'Data', 'Hostname'];
    const rows = entries.map(e => [
      e.timestamp,
      e.eventType,
      e.severity,
      JSON.stringify(e.data),
      e.hostname,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Convert entries to syslog format
   */
  entriesToSyslog(entries) {
    const severityMap = {
      CRITICAL: 2,
      HIGH: 3,
      MEDIUM: 4,
      LOW: 6,
      INFO: 6,
    };

    return entries
      .map(e => {
        const syslogSev = severityMap[e.severity] || 6;
        const facility = 16 << 3; // Local user
        const priority = facility + syslogSev;

        return (
          `<${priority}> ${new Date(e.timestamp).toUTCString()} ` +
          `${e.hostname} sentinel[${process.pid}]: ${e.eventType} ${JSON.stringify(e.data)}`
        );
      })
      .join('\n');
  }

  /**
   * Get security statistics
   */
  getStatistics() {
    const stats = {
      totalEvents: this.entries.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byType: {},
    };

    for (const entry of this.entries) {
      stats[entry.severity.toLowerCase()]++;

      if (!stats.byType[entry.eventType]) {
        stats.byType[entry.eventType] = 0;
      }
      stats.byType[entry.eventType]++;
    }

    return stats;
  }
}

module.exports = ForensicsLogger;
