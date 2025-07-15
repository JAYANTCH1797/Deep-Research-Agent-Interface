#!/bin/bash

# Simple Local Deployment Script (No Docker Required)
set -e

echo "🚀 Deep Research Agent - Simple Local Deployment"
echo "================================================"

# Function to display help
show_help() {
    echo "Usage: ./deploy-local.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  start     Start both frontend and backend"
    echo "  stop      Stop all processes"
    echo "  frontend  Start only frontend"
    echo "  backend   Start only backend"
    echo "  build     Build the frontend for production"
    echo "  status    Show running processes"
    echo "  help      Show this help message"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi
    
    # Check pip
    if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
        echo "❌ pip is not installed. Please install pip first."
        exit 1
    fi
    
    echo "✅ Prerequisites check passed!"
}

# Function to setup environment
setup_env() {
    echo "⚙️ Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        echo "📝 Creating .env file..."
        cat > .env << 'EOL'
# Deep Research Agent Local Environment

# Demo mode (no API keys required)
DEMO_MODE=true

# OpenAI API Key (set this for production mode)
OPENAI_API_KEY=your_openai_api_key_here

# Local development URLs
VITE_API_URL=http://localhost:8000

# Development settings
NODE_ENV=development
EOL
        echo "✅ .env file created with demo mode enabled"
    fi
    
    # Install Node.js dependencies
    echo "📦 Installing frontend dependencies..."
    npm install
    
    # Install Python dependencies
    echo "📦 Installing backend dependencies..."
    if command -v pip3 &> /dev/null; then
        pip3 install -r backend/requirements.txt
    else
        pip install -r backend/requirements.txt
    fi
    
    echo "✅ Environment setup completed!"
}

# Function to start backend
start_backend() {
    echo "🐍 Starting backend server..."
    
    # Kill any existing backend process
    pkill -f "uvicorn.*api:app" || true
    
    # Start backend in background
    cd backend
    if command -v python3 &> /dev/null; then
        python3 -m uvicorn api:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
    else
        python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000 > ../backend.log 2>&1 &
    fi
    
    echo $! > ../backend.pid
    cd ..
    
    # Wait for backend to start
    echo "⏳ Waiting for backend to start..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/ > /dev/null 2>&1; then
            echo "✅ Backend started successfully on http://localhost:8000"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Backend failed to start. Check backend.log for details."
    return 1
}

# Function to start frontend
start_frontend() {
    echo "⚛️ Starting frontend server..."
    
    # Kill any existing frontend process
    pkill -f "vite.*dev" || true
    
    # Start frontend in background
    npm run dev > frontend.log 2>&1 &
    echo $! > frontend.pid
    
    # Wait for frontend to start
    echo "⏳ Waiting for frontend to start..."
    sleep 5
    
    # Find the actual port used by Vite
    FRONTEND_PORT=$(cat frontend.log | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
    if [ -n "$FRONTEND_PORT" ]; then
        echo "✅ Frontend started successfully on http://localhost:$FRONTEND_PORT"
    else
        echo "✅ Frontend started (check frontend.log for actual port)"
    fi
}

# Function to build for production
build_frontend() {
    echo "🔨 Building frontend for production..."
    npm run build
    echo "✅ Frontend built successfully! Files are in ./dist/"
    echo "💡 You can serve with: npx serve dist -p 3000"
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    echo "=================="
    
    # Check backend
    if [ -f backend.pid ] && kill -0 $(cat backend.pid) 2>/dev/null; then
        echo "🐍 Backend: ✅ Running (PID: $(cat backend.pid))"
        echo "   URL: http://localhost:8000"
    else
        echo "🐍 Backend: ❌ Not running"
    fi
    
    # Check frontend
    if [ -f frontend.pid ] && kill -0 $(cat frontend.pid) 2>/dev/null; then
        echo "⚛️ Frontend: ✅ Running (PID: $(cat frontend.pid))"
        # Try to find the port from logs
        if [ -f frontend.log ]; then
            FRONTEND_PORT=$(cat frontend.log | grep -o "localhost:[0-9]*" | head -1 | cut -d: -f2)
            if [ -n "$FRONTEND_PORT" ]; then
                echo "   URL: http://localhost:$FRONTEND_PORT"
            fi
        fi
    else
        echo "⚛️ Frontend: ❌ Not running"
    fi
    
    echo ""
    echo "📋 Logs:"
    echo "   Backend: tail -f backend.log"
    echo "   Frontend: tail -f frontend.log"
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    
    # Stop backend
    if [ -f backend.pid ]; then
        PID=$(cat backend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "✅ Backend stopped"
        fi
        rm -f backend.pid
    fi
    
    # Stop frontend
    if [ -f frontend.pid ]; then
        PID=$(cat frontend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            echo "✅ Frontend stopped"
        fi
        rm -f frontend.pid
    fi
    
    # Cleanup any remaining processes
    pkill -f "uvicorn.*api:app" || true
    pkill -f "vite.*dev" || true
    
    echo "✅ All services stopped"
}

# Main script logic
case "${1:-help}" in
    start)
        check_prerequisites
        setup_env
        start_backend
        start_frontend
        echo ""
        echo "🎉 Local deployment started successfully!"
        echo "📊 Check status: ./deploy-local.sh status"
        echo "🛑 Stop services: ./deploy-local.sh stop"
        ;;
    stop)
        stop_services
        ;;
    frontend)
        setup_env
        start_frontend
        ;;
    backend)
        setup_env
        start_backend
        ;;
    build)
        setup_env
        build_frontend
        ;;
    status)
        show_status
        ;;
    help|*)
        show_help
        ;;
esac 