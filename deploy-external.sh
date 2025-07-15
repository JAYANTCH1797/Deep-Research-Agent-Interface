#!/bin/bash

# External Access Deployment Script
set -e

echo "🌐 Deep Research Agent - External Access Deployment"
echo "=================================================="

# Function to display help
show_help() {
    echo "Usage: ./deploy-external.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  local-external  Start with external access on local network"
    echo "  ngrok          Start with ngrok tunnel (requires ngrok)"
    echo "  cloudflare     Start with Cloudflare tunnel (requires cloudflared)"
    echo "  configure      Configure external access settings"
    echo "  status         Show current deployment status"
    echo "  stop           Stop all services"
    echo "  help           Show this help message"
    echo ""
}

# Function to get local IP address
get_local_ip() {
    # Try different methods to get local IP
    if command -v ifconfig &> /dev/null; then
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    elif command -v ip &> /dev/null; then
        LOCAL_IP=$(ip route get 8.8.8.8 | grep -oP 'src \K\S+')
    else
        # Fallback for macOS
        LOCAL_IP=$(route get default | grep interface | awk '{print $2}' | xargs ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
    fi
    
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP="localhost"
    fi
    
    echo "$LOCAL_IP"
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to find available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    
    while ! check_port $port; do
        port=$((port + 1))
        if [ $port -gt $((start_port + 100)) ]; then
            echo "Error: Could not find available port starting from $start_port"
            exit 1
        fi
    done
    
    echo $port
}

# Function to setup environment for external access
setup_external_env() {
    echo "⚙️ Setting up environment for external access..."
    
    # Get local IP
    LOCAL_IP=$(get_local_ip)
    
    # Find available ports
    BACKEND_PORT=$(find_available_port 8000)
    FRONTEND_PORT=$(find_available_port 3000)
    
    # Read existing OpenAI API key from .env file if it exists
    if [ -f .env ]; then
        source .env
    fi
    
    # Create external environment file
    cat > .env.external << EOL
# Deep Research Agent External Environment

# Demo mode (set to false for production with API keys)
DEMO_MODE=false

# OpenAI API Key (required for production mode)
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}

# External access configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=$BACKEND_PORT
FRONTEND_HOST=0.0.0.0
FRONTEND_PORT=$FRONTEND_PORT

# Local network IP
LOCAL_IP=$LOCAL_IP

# API URL for frontend
VITE_API_URL=http://$LOCAL_IP:$BACKEND_PORT

# CORS origins (add your domain/IP here)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://$LOCAL_IP:$FRONTEND_PORT,http://$LOCAL_IP:$BACKEND_PORT

# Development settings
NODE_ENV=production
EOL

    echo "✅ External environment configured!"
    echo "   Local IP: $LOCAL_IP"
    echo "   Backend Port: $BACKEND_PORT"
    echo "   Frontend Port: $FRONTEND_PORT"
    
    # Export variables for current session
    export BACKEND_PORT FRONTEND_PORT LOCAL_IP
}

# Function to start with local network access
start_local_external() {
    echo "🏠 Starting with local network access..."
    
    setup_external_env
    source .env.external
    
    # Stop any existing services
    pkill -f "uvicorn.*api:app" || true
    pkill -f "vite.*dev" || true
    
    # Start backend
    echo "🐍 Starting backend on $LOCAL_IP:$BACKEND_PORT..."
    cd backend
    # Export environment variables for the backend process
    export DEMO_MODE=false
    export OPENAI_API_KEY="${OPENAI_API_KEY}"
    export BACKEND_HOST="${BACKEND_HOST}"
    export BACKEND_PORT="${BACKEND_PORT}"
    export CORS_ORIGINS="${CORS_ORIGINS}"
    
    python3 -m uvicorn api:app --host $BACKEND_HOST --port $BACKEND_PORT --reload > ../backend-external.log 2>&1 &
    echo $! > ../backend-external.pid
    cd ..
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://$LOCAL_IP:$BACKEND_PORT/ > /dev/null 2>&1; then
            echo "✅ Backend started successfully"
            break
        fi
        sleep 1
    done
    
    # Update Vite config for external access
    cat > vite.config.external.ts << EOL
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "./src",
      "@/components": "./components",
      "@/services": "./services",
      "@/styles": "./styles",
    },
  },
  server: {
    host: '$FRONTEND_HOST',
    port: $FRONTEND_PORT,
    proxy: {
      '/api': {
        target: 'http://$LOCAL_IP:$BACKEND_PORT',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  preview: {
    host: '$FRONTEND_HOST',
    port: $FRONTEND_PORT,
  },
})
EOL
    
    # Start frontend
    echo "⚛️ Starting frontend on $LOCAL_IP:$FRONTEND_PORT..."
    npx vite --config vite.config.external.ts > frontend-external.log 2>&1 &
    echo $! > frontend-external.pid
    
    # Wait for frontend to start
    sleep 5
    
    echo ""
    echo "🎉 External deployment started successfully!"
    echo "=================================================="
    echo "🌐 Access URLs:"
    echo "   Frontend: http://$LOCAL_IP:$FRONTEND_PORT"
    echo "   Backend API: http://$LOCAL_IP:$BACKEND_PORT"
    echo "   Health Check: http://$LOCAL_IP:$BACKEND_PORT/health"
    echo ""
    echo "📱 Mobile/External Access:"
    echo "   Share this URL: http://$LOCAL_IP:$FRONTEND_PORT"
    echo ""
    echo "🔧 Management:"
    echo "   Status: ./deploy-external.sh status"
    echo "   Stop: ./deploy-external.sh stop"
    echo ""
    echo "📋 Logs:"
    echo "   Backend: tail -f backend-external.log"
    echo "   Frontend: tail -f frontend-external.log"
}

# Function to start with ngrok tunnel
start_ngrok() {
    echo "🚇 Starting with ngrok tunnel..."
    
    # Check if ngrok is installed
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrok is not installed. Please install it first:"
        echo "   brew install ngrok  # macOS"
        echo "   Or download from: https://ngrok.com/download"
        exit 1
    fi
    
    # Start local external first
    start_local_external
    
    # Start ngrok tunnels
    echo "🚇 Starting ngrok tunnels..."
    
    # Backend tunnel
    ngrok http $BACKEND_PORT --log=stdout > ngrok-backend.log 2>&1 &
    echo $! > ngrok-backend.pid
    
    # Frontend tunnel  
    ngrok http $FRONTEND_PORT --log=stdout > ngrok-frontend.log 2>&1 &
    echo $! > ngrok-frontend.pid
    
    # Wait for ngrok to start
    sleep 5
    
    # Extract URLs from ngrok logs
    BACKEND_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io' | head -1)
    FRONTEND_URL=$(curl -s http://localhost:4041/api/tunnels | grep -o 'https://[^"]*\.ngrok\.io' | head -1)
    
    echo ""
    echo "🎉 Ngrok tunnels started!"
    echo "========================="
    echo "🌐 Public URLs:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend API: $BACKEND_URL"
    echo ""
    echo "📱 Share these URLs with anyone worldwide!"
}

# Function to start with Cloudflare tunnel
start_cloudflare() {
    echo "☁️ Starting with Cloudflare tunnel..."
    
    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
        echo "❌ cloudflared is not installed. Please install it first:"
        echo "   brew install cloudflared  # macOS"
        echo "   Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
        exit 1
    fi
    
    # Start local external first
    start_local_external
    
    # Start Cloudflare tunnels
    echo "☁️ Starting Cloudflare tunnels..."
    
    # Backend tunnel
    cloudflared tunnel --url http://localhost:$BACKEND_PORT > cloudflare-backend.log 2>&1 &
    echo $! > cloudflare-backend.pid
    
    # Frontend tunnel
    cloudflared tunnel --url http://localhost:$FRONTEND_PORT > cloudflare-frontend.log 2>&1 &
    echo $! > cloudflare-frontend.pid
    
    # Wait for tunnels to start
    sleep 10
    
    # Extract URLs from logs
    BACKEND_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' cloudflare-backend.log | head -1)
    FRONTEND_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' cloudflare-frontend.log | head -1)
    
    echo ""
    echo "🎉 Cloudflare tunnels started!"
    echo "=============================="
    echo "🌐 Public URLs:"
    echo "   Frontend: $FRONTEND_URL"
    echo "   Backend API: $BACKEND_URL"
    echo ""
    echo "📱 Share these URLs with anyone worldwide!"
}

# Function to show status
show_status() {
    echo "📊 External Deployment Status:"
    echo "=============================="
    
    # Check backend
    if [ -f backend-external.pid ] && kill -0 $(cat backend-external.pid) 2>/dev/null; then
        echo "🐍 Backend: ✅ Running (PID: $(cat backend-external.pid))"
        if [ -f .env.external ]; then
            source .env.external
            echo "   URL: http://$LOCAL_IP:$BACKEND_PORT"
        fi
    else
        echo "🐍 Backend: ❌ Not running"
    fi
    
    # Check frontend
    if [ -f frontend-external.pid ] && kill -0 $(cat frontend-external.pid) 2>/dev/null; then
        echo "⚛️ Frontend: ✅ Running (PID: $(cat frontend-external.pid))"
        if [ -f .env.external ]; then
            source .env.external
            echo "   URL: http://$LOCAL_IP:$FRONTEND_PORT"
        fi
    else
        echo "⚛️ Frontend: ❌ Not running"
    fi
    
    # Check ngrok
    if [ -f ngrok-backend.pid ] && kill -0 $(cat ngrok-backend.pid) 2>/dev/null; then
        echo "🚇 Ngrok: ✅ Running"
        echo "   Dashboard: http://localhost:4040"
    fi
    
    # Check Cloudflare
    if [ -f cloudflare-backend.pid ] && kill -0 $(cat cloudflare-backend.pid) 2>/dev/null; then
        echo "☁️ Cloudflare: ✅ Running"
    fi
    
    echo ""
    echo "📋 Log Files:"
    echo "   Backend: tail -f backend-external.log"
    echo "   Frontend: tail -f frontend-external.log"
    if [ -f ngrok-backend.log ]; then
        echo "   Ngrok: tail -f ngrok-backend.log"
    fi
    if [ -f cloudflare-backend.log ]; then
        echo "   Cloudflare: tail -f cloudflare-backend.log"
    fi
}

# Function to stop all services
stop_services() {
    echo "🛑 Stopping all external services..."
    
    # Stop backend
    if [ -f backend-external.pid ]; then
        PID=$(cat backend-external.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "✅ Backend stopped"
        fi
        rm -f backend-external.pid
    fi
    
    # Stop frontend
    if [ -f frontend-external.pid ]; then
        PID=$(cat frontend-external.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "✅ Frontend stopped"
        fi
        rm -f frontend-external.pid
    fi
    
    # Stop ngrok
    if [ -f ngrok-backend.pid ]; then
        kill $(cat ngrok-backend.pid) 2>/dev/null || true
        rm -f ngrok-backend.pid
        echo "✅ Ngrok backend stopped"
    fi
    
    if [ -f ngrok-frontend.pid ]; then
        kill $(cat ngrok-frontend.pid) 2>/dev/null || true
        rm -f ngrok-frontend.pid
        echo "✅ Ngrok frontend stopped"
    fi
    
    # Stop Cloudflare
    if [ -f cloudflare-backend.pid ]; then
        kill $(cat cloudflare-backend.pid) 2>/dev/null || true
        rm -f cloudflare-backend.pid
        echo "✅ Cloudflare backend stopped"
    fi
    
    if [ -f cloudflare-frontend.pid ]; then
        kill $(cat cloudflare-frontend.pid) 2>/dev/null || true
        rm -f cloudflare-frontend.pid
        echo "✅ Cloudflare frontend stopped"
    fi
    
    # Cleanup any remaining processes
    pkill -f "uvicorn.*api:app" || true
    pkill -f "vite.*dev" || true
    pkill -f "ngrok" || true
    pkill -f "cloudflared" || true
    
    echo "✅ All services stopped"
}

# Function to configure external access
configure_external() {
    echo "🔧 Configuring External Access"
    echo "=============================="
    
    LOCAL_IP=$(get_local_ip)
    
    echo "Current configuration:"
    echo "  Local IP: $LOCAL_IP"
    echo ""
    echo "External access options:"
    echo "  1. Local Network Access - Access from devices on same WiFi/network"
    echo "  2. Ngrok Tunnel - Public internet access via ngrok.com"
    echo "  3. Cloudflare Tunnel - Public internet access via Cloudflare"
    echo ""
    echo "For production deployment, consider:"
    echo "  - VPS/Cloud hosting (AWS, DigitalOcean, etc.)"
    echo "  - Domain name with SSL certificate"
    echo "  - Proper firewall and security configuration"
    echo ""
    echo "Run './deploy-external.sh local-external' to start with local network access"
}

# Main script logic
case "${1:-help}" in
    local-external)
        start_local_external
        ;;
    ngrok)
        start_ngrok
        ;;
    cloudflare)
        start_cloudflare
        ;;
    configure)
        configure_external
        ;;
    status)
        show_status
        ;;
    stop)
        stop_services
        ;;
    help|*)
        show_help
        ;;
esac 