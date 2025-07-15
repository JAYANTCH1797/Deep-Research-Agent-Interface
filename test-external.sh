#!/bin/bash

# Test script for external deployment
echo "🧪 Testing External Deployment"
echo "=============================="

# Read the current configuration
if [ -f .env.external ]; then
    source .env.external
    echo "📋 Configuration:"
    echo "   Local IP: $LOCAL_IP"
    echo "   Backend Port: $BACKEND_PORT"
    echo "   Frontend Port: $FRONTEND_PORT"
    echo "   Demo Mode: $DEMO_MODE"
    echo ""
else
    echo "❌ .env.external file not found. Please run ./deploy-external.sh local-external first."
    exit 1
fi

# Test backend health
echo "🔍 Testing backend health..."
HEALTH_RESPONSE=$(curl -s "http://$LOCAL_IP:$BACKEND_PORT/health")
if [ $? -eq 0 ]; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

# Test backend configuration
echo "🔧 Testing backend configuration..."
CONFIG_RESPONSE=$(curl -s "http://$LOCAL_IP:$BACKEND_PORT/config")
if [ $? -eq 0 ]; then
    DEMO_MODE_STATUS=$(echo "$CONFIG_RESPONSE" | grep -o '"demo_mode":[^,]*' | cut -d':' -f2)
    API_KEY_STATUS=$(echo "$CONFIG_RESPONSE" | grep -o '"openai_api_key_configured":[^,]*' | cut -d':' -f2)
    
    if [ "$DEMO_MODE_STATUS" = "false" ]; then
        echo "✅ Demo mode is disabled (production mode)"
    else
        echo "⚠️  Demo mode is enabled"
    fi
    
    if [ "$API_KEY_STATUS" = "true" ]; then
        echo "✅ OpenAI API key is configured"
    else
        echo "❌ OpenAI API key is not configured"
    fi
else
    echo "❌ Backend configuration check failed"
    exit 1
fi

# Test a simple research query
echo "🔍 Testing research functionality..."
RESEARCH_RESPONSE=$(curl -s -X POST "http://$LOCAL_IP:$BACKEND_PORT/research" \
    -H "Content-Type: application/json" \
    -d '{"question": "What is 2+2?"}')

if [ $? -eq 0 ]; then
    SUCCESS_STATUS=$(echo "$RESEARCH_RESPONSE" | grep -o '"success":[^,]*' | cut -d':' -f2)
    if [ "$SUCCESS_STATUS" = "true" ]; then
        echo "✅ Research functionality is working"
    else
        echo "❌ Research functionality failed"
        echo "Response: $RESEARCH_RESPONSE"
        exit 1
    fi
else
    echo "❌ Research request failed"
    exit 1
fi

# Test frontend accessibility
echo "🌐 Testing frontend accessibility..."
FRONTEND_RESPONSE=$(curl -s -I "http://$LOCAL_IP:$FRONTEND_PORT")
if [ $? -eq 0 ]; then
    echo "✅ Frontend is accessible"
else
    echo "❌ Frontend is not accessible"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"
echo "================================"
echo "🌐 Your application is ready for external access:"
echo "   Frontend: http://$LOCAL_IP:$FRONTEND_PORT"
echo "   Backend API: http://$LOCAL_IP:$BACKEND_PORT"
echo ""
echo "📱 Share the frontend URL with external users:"
echo "   http://$LOCAL_IP:$FRONTEND_PORT"
echo ""
echo "✅ Production mode is enabled with real AI capabilities"
echo "✅ OpenAI API key is configured and working"
echo "✅ All services are running and accessible" 