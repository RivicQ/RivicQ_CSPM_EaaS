const http = require('http');
const url = require('url');

// Simple HTTP server for Rivic Q-Runtime Demo
const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (pathname === '/' || pathname === '/index.html') {
    // Main dashboard
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateDashboard());
  } else if (pathname === '/api/status') {
    // API endpoint
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      quantumSafe: true,
      version: '1.0.0',
      compliance: {
        eidas: 95,
        dora: 90
      }
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

function generateDashboard() {
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
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
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
        .status-online {
            color: #27ae60;
            font-weight: bold;
        }
        .status-quantum {
            background: linear-gradient(45deg, #2ecc71, #27ae60);
            color: white;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            margin: 15px 0;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #ecf0f1;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #e74c3c, #f39c12, #2ecc71);
            transition: width 0.5s ease;
        }
        .btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            padding: 12px 25px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 5px;
            transition: transform 0.3s ease;
        }
        .btn:hover { transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Rivic Q-Runtime</h1>
            <p class="subtitle">Quantum-Safe Banking Infrastructure Demo</p>
            <div class="status-online">● SYSTEM ONLINE</div>
        </div>

        <div class="dashboard">
            <div class="card">
                <h3>🔐 Quantum Safety Status</h3>
                <div class="status-quantum">
                    ✅ QUANTUM-SAFE MODE ACTIVE
                </div>
                <div class="metric">
                    <span>Algorithm:</span>
                    <span class="metric-value">Kyber-1024 + Dilithium-5</span>
                </div>
                <div class="metric">
                    <span>Security Level:</span>
                    <span class="metric-value">NIST Level 5</span>
                </div>
            </div>

            <div class="card">
                <h3>📊 Compliance Metrics</h3>
                <div class="metric">
                    <span>eIDAS 2.0 Compliance:</span>
                    <span class="metric-value">95%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 95%;"></div>
                </div>
                
                <div class="metric">
                    <span>DORA Compliance:</span>
                    <span class="metric-value">90%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 90%;"></div>
                </div>
            </div>

            <div class="card">
                <h3>🏦 Banking Operations</h3>
                <div class="metric">
                    <span>Total Transactions:</span>
                    <span class="metric-value">1,247</span>
                </div>
                <div class="metric">
                    <span>Quantum Upgrades:</span>
                    <span class="metric-value">1,247 (100%)</span>
                </div>
                <div class="metric">
                    <span>Legacy Operations:</span>
                    <span class="metric-value">0</span>
                </div>
                <button class="btn" onclick="simulateTransaction()">🔒 Process Quantum Transaction</button>
            </div>

            <div class="card">
                <h3>📋 CBOM Summary</h3>
                <div class="metric">
                    <span>Crypto Assets:</span>
                    <span class="metric-value">15</span>
                </div>
                <div class="metric">
                    <span>Quantum-Safe:</span>
                    <span class="metric-value">15 (100%)</span>
                </div>
                <div class="metric">
                    <span>Last Updated:</span>
                    <span class="metric-value">Just now</span>
                </div>
                <button class="btn" onclick="viewCBOM()">📄 View CBOM Report</button>
            </div>
        </div>

        <div class="card">
            <h3>🚀 Rivic Q-Runtime Features</h3>
            <ul style="list-style: none; padding: 0;">
                <li style="margin: 10px 0;"><strong>✅ Post-Quantum Cryptography:</strong> ML-KEM (Kyber) and ML-DSA (Dilithium)</li>
                <li style="margin: 10px 0;"><strong>✅ Transparent Migration:</strong> Zero application code changes required</li>
                <li style="margin: 10px 0;"><strong>✅ Real-time CBOM:</strong> CycloneDX 1.6 compliant cryptographic observability</li>
                <li style="margin: 10px 0;"><strong>✅ EU Compliance:</strong> eIDAS 2.0 and DORA regulation ready</li>
                <li style="margin: 10px 0;"><strong>✅ Kubernetes Native:</strong> Cloud-native deployment with operators</li>
            </ul>
        </div>
    </div>

    <script>
        function simulateTransaction() {
            alert('🔒 Quantum-safe transaction processed!\\n\\n' +
                  '✅ RSA-2048 → Kyber-1024 upgrade\\n' +
                  '✅ ECDSA → Dilithium-5 signature\\n' +
                  '✅ CBOM updated automatically');
        }

        function viewCBOM() {
            const cbom = {
                bomFormat: 'CycloneDX',
                specVersion: '1.6',
                components: [
                    {
                        type: 'cryptographic-asset',
                        name: 'kyber-1024',
                        cryptoProperties: {
                            assetType: 'algorithm',
                            algorithmProperties: {
                                variant: 'ML-KEM-1024',
                                nistQuantumSecurityLevel: 5
                            }
                        }
                    }
                ]
            };
            
            const newWindow = window.open('', '_blank');
            newWindow.document.write('<pre style="font-family: monospace; padding: 20px; background: #f5f5f5;">' + 
                                   JSON.stringify(cbom, null, 2) + '</pre>');
        }

        // Auto-refresh status every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                console.log('System status:', status);
            } catch (e) {
                console.log('Status check:', e.message);
            }
        }, 30000);
        
        console.log('🔒 Rivic Q-Runtime Demo loaded successfully!');
    </script>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('🚀 Rivic Q-Runtime Banking Demo started!');
  console.log(`🌐 Server running at http://localhost:${PORT}`);
  console.log('🔒 Quantum-safe banking infrastructure is ONLINE');
  console.log('');
  console.log('✅ Features available:');
  console.log('   - Interactive dashboard');
  console.log('   - Compliance monitoring');  
  console.log('   - CBOM visualization');
  console.log('   - Transaction simulation');
  console.log('');
  console.log('📊 System Status: READY');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down Rivic Q-Runtime demo...');
  server.close(() => {
    console.log('✅ Demo server stopped');
    process.exit(0);
  });
});
