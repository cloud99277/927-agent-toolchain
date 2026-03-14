#!/bin/bash

PORT=8927
URL="http://localhost:$PORT"

# Check if the server is already running
if ! pgrep -f "dashboard/server.py" > /dev/null; then
    echo "🚀 Starting Agent Toolchain Dashboard on port $PORT..."
    # Start server in background
    nohup python3 ~/projects/agent-toolchain/dashboard/server.py --port $PORT > /dev/null 2>&1 &
    # Wait a second for it to start
    sleep 1
else
    echo "✅ Dashboard is already running on port $PORT."
fi

echo "🌐 Opening in browser: $URL"
# Use powershell.exe to open the default Windows browser from within WSL
powershell.exe -Command "Start-Process '$URL'"
