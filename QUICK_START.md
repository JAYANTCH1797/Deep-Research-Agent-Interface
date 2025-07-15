# Quick Start Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Start the Application

```bash
npm start
```

This will start the frontend development server at http://localhost:5173

## 3. Optional: Start Backend

To enable real AI research (vs demo mode):

```bash
# In a separate terminal
npm run backend:start
```

## Troubleshooting

### Frontend won't start
- Make sure Node.js 16+ is installed
- Run `npm install` again
- Check for port conflicts on 5173

### Backend connection failed
- Install Python 3.8+
- Run `pip install -r backend/requirements.txt`
- Check if backend is running on port 8000

### Import errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript configuration

## What's Working

✅ **Frontend**: React app with TypeScript and Tailwind CSS  
✅ **UI Components**: shadcn/ui component library  
✅ **Theme System**: Dark/light mode with persistence  
✅ **Demo Mode**: Simulated research process when backend is unavailable  
⏳ **Backend**: Python FastAPI server with LangGraph workflow  

## Next Steps

Once running, you can:
1. Enter research questions in the search interface
2. Watch the real-time research progress
3. Toggle between light/dark themes
4. View detailed research results

For full functionality with AI research, ensure both frontend and backend are running.