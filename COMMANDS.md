# CryptoBOM SaaS Quick Commands

## From Any Directory:
```bash
# Start CryptoBOM and open dashboard
~/start-cryptobom.sh

# Check status  
~/start-cryptobom.sh status

# Stop server
~/start-cryptobom.sh stop

# Restart server
~/start-cryptobom.sh restart

# Test APIs
~/start-cryptobom.sh test

# Show logs
~/start-cryptobom.sh logs
```

## From CryptoBOM Directory:
```bash
# Go to CryptoBOM directory first
cd ~/cryptobom-saas

# Start server
./run start

# Stop server
./run stop  

# Check status
./run status

# Open dashboard
./run open

# Restart server
./run restart
```

## One-Liner Commands:
```bash
# Start from anywhere
cd ~/cryptobom-saas && go build -o bin/cryptobom-server ./cmd/server/main.go && nohup ./bin/cryptobom-server > server.log 2>&1 &

# Stop from anywhere
pkill -f cryptobom-server

# Check if running
curl -s http://localhost:8080/healthz

# Open dashboard
xdg-open ~/cryptobom-saas/web/demo-dashboard.html
```

## URLs:
- **Server**: http://localhost:8080
- **Dashboard**: file:///home/re1/cryptobom-saas/web/demo-dashboard.html
- **Health Check**: http://localhost:8080/healthz
- **API Base**: http://localhost:8080/api/v1