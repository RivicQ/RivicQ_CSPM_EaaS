/**
 * Demo Banking Application
 * Simulates a typical banking service that will be upgraded to quantum-safe crypto
 */

import express from 'express';
import * as crypto from 'crypto';
import { CryptoInterceptor } from '../src/interceptor/runtime';
import { CBOMGenerator } from '../src/cbom/generator';

interface BankingTransaction {
  id: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  timestamp: number;
  signature?: string;
}

interface KYCData {
  customerId: string;
  documentHash: string;
  encryptedData: Buffer;
  algorithm: string;
}

export class BankingDemoApp {
  private app: express.Application;
  private interceptor: CryptoInterceptor;
  private cbomGenerator: CBOMGenerator;
  private transactions: BankingTransaction[] = [];
  private kycData: KYCData[] = [];

  constructor() {
    this.app = express();
    this.interceptor = new CryptoInterceptor();
    this.cbomGenerator = new CBOMGenerator();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.static('public'));
    
    // CORS for demo purposes
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  private setupRoutes(): void {
    // Dashboard
    this.app.get('/', (req, res) => {
      res.send(this.generateDashboard());
    });

    // Banking operations
    this.app.post('/api/transaction', this.handleTransaction.bind(this));
    this.app.post('/api/kyc', this.handleKYC.bind(this));
    this.app.get('/api/transactions', this.getTransactions.bind(this));
    
    // Crypto monitoring
    this.app.get('/api/crypto-metrics', this.getCryptoMetrics.bind(this));
    this.app.get('/api/cbom', this.getCBOM.bind(this));
    this.app.get('/api/compliance', this.getCompliance.bind(this));
    
    // Demo controls
    this.app.post('/api/enable-quantum-safe', this.enableQuantumSafe.bind(this));
    this.app.post('/api/disable-quantum-safe', this.disableQuantumSafe.bind(this));
  }

  private async handleTransaction(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { fromAccount, toAccount, amount } = req.body;
      
      const transaction: BankingTransaction = {
        id: crypto.randomUUID(),
        fromAccount,
        toAccount,
        amount,
        timestamp: Date.now()
      };

      // Sign transaction with RSA (will be intercepted if quantum-safe mode is enabled)
      const signature = this.signTransaction(transaction);
      transaction.signature = signature;

      this.transactions.push(transaction);
      
      console.log(`💰 Transaction processed: ${transaction.id}`);
      res.json({ success: true, transaction });
    } catch (error) {
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Transaction failed' });
    }
  }

  private async handleKYC(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { customerId, documentData } = req.body;
      
      // Encrypt KYC data with AES-256 (already quantum-safe)
      const encryptedData = this.encryptKYCData(documentData);
      
      const kyc: KYCData = {
        customerId,
        documentHash: crypto.createHash('sha256').update(documentData).digest('hex'),
        encryptedData: encryptedData.data,
        algorithm: encryptedData.algorithm
      };

      this.kycData.push(kyc);
      
      console.log(`📋 KYC data processed for customer: ${customerId}`);
      res.json({ success: true, customerId, hash: kyc.documentHash });
    } catch (error) {
      console.error('KYC error:', error);
      res.status(500).json({ error: 'KYC processing failed' });
    }
  }

  private signTransaction(transaction: BankingTransaction): string {
    const data = JSON.stringify({
      id: transaction.id,
      fromAccount: transaction.fromAccount,
      toAccount: transaction.toAccount,
      amount: transaction.amount,
      timestamp: transaction.timestamp
    });

    // This RSA operation will be intercepted and upgraded to Dilithium
    const result = this.interceptor.interceptCryptoCall(
      'RSA_sign',
      'rsa-2048-sign',
      Buffer.from(data, 'utf8')
    );

    return result.result.toString('base64');
  }

  private encryptKYCData(data: string): { data: Buffer; algorithm: string } {
    // This encryption will be monitored but AES-256 is already quantum-safe
    const result = this.interceptor.interceptCryptoCall(
      'AES_encrypt',
      'aes-256-gcm',
      Buffer.from(data, 'utf8')
    );

    return {
      data: result.result,
      algorithm: result.algorithm
    };
  }

  private getTransactions(req: express.Request, res: express.Response): void {
    res.json({
      total: this.transactions.length,
      transactions: this.transactions.slice(-10) // Last 10 transactions
    });
  }

  private getCryptoMetrics(req: express.Request, res: express.Response): void {
    const metrics = this.interceptor.getMetrics();
    res.json(metrics);
  }

  private async getCBOM(req: express.Request, res: express.Response): Promise<void> {
    try {
      const cbom = this.interceptor.generateRuntimeCBOM();
      const report = this.cbomGenerator.generateComplianceReport(cbom);
      
      res.json({
        cbom,
        complianceReport: report
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate CBOM' });
    }
  }

  private getCompliance(req: express.Request, res: express.Response): void {
    const alerts = this.interceptor.checkCompliance();
    const metrics = this.interceptor.getMetrics();
    
    res.json({
      quantumReadiness: metrics.quantumReadiness,
      alerts,
      eidas2Compliant: metrics.quantumReadiness >= 90,
      doraCompliant: metrics.quantumReadiness >= 80,
      recommendations: this.generateRecommendations(metrics.quantumReadiness)
    });
  }

  private enableQuantumSafe(req: express.Request, res: express.Response): void {
    this.interceptor.updateConfig({
      namespace: 'banking-demo',
      quantumSafeMode: true,
      cbomEnabled: true,
      algorithms: {
        keyExchange: 'kyber-1024',
        signature: 'dilithium-5'
      },
      compliance: {
        eidas: true,
        dora: true
      }
    });
    
    console.log('🔒 Quantum-safe mode ENABLED');
    res.json({ success: true, mode: 'quantum-safe' });
  }

  private disableQuantumSafe(req: express.Request, res: express.Response): void {
    this.interceptor.updateConfig({
      namespace: 'banking-demo',
      quantumSafeMode: false,
      cbomEnabled: true,
      algorithms: {
        keyExchange: 'kyber-1024',
        signature: 'dilithium-5'
      },
      compliance: {
        eidas: false,
        dora: false
      }
    });
    
    console.log('⚠️ Quantum-safe mode DISABLED (legacy mode)');
    res.json({ success: true, mode: 'legacy' });
  }

  private generateRecommendations(readiness: number): string[] {
    const recommendations = [];
    
    if (readiness < 50) {
      recommendations.push('URGENT: Enable quantum-safe mode immediately');
      recommendations.push('Audit all cryptographic assets in your environment');
    } else if (readiness < 80) {
      recommendations.push('Increase quantum-safe algorithm adoption');
      recommendations.push('Plan migration timeline for remaining legacy crypto');
    } else if (readiness < 90) {
      recommendations.push('Address remaining eIDAS 2.0 compliance gaps');
    } else {
      recommendations.push('Excellent quantum readiness! Maintain current standards');
    }
    
    return recommendations;
  }

  private generateDashboard(): string {
    const metrics = this.interceptor.getMetrics();
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Rivic Q-Runtime Banking Demo</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                text-align: center;
            }
            .header h1 { 
                color: #2c3e50; 
                font-size: 2.5em; 
                margin-bottom: 10px;
                background: linear-gradient(45deg, #667eea, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .subtitle {
                color: #7f8c8d;
                font-size: 1.2em;
            }
            .dashboard {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .card {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
            }
            .card:hover { transform: translateY(-5px); }
            .card h3 {
                color: #2c3e50;
                margin-bottom: 15px;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
            }
            .metric {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .metric-value {
                font-weight: bold;
                color: #27ae60;
            }
            .quantum-status {
                text-align: center;
                font-size: 1.5em;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
            }
            .quantum-enabled {
                background: linear-gradient(45deg, #2ecc71, #27ae60);
                color: white;
            }
            .quantum-disabled {
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                color: white;
            }
            .controls {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin: 20px 0;
            }
            .btn {
                padding: 12px 25px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: inline-block;
            }
            .btn-primary {
                background: linear-gradient(45deg, #3498db, #2980b9);
                color: white;
            }
            .btn-success {
                background: linear-gradient(45deg, #2ecc71, #27ae60);
                color: white;
            }
            .btn-danger {
                background: linear-gradient(45deg, #e74c3c, #c0392b);
                color: white;
            }
            .btn:hover { transform: translateY(-2px); }
            .demo-section {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 20px;
            }
            .form-group {
                margin: 15px 0;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
            }
            .form-group input, .form-group textarea {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 1em;
            }
            .readiness-bar {
                width: 100%;
                height: 20px;
                background: #ecf0f1;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .readiness-fill {
                height: 100%;
                background: linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71);
                transition: width 0.5s ease;
                width: ${metrics.quantumReadiness}%;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Rivic Q-Runtime</h1>
                <p class="subtitle">Quantum-Safe Banking Infrastructure Demo</p>
            </div>

            <div class="dashboard">
                <div class="card">
                    <h3>📊 Crypto Metrics</h3>
                    <div class="metric">
                        <span>Total Interceptions:</span>
                        <span class="metric-value">${metrics.totalInterceptions}</span>
                    </div>
                    <div class="metric">
                        <span>Quantum Upgrades:</span>
                        <span class="metric-value">${metrics.quantumUpgrades}</span>
                    </div>
                    <div class="metric">
                        <span>Legacy Operations:</span>
                        <span class="metric-value">${metrics.legacyOperations}</span>
                    </div>
                    <div class="metric">
                        <span>Quantum Readiness:</span>
                        <span class="metric-value">${metrics.quantumReadiness}%</span>
                    </div>
                    <div class="readiness-bar">
                        <div class="readiness-fill"></div>
                    </div>
                </div>

                <div class="card">
                    <h3>🏛️ Compliance Status</h3>
                    <div class="metric">
                        <span>eIDAS 2.0 (≥90%):</span>
                        <span class="metric-value">${metrics.quantumReadiness >= 90 ? '✅ Compliant' : '❌ Non-compliant'}</span>
                    </div>
                    <div class="metric">
                        <span>DORA (≥80%):</span>
                        <span class="metric-value">${metrics.quantumReadiness >= 80 ? '✅ Compliant' : '❌ Non-compliant'}</span>
                    </div>
                    <div class="metric">
                        <span>Transactions:</span>
                        <span class="metric-value">${this.transactions.length}</span>
                    </div>
                    <div class="metric">
                        <span>KYC Records:</span>
                        <span class="metric-value">${this.kycData.length}</span>
                    </div>
                </div>
            </div>

            <div class="controls">
                <button class="btn btn-success" onclick="enableQuantumSafe()">🔒 Enable Quantum-Safe</button>
                <button class="btn btn-danger" onclick="disableQuantumSafe()">⚠️ Legacy Mode</button>
                <button class="btn btn-primary" onclick="viewCBOM()">📋 View CBOM</button>
            </div>

            <div class="demo-section">
                <h3>💰 Banking Transaction Demo</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <div class="form-group">
                            <label>From Account:</label>
                            <input type="text" id="fromAccount" value="ACC-12345" />
                        </div>
                        <div class="form-group">
                            <label>To Account:</label>
                            <input type="text" id="toAccount" value="ACC-67890" />
                        </div>
                        <div class="form-group">
                            <label>Amount (€):</label>
                            <input type="number" id="amount" value="1000" />
                        </div>
                        <button class="btn btn-primary" onclick="processTransaction()">Process Transaction</button>
                    </div>
                    
                    <div>
                        <div class="form-group">
                            <label>Customer ID:</label>
                            <input type="text" id="customerId" value="CUST-001" />
                        </div>
                        <div class="form-group">
                            <label>KYC Document Data:</label>
                            <textarea id="documentData" rows="3">{"passport": "AB123456", "address": "123 Banking St"}</textarea>
                        </div>
                        <button class="btn btn-primary" onclick="processKYC()">Process KYC</button>
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function enableQuantumSafe() {
                const response = await fetch('/api/enable-quantum-safe', { method: 'POST' });
                if (response.ok) {
                    alert('✅ Quantum-safe mode enabled!');
                    location.reload();
                }
            }

            async function disableQuantumSafe() {
                const response = await fetch('/api/disable-quantum-safe', { method: 'POST' });
                if (response.ok) {
                    alert('⚠️ Switched to legacy mode!');
                    location.reload();
                }
            }

            async function processTransaction() {
                const transaction = {
                    fromAccount: document.getElementById('fromAccount').value,
                    toAccount: document.getElementById('toAccount').value,
                    amount: parseFloat(document.getElementById('amount').value)
                };

                const response = await fetch('/api/transaction', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                });

                if (response.ok) {
                    alert('✅ Transaction processed successfully!');
                    location.reload();
                }
            }

            async function processKYC() {
                const kyc = {
                    customerId: document.getElementById('customerId').value,
                    documentData: document.getElementById('documentData').value
                };

                const response = await fetch('/api/kyc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(kyc)
                });

                if (response.ok) {
                    alert('✅ KYC data processed successfully!');
                    location.reload();
                }
            }

            async function viewCBOM() {
                const response = await fetch('/api/cbom');
                if (response.ok) {
                    const data = await response.json();
                    const newWindow = window.open('', '_blank');
                    newWindow.document.write('<pre>' + JSON.stringify(data, null, 2) + '</pre>');
                }
            }

            // Auto-refresh metrics every 5 seconds
            setInterval(() => {
                if (document.hasFocus()) {
                    location.reload();
                }
            }, 5000);
        </script>
    </body>
    </html>
    `;
  }

  start(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🏦 Banking Demo App running at http://localhost:${port}`);
      console.log('🚀 Open your browser to see the quantum-safe banking demo');
    });
  }
}

// Start the demo if run directly
if (require.main === module) {
  const demo = new BankingDemoApp();
  demo.start();
}
