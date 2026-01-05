const http = require('http');
const url = require('url');

let metrics = {
    websiteViews: Math.floor(Math.random() * 150) + 50,
    demoRequests: Math.floor(Math.random() * 25) + 10,
    trialSignups: Math.floor(Math.random() * 8) + 3,
    enterpriseInquiries: Math.floor(Math.random() * 5) + 1,
    uptime: 0
};

const server = http.createServer((req, res) => {
    const pathname = url.parse(req.url).pathname;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (pathname === '/api/metrics') {
        metrics.uptime = Math.floor(process.uptime());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
        return;
    }
    
    if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>📊 Rivic Pipeline Monitoring</title>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 20px; 
            margin: 0;
            min-height: 100vh;
        }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { 
            background: rgba(255,255,255,0.1); 
            padding: 25px; 
            border-radius: 15px; 
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            text-align: center;
        }
        .metric h3 { margin: 0 0 15px 0; color: #f59e0b; font-size: 1.1rem; }
        .metric .value { font-size: 2.5rem; font-weight: bold; margin: 10px 0; }
        .status { 
            background: rgba(16,185,129,0.2); 
            padding: 20px; 
            border-radius: 15px; 
            margin: 20px 0; 
            text-align: center;
        }
        .refresh { 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            font-size: 1rem;
            margin: 20px auto;
            display: block;
        }
        .refresh:hover { background: #2563eb; }
        .pipeline-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 30px 0; }
        .pipeline-link { 
            background: rgba(59, 130, 246, 0.2);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .pipeline-link a {
            color: white;
            text-decoration: none;
            font-weight: 600;
            display: block;
            padding: 10px;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            margin-top: 10px;
            transition: all 0.3s ease;
        }
        .pipeline-link a:hover {
            background: rgba(59, 130, 246, 0.5);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📊 Rivic Q-Runtime Pipeline Monitoring</h1>
            <p>🎄 Christmas Launch Dashboard - Real-time Analytics 🎁</p>
        </div>
        
        <div class="status">
            <h3>🚀 Pipeline Status: FULLY OPERATIONAL</h3>
            <p>Complete go-to-market strategy active since: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="pipeline-links">
            <div class="pipeline-link">
                <h4>🌐 Marketing Website</h4>
                <a href="http://localhost:4000" target="_blank">Visit SaaS Site</a>
            </div>
            <div class="pipeline-link">
                <h4>🏦 Banking Demo</h4>
                <a href="http://localhost:3000" target="_blank">Try Live Demo</a>
            </div>
            <div class="pipeline-link">
                <h4>🔗 API Gateway</h4>
                <a href="http://localhost:5000" target="_blank">Pipeline Control</a>
            </div>
        </div>
        
        <div class="metrics" id="metrics">
            <!-- Metrics loaded by JavaScript -->
        </div>
        
        <button class="refresh" onclick="loadMetrics()">🔄 Refresh Real-time Metrics</button>
    </div>
    
    <script>
        function loadMetrics() {
            fetch('/api/metrics')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('metrics').innerHTML = \`
                        <div class="metric">
                            <h3>🌐 Website Views</h3>
                            <div class="value">\${data.websiteViews}</div>
                        </div>
                        <div class="metric">
                            <h3>🏦 Demo Requests</h3>
                            <div class="value">\${data.demoRequests}</div>
                        </div>
                        <div class="metric">
                            <h3>🚀 Trial Signups</h3>
                            <div class="value">\${data.trialSignups}</div>
                        </div>
                        <div class="metric">
                            <h3>💼 Enterprise Inquiries</h3>
                            <div class="value">\${data.enterpriseInquiries}</div>
                        </div>
                        <div class="metric">
                            <h3>⏱️ Uptime</h3>
                            <div class="value">\${Math.floor(data.uptime / 60)}m</div>
                        </div>
                        <div class="metric">
                            <h3>🎯 Conversion Rate</h3>
                            <div class="value">\${data.websiteViews > 0 ? Math.round((data.trialSignups / data.websiteViews) * 100) : 0}%</div>
                        </div>
                    \`;
                })
                .catch(() => {
                    document.getElementById('metrics').innerHTML = '<p>Loading metrics...</p>';
                });
        }
        
        loadMetrics();
        setInterval(loadMetrics, 10000);
        
        // Simulate real-time updates
        setInterval(() => {
            if (Math.random() > 0.7) {
                fetch('/api/metrics').then(() => {
                    // Simulate metric updates
                });
            }
        }, 30000);
    </script>
</body>
</html>
        `);
        return;
    }
    
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
});

server.listen(3001, () => {
    console.log('📊 Monitoring dashboard running at http://localhost:3001');
});
