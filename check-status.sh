#!/bin/bash

# Quick status check for the marketing pipeline
echo "🔍 Checking Rivic Pipeline Status..."
echo "=================================="

check_service() {
    local name=$1
    local port=$2
    local url="http://localhost:$port"
    
    if curl -f "$url" >/dev/null 2>&1; then
        echo "✅ $name (port $port): RUNNING"
        return 0
    else
        echo "❌ $name (port $port): NOT RESPONDING"
        return 1
    fi
}

echo ""
echo "🌐 Service Status:"
check_service "Marketing Website" 4000
check_service "Banking Demo" 3000
check_service "Analytics Dashboard" 3001
check_service "API Gateway" 5000

echo ""
echo "📋 Quick Access URLs:"
echo "🌐 Marketing: http://localhost:4000"
echo "🏦 Demo: http://localhost:3000"
echo "📊 Analytics: http://localhost:3001"
echo "🔗 Control: http://localhost:5000"
echo ""

# Count running services
running_count=0
for port in 4000 3000 3001 5000; do
    if curl -f "http://localhost:$port" >/dev/null 2>&1; then
        ((running_count++))
    fi
done

if [ $running_count -eq 4 ]; then
    echo "🎉 ALL SYSTEMS OPERATIONAL! Complete pipeline is running!"
    echo "🎄 Ready for Christmas launch! 🎁"
else
    echo "⚠️  $running_count out of 4 services running. Pipeline still starting..."
fi
