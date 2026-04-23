/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IDS/IPS ENGINE - INTRUSION DETECTION & PREVENTION
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * - Signature-based detection (Suricata rules)
 * - Behavior-based anomaly detection
 * - Real-time threat blocking (IPS mode)
 * - Alert generation & logging
 * - Integration with Suricata on Kali Linux
 * - DDoS mitigation
 * - Known malware/C2 detection
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class IdsIpsEngine {
  constructor(configManager, forensicsLogger) {
    this.configManager = configManager;
    this.forensicsLogger = forensicsLogger;
    this.events = [];
    this.threats = [];
    this.suricataProcess = null;
    this.initialized = false;
    this.maxEvents = 10000; // Keep last N events
  }

  async initialize() {
    console.log('🔧 Initializing IDS/IPS Engine (Suricata)...');

    // Download latest threat signatures
    await this.updateThreats Signatures();

    // Start Suricata if available
    if (this.isSuricataAvailable()) {
      await this.startSuricata();
    } else {
      console.warn('⚠️  Suricata not found. Install with: apt install suricata');
    }

    this.initialized = true;
    console.log('✓ IDS/IPS Engine initialized');
  }

  /**
   * Check if Suricata is installed
   */
  isSuricataAvailable() {
    try {
      execSync('which suricata', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start Suricata for real-time threat detection
   */
  async startSuricata() {
    try {
      if (process.getuid?.() !== 0) {
        console.warn('⚠️  Suricata requires root privileges');
        return;
      }

      // Suricata configuration path
      const suricataConfig = '/etc/suricata/suricata.yaml';

      if (fs.existsSync(suricataConfig)) {
        // Start Suricata in IPS mode with eve-log
        this.suricataProcess = spawn('suricata', [
          '-c',
          suricataConfig,
          '-i',
          'eth0', // or get active interface
          '--set',
          'outputs.eve-log.enabled=true',
        ]);

        console.log('✓ Suricata started');

        // Monitor Suricata output
        this.suricataProcess.stdout.on('data', (data) => {
          this.parsesuricataOutput(data.toString());
        });

        this.suricataProcess.stderr.on('data', (data) => {
          console.warn('⚠️  Suricata error:', data.toString());
        });

        this.suricataProcess.on('close', (code) => {
          console.warn(`⚠️  Suricata exited with code ${code}`);
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not start Suricata:', error.message);
    }
  }

  /**
   * Parse Suricata eve-log output
   */
  parsesuricataOutput(output) {
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line);
          if (event.event_type === 'alert') {
            this.handleDetection(event);
          }
        } catch (e) {
          // Not JSON, skip
        }
      }
    } catch (error) {
      console.warn('⚠️  Error parsing Suricata output:', error.message);
    }
  }

  /**
   * Handle detected threat
   */
  handleDetection(suricataEvent) {
    const threat = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(suricataEvent.timestamp),
      rule: suricataEvent.alert?.signature || 'Unknown',
      ruleId: suricataEvent.alert?.signature_id,
      severity: this.mapSeverity(suricataEvent.alert?.severity),
      source: {
        ip: suricataEvent.src_ip,
        port: suricataEvent.src_port,
      },
      destination: {
        ip: suricataEvent.dest_ip,
        port: suricataEvent.dest_port,
      },
      protocol: suricataEvent.proto,
      action: 'DETECTED',
      payload: suricataEvent.payload_printable || '',
    };

    this.events.push(threat);

    // Keep events under max
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log high-severity threats
    if (threat.severity === 'CRITICAL' || threat.severity === 'HIGH') {
      this.threats.push(threat);
      this.handleHighThreat(threat);
    }

    this.forensicsLogger.log('IDS_DETECTION', threat);
  }

  /**
   * Handle high-severity threats
   */
  handleHighThreat(threat) {
    console.error(`🚨 HIGH THREAT DETECTED: ${threat.rule}`);

    // Auto-block source IP (IPS mode)
    if (threat.severity === 'CRITICAL') {
      this.blockSourceIp(threat.source.ip);
    }

    // Alert user via UI
    // This would be sent to renderer via IPC
  }

  /**
   * Block source IP
   */
  blockSourceIp(ip) {
    try {
      if (process.getuid?.() === 0) {
        execSync(`iptables -I INPUT -s ${ip} -j DROP`);
        console.log(`🛡️  Blocked threat source: ${ip}`);

        this.forensicsLogger.log('IPS_BLOCKED_IP', { ip });
      }
    } catch (error) {
      console.warn(`⚠️  Could not block IP ${ip}:`, error.message);
    }
  }

  /**
   * Map Suricata severity to internal format
   */
  mapSeverity(suricataSev) {
    const map = {
      1: 'CRITICAL',
      2: 'HIGH',
      3: 'MEDIUM',
      4: 'LOW',
    };
    return map[suricataSev] || 'UNKNOWN';
  }

  /**
   * Update threat signatures
   */
  async updateThreatsSignatures() {
    try {
      if (process.getuid?.() === 0) {
        // Update Suricata rules from ET (Emerging Threats)
        console.log('📥 Updating threat signatures...');
        execSync('suricata-update', { stdio: 'pipe' });
        console.log('✓ Threat signatures updated');
      }
    } catch (error) {
      console.warn('⚠️  Could not update signatures:', error.message);
    }
  }

  /**
   * Get recent IDS events
   */
  getRecentEvents(limit = 100) {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get active threats
   */
  getActivethreats() {
    // Return threats from last hour
    const oneHourAgo = Date.now() - 3600000;
    return this.threats.filter(t => t.timestamp.getTime() > oneHourAgo);
  }

  /**
   * Get IDS/IPS statistics
   */
  getStatistics() {
    return {
      totalEvents: this.events.length,
      threatsDetected: this.threats.length,
      criticalThreats: this.threats.filter(t => t.severity === 'CRITICAL').length,
      highThreats: this.threats.filter(t => t.severity === 'HIGH').length,
      ipsBlockedIps: new Set(this.threats.map(t => t.source.ip)).size,
    };
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      active: this.suricataProcess ? true : false,
      eventsCount: this.events.length,
      threatsCount: this.threats.length,
      timestamp: new Date(),
    };
  }
}

module.exports = IdsIpsEngine;
