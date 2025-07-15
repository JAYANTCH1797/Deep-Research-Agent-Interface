# Deep Research Agent

A LangGraph-powered deep research agent with real-time streaming interface.

## 🚀 Quick Start

```bash
# Install and start everything
npm install
npm start
```

That's it! The application will:
1. Install frontend dependencies
2. Start the backend server (Python)
3. Start the frontend server (React)
4. Open at http://localhost:5173

## 🖥️ LangGraph CLI

To explore and test the workflow graph locally using the LangGraph CLI:

1. Ensure backend dependencies (including the CLI) are installed:

   npm run backend:install

2. Launch the graph development server:

   npm run langgraph:dev

This will start a local LangGraph UI for the `ResearchWorkflow` graph, allowing you to inspect and run the graph steps interactively.

## 📋 Requirements

- **Node.js** 16+ (for the frontend)
- **Python** 3.8+ (for the backend)
- **Internet connection** (for AI API and web searches)

## 🔧 Configuration

The application comes pre-configured with:
- ✅ **Gemini API Key** - Already set up
- ⚠️ **Google Search API** - Optional but recommended for better results

To add Google Search (optional):
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Create Custom Search Engine at [Google Custom Search](https://cse.google.com/)
3. Add credentials to `backend/.env`

## 🎯 Usage

1. **Start the app**: `npm start`
2. **Open browser**: http://localhost:5173
3. **Enter research question**: Ask anything!
4. **Watch real-time progress**: See the research process unfold
5. **Get comprehensive answer**: With sources and citations

## 🛠️ Development

```bash
# Start frontend only
npm run dev:frontend

# Start backend only
npm run dev:backend

# Check backend configuration
npm run backend:config

# Run backend tests
npm run backend:test
```

## 🔍 Troubleshooting

### Backend Issues
- **"Python not found"**: Install Python 3.8+ from https://python.org
- **"Module not found"**: Run `pip install -r backend/requirements.txt`
- **"Port already in use"**: Kill process on port 8000

### Frontend Issues
- **"Connection failed"**: Backend might not be running
- **"Demo Mode"**: Normal fallback when backend is unavailable
- **Port conflicts**: Frontend uses port 5173

### Quick Fixes
```bash
# Reinstall everything
rm -rf node_modules
npm install
pip install -r backend/requirements.txt

# Kill conflicting processes
npx kill-port 5173
npx kill-port 8000

# Check status
npm run backend:health
```

## 📚 Documentation

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **Setup Guide**: See [SETUP.md](SETUP.md) for detailed instructions
- **Backend Details**: See [backend/README.md](backend/README.md)

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓ WebSocket/HTTP
Backend (FastAPI + Python)
    ↓ LangGraph
AI Research Workflow
    ↓ API Calls
Gemini AI + Google Search
```

## 🤝 Features

- **Real-time Research**: Watch AI research your questions live
- **Multi-step Process**: Query generation → Web search → Reflection → Answer
- **Interactive Timeline**: See detailed progress and intermediate results
- **Dark/Light Mode**: Theme switching with persistence
- **Responsive Design**: Works on desktop and mobile
- **Error Handling**: Graceful fallbacks and clear error messages

## 📱 Demo Mode

If the backend isn't available, the frontend automatically switches to Demo Mode with simulated research process. This lets you explore the interface even without the full setup.

---

## 📈 Observability & Tracing (JavaScript)

To instrument client-/server-side JavaScript/TypeScript code using Langchain & LangSmith:

1. Install the `langchain` package:
```bash
npm install -S langchain
```

2. Configure environment variables in your shell or a root `.env`:
```bash
LANGSMITH_TRACING=true
LANGSMITH_ENDPOINT="https://api.smith.langchain.com"
LANGSMITH_API_KEY="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"
LANGSMITH_PROJECT="pr-spotless-regard-87"
OPENAI_API_KEY="<your-openai-api-key>"
```

3. Use in your JavaScript/TypeScript code:
```js
import { ChatOpenAI } from "langchain/chat_models/openai";

const llm = new ChatOpenAI();
await llm.invoke("Hello, world!");
```

**Need help?** Check the troubleshooting section above or review the error messages in your terminal.

**Need help?** Check the troubleshooting section above or review the error messages in your terminal.