@echo off
title 🛠️ Agent Toolchain Dashboard

:: Use WSL to execute the background boot script. 
:: The bash script will handle starting the background server and popping open the browser on Windows.
echo Starting Agent Toolchain Dashboard...
wsl -e bash -c "chmod +x ~/projects/agent-toolchain/start-dashboard.sh && ~/projects/agent-toolchain/start-dashboard.sh"

:: Exit the command window immediately after executing
exit
