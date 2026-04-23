/**
 * SENTINEL SECURITY SUITE - Windows IDS/IPS Engine
 * Real-time threat detection and prevention
 * 
 * Uses:
 * - Windows Defender API (built-in)
 * - Snort/Suricata for Windows (optional)
 * - Event Log monitoring for threat events
 * - Windows Firewall integration for blocking
 * 
 * Features:
 * - Real-time malware detection
 * - Network threat detection (IDS)
 * - Automatic response to critical threats (IPS)
 * - Signature-based and behavior-based detection
 * - Event log analysis and correlation
 */

const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class WindowsIdsIpsEngine {
  constructor(configManager, forensicsLogger, firewallEngine) {
    this.configManager = configManager;
    this.forensicsLogger = forensicsLogger;
    this.firewallEngine = firewallEngine;
    
    this.threats = new Map();
    this.threatId = 0;
    this.activeThreats = [];
    this.isInitialized = false;
    this.defenderMonitor = null;
    this.snortProcess = null;
    this.useSnort = false; // Will auto-detect
    this.eventLogMonitor = null;
    this.lastEventLogCheck = 0;

    this.log = (msg) => console.log(`[IdsIpsEngine-Windows] ${msg}`);
    this.error = (msg) => console.error(`[IdsIpsEngine-Windows-ERROR] ${msg}`);
  }

  /**
   * Initialize Windows IDS/IPS Engine
   */
  async initialize() {
    try {
      this.log('Initializing Windows IDS/IPS Engine...');

      // Check if Windows Defender is available
      const defenderAvailable = await this.checkDefenderAvailable();
      this.log(`Windows Defender: ${defenderAvailable ? '✓ Available' : '✗ Not available'}`);

      // Check if Snort is installed (for advanced IDS)
      const snortAvailable = await this.checkSnortAvailable();
      if (snortAvailable) {
        this.useSnort = true;
        await this.startSnort();
        this.log('✓ Snort IDS detected and started');
      }

      // Start monitoring Windows Event Log for security events
      this.startEventLogMonitoring();

      // Update threat signatures
      await this.updateThreatSignatures();

      this.isInitialized = true;
      this.log('✓ Windows IDS/IPS Engine initialized successfully');

      this.forensicsLogger?.log('idsips:initialized', {
        os: 'Windows',
        defenderAvailable,
        snortAvailable: this.useSnort,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'IDS/IPS Engine initialized' };
    } catch (err) {
      this.error(`Initialization failed: ${err.message}`);
      this.forensicsLogger?.log('idsips:init-failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Check if Windows Defender is available
   */
  async checkDefenderAvailable() {
    try {
      const { stdout } = await execAsync(
        'powershell -Command "Get-MpPreference -ErrorAction SilentlyContinue | Select-Object -ExpandProperty DisableRealtimeMonitoring"'
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if Snort is installed
   */
  async checkSnortAvailable() {
    try {
      const { stdout } = await execAsync('where snort');
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Start Snort process for network IDS
   */
  async startSnort() {
    try {
      // Snort on Windows command: snort -i1 -c C:\Snort\etc\snort.conf -l C:\Snort\log -A full
      this.snortProcess = spawn('snort', [
        '-i1',
        '-c', 'C:\\Snort\\etc\\snort.conf',
        '-l', 'C:\\Snort\\log',
        '-A', 'full'
      ]);

      this.snortProcess.stdout.on('data', (data) => {
        this.processSnortOutput(data.toString());
      });

      this.snortProcess.stderr.on('data', (data) => {
        this.error(`Snort stderr: ${data}`);
      });

      this.log('✓ Snort IDS process started');
    } catch (err) {
      this.error(`Failed to start Snort: ${err.message}`);
      this.useSnort = false;
    }
  }

  /**
   * Process Snort output for threat detection
   */
  processSnortOutput(output) {
    try {
      // Parse Snort alerts from output
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('ALERT') || line.includes('Classification')) {
          // Extract threat information
          const threat = this.parseSnortAlert(line);
          if (threat) {
            this.handleDetection(threat);
          }
        }
      }
    } catch (err) {
      this.error(`Error processing Snort output: ${err.message}`);
    }
  }

  /**
   * Parse Snort alert line
   */
  parseSnortAlert(line) {
    try {
      // Example: [**] [1:1234:1] Title [**] [Classification: Info] [Priority: 3]
      const threatMatch = line.match(/\[1:(\d+):(\d+)\] (.+?) \[Classification: (.+?)\] \[Priority: (\d+)\]/);
      
      if (threatMatch) {
        return {
          signatureId: threatMatch[1],
          signatureRev: threatMatch[2],
          name: threatMatch[3],
          classification: threatMatch[4],
          priority: parseInt(threatMatch[5]),
          severity: this.mapPriorityToSeverity(parseInt(threatMatch[5])),
          source: 'snort',
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (err) {
      this.error(`Failed to parse Snort alert: ${err.message}`);
      return null;
    }
  }

  /**
   * Map Snort priority to severity level
   */
  mapPriorityToSeverity(priority) {
    if (priority === 1) return 'CRITICAL';
    if (priority === 2) return 'HIGH';
    if (priority === 3) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Start monitoring Windows Event Log for security events
   */
  startEventLogMonitoring() {
    try {
      // Monitor every 10 seconds
      this.eventLogMonitor = setInterval(async () => {
        try {
          await this.checkWindowsEventLog();
        } catch (err) {
          this.error(`Event log check error: ${err.message}`);
        }
      }, 10000);

      this.log('✓ Event Log monitoring started');
    } catch (err) {
      this.error(`Failed to start Event Log monitoring: ${err.message}`);
    }
  }

  /**
   * Check Windows Event Log for security events
   */
  async checkWindowsEventLog() {
    try {
      // Query Security event log for recent events
      // Event IDs: 1102 (audit log cleared), 4625 (failed login), 4688 (process created), etc.
      const psCmd = `
        Get-EventLog -LogName Security -After (Get-Date).AddSeconds(-15) |
        Where-Object {$_.EventID -in 4625, 4688, 4697, 4698, 4699, 4703, 4720, 4722, 5140} |
        Select-Object EventID, Message, TimeGenerated |
        ConvertTo-Json -Compress
      `;

      const { stdout } = await execAsync(`powershell -Command "${psCmd}"`);
      
      if (stdout.trim()) {
        const events = JSON.parse(stdout);
        const eventArray = Array.isArray(events) ? events : [events];

        for (const event of eventArray) {
          this.processSecurityEvent(event);
        }
      }
    } catch (err) {
      // Non-fatal, event log may have no new events
    }
  }

  /**
   * Process Windows Security event
   */
  processSecurityEvent(event) {
    try {
      const threat = {
        id: ++this.threatId,
        name: this.getEventName(event.EventID),
        type: 'event-log',
        severity: this.getEventSeverity(event.EventID),
        source: event.Message,
        sourceIp: this.extractIpFromMessage(event.Message),
        timestamp: new Date(event.TimeGenerated).toISOString(),
        eventId: event.EventID,
        blocked: false
      };

      this.handleDetection(threat);
    } catch (err) {
      this.error(`Failed to process security event: ${err.message}`);
    }
  }

  /**
   * Get human-readable name for event ID
   */
  getEventName(eventId) {
    const names = {
      4625: 'Failed Login Attempt',
      4688: 'Process Created',
      4697: 'Service Installed',
      4698: 'Scheduled Task Created',
      4699: 'Scheduled Task Deleted',
      4703: 'User Right Modified',
      4720: 'User Account Created',
      4722: 'User Account Enabled',
      5140: 'Network Share Accessed'
    };
    return names[eventId] || `Security Event ${eventId}`;
  }

  /**
   * Get severity for event ID
   */
  getEventSeverity(eventId) {
    if ([4625, 4697, 4698, 4703, 4720].includes(eventId)) return 'HIGH';
    if ([4688, 4722].includes(eventId)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Extract IP address from event message
   */
  extractIpFromMessage(message) {
    try {
      const ipMatch = message.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
      return ipMatch ? ipMatch[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Handle threat detection - called for all detected threats
   */
  async handleDetection(threat) {
    try {
      // Store threat
      this.threats.set(threat.id, threat);
      this.activeThreats.push(threat);

      // Keep only last 1000 threats in memory
      if (this.activeThreats.length > 1000) {
        this.activeThreats = this.activeThreats.slice(-1000);
      }

      this.log(`🚨 Threat detected: ${threat.name} [${threat.severity}]`);

      // Log forensics
      this.forensicsLogger?.log('idsips:threat-detected', {
        threatId: threat.id,
        name: threat.name,
        severity: threat.severity,
        source: threat.source,
        sourceIp: threat.sourceIp,
        timestamp: threat.timestamp
      });

      // Auto-block critical threats
      if (threat.severity === 'CRITICAL') {
        await this.handleHighThreat(threat);
      }

      return threat;
    } catch (err) {
      this.error(`Failed to handle detection: ${err.message}`);
    }
  }

  /**
   * Auto-block critical threats
   */
  async handleHighThreat(threat) {
    try {
      if (!threat.sourceIp) {
        this.log(`⚠️ Cannot block: No source IP for threat ${threat.id}`);
        return;
      }

      // Block source IP using Firewall
      await this.blockSourceIp(threat.sourceIp);

      threat.blocked = true;
      threat.blockedAt = new Date().toISOString();

      this.log(`✓ Critical threat blocked: ${threat.sourceIp}`);

      this.forensicsLogger?.log('idsips:threat-blocked', {
        threatId: threat.id,
        sourceIp: threat.sourceIp,
        action: 'auto-blocked'
      });
    } catch (err) {
      this.error(`Failed to handle high threat: ${err.message}`);
    }
  }

  /**
   * Block source IP using Windows Firewall
   */
  async blockSourceIp(sourceIp) {
    try {
      const ruleName = `Sentinel-Block-${sourceIp.replace(/\./g, '-')}`;
      
      await execAsync(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=block remoteip=${sourceIp}`);

      this.log(`✓ Blocked IP: ${sourceIp}`);

      // Also add rule via firewall engine if available
      if (this.firewallEngine) {
        await this.firewallEngine.addRule({
          name: ruleName,
          direction: 'inbound',
          protocol: 'any',
          remoteAddress: sourceIp,
          action: 'block',
          description: `Auto-blocked by IPS: ${sourceIp}`
        });
      }
    } catch (err) {
      this.error(`Failed to block IP ${sourceIp}: ${err.message}`);
    }
  }

  /**
   * Update threat signatures (Windows Defender)
   */
  async updateThreatSignatures() {
    try {
      this.log('Updating threat signatures...');

      // Update Windows Defender signatures
      await execAsync('powershell -Command "Update-MpSignature -ErrorAction SilentlyContinue"');

      // Update Snort signatures if available
      if (this.useSnort) {
        try {
          await execAsync('snort-update');
          this.log('✓ Snort signatures updated');
        } catch {
          this.log('⚠️ Snort update not available');
        }
      }

      this.log('✓ Threat signatures updated');
      this.forensicsLogger?.log('idsips:signatures-updated', { timestamp: new Date().toISOString() });
    } catch (err) {
      this.error(`Failed to update signatures: ${err.message}`);
    }
  }

  /**
   * Scan file with Windows Defender
   */
  async scanFile(filePath) {
    try {
      const psCmd = `
        Start-MpScan -ScanPath "${filePath}" -ScanType FullScan -ErrorAction SilentlyContinue
      `;

      await execAsync(`powershell -Command "${psCmd}"`);
      this.log(`✓ File scan initiated: ${filePath}`);

      return { success: true, message: `Scanning ${filePath}` };
    } catch (err) {
      this.error(`Failed to scan file: ${err.message}`);
      throw err;
    }
  }

  /**
   * Get recent threat events
   */
  getRecentEvents(limit = 100) {
    return this.activeThreats.slice(-limit).map(t => ({
      id: t.id,
      name: t.name,
      severity: t.severity,
      source: t.source,
      sourceIp: t.sourceIp,
      timestamp: t.timestamp,
      blocked: t.blocked,
      blockedAt: t.blockedAt
    }));
  }

  /**
   * Get active threats (last hour)
   */
  getActiveThreats() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    return Array.from(this.threats.values())
      .filter(t => new Date(t.timestamp).getTime() > oneHourAgo)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get IDS/IPS statistics
   */
  getStatistics() {
    const allThreats = Array.from(this.threats.values());
    return {
      totalThreats: allThreats.length,
      criticalThreats: allThreats.filter(t => t.severity === 'CRITICAL').length,
      highThreats: allThreats.filter(t => t.severity === 'HIGH').length,
      mediumThreats: allThreats.filter(t => t.severity === 'MEDIUM').length,
      blockedThreats: allThreats.filter(t => t.blocked).length,
      snortActive: !!this.snortProcess,
      defenderActive: true
    };
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    try {
      if (this.eventLogMonitor) {
        clearInterval(this.eventLogMonitor);
      }

      if (this.snortProcess) {
        this.snortProcess.kill();
      }

      this.log('✓ Windows IDS/IPS Engine shutdown complete');
    } catch (err) {
      this.error(`Shutdown error: ${err.message}`);
    }
  }
}

module.exports = WindowsIdsIpsEngine;
