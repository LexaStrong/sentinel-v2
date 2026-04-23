/**
 * SENTINEL SECURITY SUITE - First-Run Setup Service
 * Interactive setup wizard for first-time configuration
 * 
 * Features:
 * - PIN configuration
 * - MFA setup
 * - Firewall policy selection
 * - USB protection policy
 * - Quick setup vs advanced setup
 */

const crypto = require('crypto');

class FirstRunSetupService {
  constructor(configManager, authService, forensicsLogger) {
    this.configManager = configManager;
    this.authService = authService;
    this.forensicsLogger = forensicsLogger;

    this.log = (msg) => console.log(`[SetupService] ${msg}`);
    this.error = (msg) => console.error(`[SetupService-ERROR] ${msg}`);
  }

  /**
   * Generate setup wizard HTML
   */
  generateSetupWizardHTML() {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Sentinel Security - First-Run Setup</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow-y: auto;
          }
          
          .wizard-container {
            background: rgba(22, 33, 62, 0.95);
            border: 2px solid #00d4ff;
            border-radius: 15px;
            padding: 50px;
            width: 100%;
            max-width: 700px;
            margin: 20px;
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.2);
          }
          
          .step-progress {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            position: relative;
          }
          
          .step-progress::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 0;
            right: 0;
            height: 2px;
            background: rgba(0, 212, 255, 0.2);
            z-index: -1;
          }
          
          .step {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
          }
          
          .step-number {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(0, 212, 255, 0.2);
            border: 2px solid #00d4ff;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00d4ff;
            font-weight: bold;
            margin-bottom: 10px;
            transition: all 0.3s;
          }
          
          .step.active .step-number {
            background: #00d4ff;
            color: #1a1a2e;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
          }
          
          .step.completed .step-number {
            background: #00d4ff;
            color: #1a1a2e;
          }
          
          .step-label {
            font-size: 12px;
            color: #888;
            text-align: center;
          }
          
          .step.active .step-label {
            color: #00d4ff;
          }
          
          .wizard-content {
            min-height: 300px;
            margin-bottom: 30px;
          }
          
          .wizard-step {
            display: none;
          }
          
          .wizard-step.active {
            display: block;
            animation: fadeIn 0.3s;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          h2 {
            color: #00d4ff;
            margin-bottom: 20px;
            font-size: 24px;
          }
          
          p {
            color: #ccc;
            margin-bottom: 15px;
            line-height: 1.6;
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
          
          input, select {
            width: 100%;
            padding: 12px;
            background: rgba(0, 212, 255, 0.1);
            border: 1px solid #00d4ff;
            color: #fff;
            border-radius: 5px;
            font-size: 14px;
          }
          
          input::placeholder {
            color: #666;
          }
          
          .radio-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          
          .radio-option {
            display: flex;
            align-items: center;
            padding: 12px;
            border: 1px solid rgba(0, 212, 255, 0.3);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
          }
          
          .radio-option:hover {
            border-color: #00d4ff;
            background: rgba(0, 212, 255, 0.05);
          }
          
          .radio-option input {
            margin-right: 10px;
            width: auto;
            border: 0;
            background: transparent;
          }
          
          .radio-text {
            flex: 1;
            color: #ccc;
          }
          
          .radio-title {
            font-weight: 600;
            color: #00d4ff;
          }
          
          .button-group {
            display: flex;
            gap: 10px;
            margin-top: 30px;
            justify-content: space-between;
          }
          
          button {
            padding: 12px 30px;
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
          
          .btn-primary:hover:not(:disabled) {
            background: #00b8d4;
            box-shadow: 0 5px 15px rgba(0, 212, 255, 0.3);
          }
          
          .btn-secondary {
            background: transparent;
            color: #00d4ff;
            border: 1px solid #00d4ff;
          }
          
          .btn-secondary:hover {
            background: rgba(0, 212, 255, 0.1);
          }
          
          button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .info-box {
            background: rgba(0, 212, 255, 0.1);
            border-left: 3px solid #00d4ff;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            color: #ccc;
            font-size: 12px;
          }
          
          .strength-indicator {
            height: 6px;
            background: rgba(0, 212, 255, 0.2);
            border-radius: 3px;
            margin-top: 5px;
            overflow: hidden;
          }
          
          .strength-bar {
            height: 100%;
            background: #ff4444;
            width: 0%;
            transition: all 0.3s;
          }
          
          .strength-bar.fair {
            background: #ffaa00;
            width: 50%;
          }
          
          .strength-bar.good {
            background: #00d4ff;
            width: 75%;
          }
          
          .strength-bar.strong {
            background: #00ff00;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="wizard-container">
          <div class="step-progress">
            <div class="step completed" data-step="1">
              <div class="step-number">✓</div>
              <div class="step-label">Welcome</div>
            </div>
            <div class="step active" data-step="2">
              <div class="step-number">2</div>
              <div class="step-label">PIN Setup</div>
            </div>
            <div class="step" data-step="3">
              <div class="step-number">3</div>
              <div class="step-label">Security Settings</div>
            </div>
            <div class="step" data-step="4">
              <div class="step-number">4</div>
              <div class="step-label">Review & Complete</div>
            </div>
          </div>
          
          <div class="wizard-content">
            <!-- Step 1: Welcome (skipped) -->
            
            <!-- Step 2: PIN Setup -->
            <div class="wizard-step active" data-step="2">
              <h2>🔐 Create Your PIN</h2>
              <p>Set a secure PIN for authentication. This PIN will be required every time you access Sentinel Security.</p>
              
              <div class="info-box">
                💡 PIN Requirements: Minimum 4 digits, no spaces
              </div>
              
              <div class="form-group">
                <label>Enter PIN (4+ digits)</label>
                <input type="password" id="pin" placeholder="Enter 4+ digit PIN" autocomplete="off">
                <div class="strength-indicator">
                  <div class="strength-bar" id="strength-bar"></div>
                </div>
              </div>
              
              <div class="form-group">
                <label>Confirm PIN</label>
                <input type="password" id="pin-confirm" placeholder="Confirm your PIN" autocomplete="off">
              </div>
            </div>
            
            <!-- Step 3: Security Settings -->
            <div class="wizard-step" data-step="3">
              <h2>🛡️ Security Settings</h2>
              
              <div class="form-group">
                <label>Firewall Policy</label>
                <div class="radio-group">
                  <div class="radio-option">
                    <input type="radio" name="firewall-policy" value="default-deny" checked>
                    <div class="radio-text">
                      <div class="radio-title">🔒 Maximum Security (Default-Deny)</div>
                      <div style="font-size: 11px; color: #999;">Block all traffic by default. Whitelist allowed applications.</div>
                    </div>
                  </div>
                  <div class="radio-option">
                    <input type="radio" name="firewall-policy" value="balanced">
                    <div class="radio-text">
                      <div class="radio-title">⚖️ Balanced</div>
                      <div style="font-size: 11px; color: #999;">Standard protection with common ports allowed.</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="form-group" style="margin-top: 30px;">
                <label>USB Device Policy</label>
                <div class="radio-group">
                  <div class="radio-option">
                    <input type="radio" name="usb-policy" value="block-all" checked>
                    <div class="radio-text">
                      <div class="radio-title">🚫 Block All USB</div>
                      <div style="font-size: 11px; color: #999;">All USB ports blocked by default. Requires authentication to use.</div>
                    </div>
                  </div>
                  <div class="radio-option">
                    <input type="radio" name="usb-policy" value="auth-required">
                    <div class="radio-text">
                      <div class="radio-title">🔑 Authentication Required</div>
                      <div style="font-size: 11px; color: #999;">USB devices blocked until you authenticate.</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="form-group" style="margin-top: 30px;">
                <label>
                  <input type="checkbox" id="enable-mfa" style="width: auto; margin-right: 10px;">
                  Enable Multi-Factor Authentication (MFA)
                </label>
                <p style="font-size: 11px; color: #999; margin-top: 5px;">Optional: Add TOTP-based MFA for additional security</p>
              </div>
            </div>
            
            <!-- Step 4: Review & Complete -->
            <div class="wizard-step" data-step="4">
              <h2>✅ Setup Complete</h2>
              <p>Your Sentinel Security configuration has been completed successfully.</p>
              
              <div class="info-box">
                <strong>Your settings:</strong><br>
                • Firewall Policy: <span id="summary-firewall"></span><br>
                • USB Protection: <span id="summary-usb"></span><br>
                • MFA Status: <span id="summary-mfa"></span>
              </div>
              
              <p>Your system is now protected with maximum security settings.</p>
              <p><strong>Important:</strong> Remember your PIN - you'll need it every time you access Sentinel Security.</p>
            </div>
          </div>
          
          <div class="button-group">
            <button class="btn-secondary" id="btn-prev" style="display: none;">← PREVIOUS</button>
            <button class="btn-primary" id="btn-next">NEXT →</button>
          </div>
        </div>
        
        <script>
          let currentStep = 2;
          const maxSteps = 4;
          
          function showStep(step) {
            // Hide all steps
            document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
            
            // Show current step
            document.querySelector(\`[data-step="\${step}"].wizard-step\`).classList.add('active');
            document.querySelector(\`[data-step="\${step}"].step\`).classList.add('active');
            
            currentStep = step;
            updateButtons();
          }
          
          function updateButtons() {
            const prevBtn = document.getElementById('btn-prev');
            const nextBtn = document.getElementById('btn-next');
            
            prevBtn.style.display = currentStep > 2 ? 'block' : 'none';
            nextBtn.textContent = currentStep === maxSteps ? 'COMPLETE ✓' : 'NEXT →';
          }
          
          // PIN strength calculator
          document.getElementById('pin').addEventListener('input', (e) => {
            const pin = e.target.value;
            const strengthBar = document.getElementById('strength-bar');
            
            let strength = '';
            if (pin.length < 4) strength = '';
            else if (pin.length < 6) strength = 'fair';
            else if (pin.length < 8) strength = 'good';
            else strength = 'strong';
            
            strengthBar.className = 'strength-bar ' + strength;
          });
          
          // Next button handler
          document.getElementById('btn-next').addEventListener('click', () => {
            if (currentStep === 2) {
              // Validate PIN
              const pin = document.getElementById('pin').value;
              const pinConfirm = document.getElementById('pin-confirm').value;
              
              if (!pin || pin.length < 4) {
                alert('PIN must be at least 4 digits');
                return;
              }
              
              if (pin !== pinConfirm) {
                alert('PINs do not match');
                return;
              }
              
              window.setupAPI.setPin(pin);
              showStep(3);
            } else if (currentStep === 3) {
              // Save settings
              const firewallPolicy = document.querySelector('input[name="firewall-policy"]:checked').value;
              const usbPolicy = document.querySelector('input[name="usb-policy"]:checked').value;
              const mfaEnabled = document.getElementById('enable-mfa').checked;
              
              // Update summary
              document.getElementById('summary-firewall').textContent = 
                firewallPolicy === 'default-deny' ? 'Default-Deny (Maximum Security)' : 'Balanced';
              document.getElementById('summary-usb').textContent = 
                usbPolicy === 'block-all' ? 'Block All USB (Requires Authentication)' : 'Authentication Required';
              document.getElementById('summary-mfa').textContent = 
                mfaEnabled ? 'Enabled' : 'Disabled';
              
              window.setupAPI.saveSecurity({
                firewallPolicy,
                usbPolicy,
                mfaEnabled
              });
              
              showStep(4);
            } else if (currentStep === 4) {
              // Complete setup
              window.setupAPI.completeSetup();
            }
          });
          
          // Previous button handler
          document.getElementById('btn-prev').addEventListener('click', () => {
            showStep(currentStep - 1);
          });
          
          // Initialize
          updateButtons();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Create first-run setup window
   */
  createSetupWindow() {
    const { BrowserWindow } = require('electron');
    const path = require('path');

    const setupWindow = new BrowserWindow({
      width: 800,
      height: 900,
      alwaysOnTop: true,
      resizable: false,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        sandbox: true,
        preload: path.join(__dirname, 'setup-preload.js')
      }
    });

    const setupHTML = this.generateSetupWizardHTML();
    setupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(setupHTML)}`);

    return setupWindow;
  }

  /**
   * Save PIN
   */
  savePIN(pin) {
    try {
      this.configManager?.setConfig('auth.pin', pin);
      this.log('✓ PIN configured');
      this.forensicsLogger?.log('setup:pin-configured', { timestamp: new Date().toISOString() });
    } catch (err) {
      this.error(`Failed to save PIN: ${err.message}`);
    }
  }

  /**
   * Save security settings
   */
  saveSecuritySettings(settings) {
    try {
      this.configManager?.setConfig('setup.firewall.policy', settings.firewallPolicy);
      this.configManager?.setConfig('setup.usb.policy', settings.usbPolicy);
      this.configManager?.setConfig('setup.mfa.enabled', settings.mfaEnabled);

      if (settings.mfaEnabled) {
        const secret = crypto.randomBytes(32).toString('base64');
        this.authService?.enableMFA();
      }

      this.log('✓ Security settings configured');
      this.forensicsLogger?.log('setup:security-configured', settings);
    } catch (err) {
      this.error(`Failed to save settings: ${err.message}`);
    }
  }

  /**
   * Complete first-run setup
   */
  completeSetup() {
    try {
      this.configManager?.setConfig('portal.initialized', true);
      this.configManager?.setConfig('setup.completed', true);
      this.configManager?.setConfig('setup.completedAt', new Date().toISOString());

      this.log('✓ First-run setup completed');
      this.forensicsLogger?.log('setup:completed', {
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (err) {
      this.error(`Failed to complete setup: ${err.message}`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = FirstRunSetupService;
