# 🚀 Deep Research Agent - Deployment Guide

This guide covers multiple deployment options for the Deep Research Agent application.

## 📋 Prerequisites

- Docker and Docker Compose (for containerized deployment)
- Node.js 18+ (for local development)
- Python 3.11+ (for backend development)
- OpenAI API Key (for production mode)

## 🐳 Docker Deployment (Recommended)

### Quick Start

1. **Clone and navigate to the project**:
   ```bash
   git clone <your-repo-url>
   cd deep-research-agent
   ```

2. **Run the deployment script**:
   ```bash
   ./deploy.sh start
   ```

3. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - Health Check: http://localhost:8000/

### Manual Docker Commands

If you prefer manual control:

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Configuration

The deployment script will create a `.env` file automatically. Key settings:

```env
# Demo mode (no API keys required)
DEMO_MODE=true

# For production with real AI capabilities
DEMO_MODE=false
OPENAI_API_KEY=your_actual_openai_key_here

# API endpoints
VITE_API_URL=http://localhost:8000
```

## ☁️ Cloud Platform Deployment

### 1. Railway (Recommended for beginners)

1. Push your code to GitHub
2. Connect Railway to your GitHub repository
3. Railway will auto-detect the `railway.json` configuration
4. Set environment variables in Railway dashboard:
   - `DEMO_MODE=false`
   - `OPENAI_API_KEY=your_key_here`

### 2. Render

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Render will use the `render.yaml` configuration
5. Set environment variables in Render dashboard

### 3. DigitalOcean App Platform

1. Create a new app from GitHub repository
2. Configure the backend service:
   - **Source**: `/backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `uvicorn api:app --host 0.0.0.0 --port $PORT`
3. Configure the frontend service:
   - **Source**: `/`
   - **Build Command**: `npm ci && npm run build`
   - **Output Directory**: `/dist`

### 4. AWS/GCP/Azure

For enterprise deployments, use:
- **Kubernetes**: Use the Docker images with K8s manifests
- **ECS/Cloud Run**: Deploy the containers directly
- **App Engine**: Use the source code deployment

## 🔧 Production Optimizations

### Backend Optimizations

1. **Use a production WSGI server**:
   ```bash
   pip install gunicorn
   gunicorn api:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

2. **Enable caching** (add to your environment):
   ```env
   REDIS_URL=redis://your-redis-instance
   ```

3. **Database for persistent storage**:
   ```env
   DATABASE_URL=postgresql://user:pass@host:port/db
   ```

### Frontend Optimizations

1. **CDN Integration**: Deploy built assets to a CDN
2. **Analytics**: Add Google Analytics or similar
3. **Error Monitoring**: Integrate Sentry or similar service

## 🔒 Security Considerations

### Environment Variables

Never commit these to version control:
- `OPENAI_API_KEY`
- Database credentials
- API secrets

### CORS Configuration

Update the backend's CORS settings for production:

```python
# In backend/api.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Specific domains only
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### HTTPS

Always use HTTPS in production:
- Use a reverse proxy (nginx, Cloudflare)
- Enable SSL certificates (Let's Encrypt)
- Update all API URLs to use `https://`

## 📊 Monitoring and Logging

### Health Checks

- Backend health: `GET /`
- Response should be: `{"message": "Deep Research Agent API v2.0", "status": "healthy"}`

### Logging

Logs are available via:
```bash
# Docker deployment
./deploy.sh logs

# Or manually
docker-compose logs -f
```

### Performance Monitoring

Monitor these metrics:
- Response times for API endpoints
- Memory usage of containers
- Number of concurrent research sessions
- OpenAI API usage and costs

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using port 80/8000
   sudo lsof -i :80
   sudo lsof -i :8000
   ```

2. **Docker issues**:
   ```bash
   # Clean up Docker resources
   ./deploy.sh clean
   
   # Or manually
   docker system prune -f
   ```

3. **API key issues**:
   - Verify your OpenAI API key is valid
   - Check API usage limits
   - Ensure `DEMO_MODE=false` for production

4. **Frontend not connecting to backend**:
   - Verify `VITE_API_URL` environment variable
   - Check CORS configuration
   - Ensure backend is accessible

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=DEBUG
```

## 💰 Cost Optimization

### OpenAI API Costs

- Monitor usage in OpenAI dashboard
- Set usage limits and alerts
- Consider using `gpt-4o-mini` for development
- Enable `DEMO_MODE=true` for testing

### Infrastructure Costs

- Use free tiers for development (Railway, Render)
- Implement auto-scaling for production
- Monitor resource usage regularly

## 📱 Mobile and Responsive Design

The frontend is responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Tablet browsers

## 🔄 Updates and Maintenance

### Updating the Application

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart**:
   ```bash
   ./deploy.sh restart
   ```

### Database Migrations

If you add a database later, create migration scripts in `/migrations/`

### Backup Strategy

- Environment variables (store securely)
- User data (if you add user accounts)
- Configuration files

## 📞 Support

- Check the logs first: `./deploy.sh logs`
- Review the troubleshooting section above
- Open an issue in the GitHub repository
- Contact the development team

---

Happy deploying! 🎉 