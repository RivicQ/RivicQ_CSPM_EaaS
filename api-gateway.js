const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            pipeline: 'active',
            christmas: true,
            timestamp: new Date().toISOString(),
            services: {
                website: 'http://localhost:4000',
                demo: 'http://localhost:3000',
                monitoring: 'http://localhost:3001'
            }
        }));
        return;
    }
    
    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>🚀 Rivic Pipeline Control Center</title>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            margin: 0;
            min-height: 100vh;
        }
        .container { max-width: 1000px; margin: 0 auto; text-align: center; }
        .header { margin-bottom: 40px; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .christmas { font-size: 1.5rem; margin: 20px 0; }
        .pipeline { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .stage { 
            background: rgba(255,255,255,0.1); 
            padding: 30px; 
            border-radius: 20px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .stage h3 { margin: 0 0 15px 0; color: #f59e0b; font-size: 1.3rem; }
        .stage p { margin-bottom: 20px; line-height: 1.6; }
        .stage a { 
            display: inline-block; 
            background: linear-gradient(45deg, #3b82f6, #8b5cf6); 
            color: white; 
            padding: 12px 24px; 
            border-radius: 25px; 
            text-decoration: none; 
            margin: 5px;
            transition: all 0.3s ease;
            font-weight: 600;
        }
        .stage a:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4); 
        }
        .status { 
            background: rgba(16,185,129,0.2); 
            padding: 20px; 
            border-radius: 15px; 
            margin: 30px 0;
            border: 1px solid rgba(16,185,129,0.3);
        }
        .status h3 { color: #10b981; margin-bottom: 10px; }
        .metrics-summary {
            background: rgba(245,158,11,0.2);
            padding: 20px;
            border-radius: 15px;
            margin: 30px 0;
            border: 1px solid rgba(245,158,11,0.3);
        }
        .launch-info {
            background: rgba(220,38,38,0.2);
            padding: 20px;
            border-radius: 15px;
            margin: 30px 0;
            border: 1px solid rgba(220,38,38,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Rivic Q-Runtime Pipeline Control Center</h1>
            <div class="christmas">🎄 Christmas Launch: December 25, 2025 🎁</div>
        </div>
        
        <div class="launch-info">
            <h3>🎯 15-Year Veteran Engineering: Final Deadline Execution</h3>
            <p><strong>Mission:</strong> Complete go-to-market strategy with seamless website-to-demo pipeline</p>
            <p><strong>Target:</strong> €10M ARR within 18 months serving EU banking sector</p>
        </div>
        
        <div class="status">
            <h3>✅ Pipeline Status: FULLY OPERATIONAL</h3>
            <p>Complete end-to-end customer journey from discovery to production deployment</p>
            <p><strong>Launch Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="pipeline">
            <div class="stage">
                <h3>🌐 Stage 1: Marketing Website</h3>
                <p>SaaS homepage with Christmas theme, pricing tiers, and lead generation</p>
                <a href="http://localhost:4000" target="_blank">🎨 Visit Website</a>
            </div>
            
            <div class="stage">
                <h3>🏦 Stage 2: Live Banking Demo</h3>
                <p>Interactive quantum-safe banking simulation with real-time CBOM</p>
                <a href="http://localhost:3000" target="_blank">🚀 Try Demo</a>
            </div>
            
            <div class="stage">
                <h3>📊 Stage 3: Analytics</h3>
                <p>Real-time pipeline monitoring and customer journey analytics</p>
                <a href="http://localhost:3001" target="_blank">📈 View Metrics</a>
            </div>
        </div>
        
        <div class="metrics-summary">
            <h3>📈 Go-to-Market Strategy Targets</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
                <div><strong>Q1:</strong> €100K ARR</div>
                <div><strong>Q2:</strong> €500K ARR</div>
                <div><strong>Q3:</strong> €2M ARR</div>
                <div><strong>Q4:</strong> €5M ARR</div>
            </div>
        </div>
        
        <div style="background: rgba(139,92,246,0.2); padding: 20px; border-radius: 15px; border: 1px solid rgba(139,92,246,0.3);">
            <h3>🎁 Customer Journey Pipeline</h3>
            <p><strong>Discovery</strong> → Marketing Website → <strong>Demo Request</strong> → Live Banking Demo → <strong>Trial Signup</strong> → Premium Access → <strong>Enterprise</strong> → Production Deployment</p>
        </div>
    </div>
</body>
</html>
        `);
        return;
    }
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(5000, () => {
    console.log('🔗 API Gateway running at http://localhost:5000');
});
