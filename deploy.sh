#!/bin/bash

# Deep Research Agent Deployment Script
set -e  # Exit on any error

echo "🚀 Deep Research Agent Deployment Script"
echo "========================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to display help
show_help() {
    echo "Usage: ./deploy.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  build     Build the Docker images"
    echo "  start     Start the application"
    echo "  stop      Stop the application"
    echo "  restart   Restart the application"
    echo "  logs      Show application logs"
    echo "  clean     Remove all containers and images"
    echo "  help      Show this help message"
    echo ""
}

# Function to build images
build_images() {
    echo "🔨 Building Docker images..."
    docker-compose build --no-cache
    echo "✅ Images built successfully!"
}

# Function to start application
start_app() {
    echo "🚀 Starting the application..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Creating default .env file..."
        cat > .env << 'EOL'
# Environment Configuration for Deep Research Agent

# ===== API KEYS =====
# OpenAI API Key (required for production mode)
OPENAI_API_KEY=your_openai_api_key_here

# ===== APPLICATION SETTINGS =====
# Demo mode - set to false for production with real API calls
DEMO_MODE=true

# Backend API URL (for frontend to connect to backend)
VITE_API_URL=http://localhost:8000

# ===== DEPLOYMENT SETTINGS =====
# Environment (development, staging, production)
NODE_ENV=production

# Port configurations
FRONTEND_PORT=80
BACKEND_PORT=8000
EOL
        echo "📝 Please edit .env file with your configuration before starting."
        echo "   Specifically, set your OPENAI_API_KEY if not using demo mode."
        echo "   Default demo mode is enabled."
        read -p "Press Enter to continue..."
    fi
    
    docker-compose up -d
    echo "✅ Application started successfully!"
    echo ""
    echo "🌐 Frontend: http://localhost"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 Health Check: http://localhost:8000/"
    echo ""
    echo "📋 To view logs: ./deploy.sh logs"
    echo "🛑 To stop: ./deploy.sh stop"
}

# Function to stop application
stop_app() {
    echo "🛑 Stopping the application..."
    docker-compose down
    echo "✅ Application stopped successfully!"
}

# Function to restart application
restart_app() {
    echo "🔄 Restarting the application..."
    stop_app
    start_app
}

# Function to show logs
show_logs() {
    echo "📋 Showing application logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Function to clean up
clean_up() {
    echo "🧹 Cleaning up Docker containers and images..."
    read -p "This will remove all containers and images. Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker-compose down -v --rmi all
        docker system prune -f
        echo "✅ Cleanup completed!"
    else
        echo "❌ Cleanup cancelled."
    fi
}

# Main script logic
case "${1:-help}" in
    build)
        build_images
        ;;
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_up
        ;;
    help|*)
        show_help
        ;;
esac 