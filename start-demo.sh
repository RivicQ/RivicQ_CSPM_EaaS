#!/bin/bash

echo "🚀 Starting Rivic Q-Runtime Banking Demo..."
echo "📅 Date: $(date)"
echo "📂 Working directory: $(pwd)"

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Start the demo application
    echo "🏦 Starting banking demo on http://localhost:3000"
    node dist/demo-banking-app/app.js
else
    echo "❌ Build failed!"
    exit 1
fi
