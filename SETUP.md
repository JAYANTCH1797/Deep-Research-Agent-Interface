# Deep Research Agent - Quick Setup Guide

## 🚀 Quick Start (Recommended)

```bash
# 1. Run the automated setup
node quick-start.js

# 2. Start both frontend and backend
npm start
```

The quick-start script will automatically:
- Check if Python is installed
- Install backend dependencies
- Check backend configuration
- Test backend startup
- Install frontend dependencies

---

## 🔧 Manual Setup

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
pip install -r backend/requirements.txt
```

### 2. Configure Backend

The Gemini API key is already configured in `backend/.env`. For full functionality, you'll also need Google Search API credentials:

**Get Google Search API credentials:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable "Custom Search API"
3. Create credentials → Get API key
4. Go to [Google Custom Search](https://cse.google.com/)
5. Create new search engine → Search entire web
6. Get your Search Engine ID

**Update `backend/.env`:**
```bash
# Already configured
GEMINI_API_KEY=AIzaSyBuShUosDe7MiP2ALBg88CL6_RoQSgwiM8

# Add these for full functionality
GOOGLE_SEARCH_API_KEY=your_google_search_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_custom_search_engine_id_here
```

### 3. Test Configuration

```bash
npm run backend:config
```

Should show:
```
✅ Configuration Valid: True
✅ Gemini API Key: Set
❌ Google Search API Key: Missing  <- Add for full functionality
❌ Google Search Engine ID: Missing <- Add for full functionality
```

### 4. Start the Application

**Option 1: Start everything at once**
```bash
npm start
# or
npm run dev:full
```

**Option 2: Start separately (useful for development)**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

---

## 🧪 Testing

### Test Backend Separately
```bash
# Quick test
npm run backend:test

# Manual test
python -m backend.main research "What is artificial intelligence?"
```

### Test Frontend
1. Open http://localhost:5173
2. Enter any research question
3. If backend is running → Real research with streaming
4. If backend is down → Demo mode with simulation

---

## 🔧 Troubleshooting

### "Failed to fetch" / "Connection failed"

**This means the backend server isn't running or accessible.**

**Quick fix:**
1. Open a separate terminal
2. Run: `npm run dev:backend`
3. Wait for "Uvicorn running on http://0.0.0.0:8000"
4. Refresh the frontend

**Detailed diagnosis:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# If not running, start it
npm run dev:backend

# Check configuration
npm run backend:config
```

### Python/Backend Issues

**"Python not found":**
- Install Python 3.8+ from https://python.org
- On macOS: `brew install python`
- On Ubuntu: `sudo apt-get install python3`

**"Module not found" errors:**
```bash
# Reinstall backend dependencies
pip install -r backend/requirements.txt

# Or with explicit python3
python3 -m pip install -r backend/requirements.txt
```

**"Permission denied" on pip install:**
```bash
# Use virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Or install for user only
pip install --user -r backend/requirements.txt
```

### "Configuration not valid"

**Missing API keys:**
- Check that `backend/.env` exists
- Verify your Gemini API key is correct
- Google Search API keys are optional but recommended

**Test your Gemini API key:**
```bash
cd backend
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('Gemini API Key:', os.getenv('GEMINI_API_KEY')[:10] + '...')
"
```

### Frontend Issues

**Import errors or "module not found":**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Port already in use:**
```bash
# Frontend uses port 5173, backend uses 8000
# Kill processes using these ports:
npx kill-port 5173
npx kill-port 8000
```

### Demo Mode

If you can't get the backend working, the frontend has a **Demo Mode** that simulates the research process:

1. Start frontend: `npm run dev:frontend`
2. Enter a research question
3. When connection fails, click "Demo Mode"
4. Watch simulated research progress

---

## 🏗️ Development

### Backend Development
```bash
# Start with auto-reload
python -m backend.main server --reload

# CLI research
python -m backend.main research "your question here"

# Check logs
python -m backend.main server --reload --log-level debug
```

### Frontend Development
```bash
# Start with hot reload
npm run dev:frontend

# Build for production
npm run build
```

### API Documentation
When backend is running:
- **Health Check:** http://localhost:8000/health
- **API Docs:** http://localhost:8000/docs
- **Quick Test:** http://localhost:8000/test/quick-research

---

## 🎯 Expected Behavior

### ✅ Working Correctly
- Backend starts and shows "Uvicorn running on http://0.0.0.0:8000"
- Frontend shows green wifi icon when connected
- Research questions show real-time streaming updates
- Final answers include citations and sources

### ⚠️ Demo Mode (Backend Issues)
- Frontend shows orange warning icon
- "Running in demo mode" message appears
- Research simulation runs but results are generic
- No real web search or AI analysis

### ❌ Complete Failure
- Frontend shows red error icon
- "Connection failed" or similar error messages
- No research progress at all

---

## 📞 Getting Help

1. **Run diagnostics:** `node quick-start.js`
2. **Check logs:** Look at terminal output for error messages
3. **Test components separately:**
   - Backend: `npm run backend:test`
   - Frontend: Open http://localhost:5173
4. **Check the issues above** in Troubleshooting section

## 🏭 Production Deployment

For production deployment, you'll need to:
1. Set up proper environment variables
2. Configure CORS for your domain
3. Use a process manager like PM2
4. Set up HTTPS
5. Configure proper API rate limits

See `backend/README.md` for detailed production setup instructions.