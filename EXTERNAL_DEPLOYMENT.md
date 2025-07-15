# 🌐 External Deployment Guide

This guide covers various options for deploying your Deep Research Agent with external access and static IP addresses.

## 📋 Quick Start Options

### Option 1: Local Network Access (Easiest)
```bash
./deploy-external.sh local-external
```
- ✅ Access from any device on your WiFi network
- ✅ No additional setup required
- ❌ Limited to local network only

### Option 2: Ngrok Tunnel (Public Internet)
```bash
# Install ngrok first
brew install ngrok

# Start with public tunnel
./deploy-external.sh ngrok
```
- ✅ Instant public internet access
- ✅ HTTPS automatically provided
- ❌ Random URLs that change on restart
- ❌ Free tier has limitations

### Option 3: Cloudflare Tunnel (Public Internet)
```bash
# Install cloudflared first
brew install cloudflared

# Start with Cloudflare tunnel
./deploy-external.sh cloudflare
```
- ✅ Free public internet access
- ✅ HTTPS automatically provided
- ✅ More stable than ngrok
- ❌ URLs still change on restart

## 🏗️ Production Deployment Options

### Option 4: VPS/Cloud Server (Recommended for Production)

#### DigitalOcean Droplet
1. **Create Droplet**:
   - Ubuntu 22.04 LTS
   - $10/month droplet (2GB RAM, 1 CPU)
   - Add your SSH key

2. **Setup Server**:
   ```bash
   # SSH into your server
   ssh root@your-server-ip
   
   # Update system
   apt update && apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt install docker-compose -y
   
   # Clone your repository
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   
   # Start with Docker
   ./deploy.sh start
   ```

3. **Configure Domain** (Optional):
   - Point your domain to server IP
   - Setup SSL with Let's Encrypt
   - Configure nginx reverse proxy

#### AWS EC2 Instance
1. **Launch Instance**:
   - Amazon Linux 2 or Ubuntu 22.04
   - t3.small instance (2GB RAM)
   - Configure security groups (ports 80, 443, 22)

2. **Setup Commands**:
   ```bash
   # Connect to instance
   ssh -i your-key.pem ec2-user@your-instance-ip
   
   # Install Docker
   sudo yum update -y
   sudo yum install docker -y
   sudo systemctl start docker
   sudo usermod -a -G docker ec2-user
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Deploy application
   git clone your-repo
   cd your-repo
   ./deploy.sh start
   ```

### Option 5: Platform as a Service (PaaS)

#### Railway
1. **Connect Repository**:
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Railway auto-detects the configuration

2. **Environment Variables**:
   ```
   OPENAI_API_KEY=your_key_here
   DEMO_MODE=false
   ```

3. **Custom Domain**:
   - Add your domain in Railway dashboard
   - Configure DNS to point to Railway

#### Render
1. **Create Web Service**:
   - Connect your GitHub repository
   - Render uses `render.yaml` configuration

2. **Environment Variables**:
   ```
   OPENAI_API_KEY=your_key_here
   DEMO_MODE=false
   ```

#### Vercel (Frontend Only)
1. **Deploy Frontend**:
   ```bash
   npm run build
   vercel --prod
   ```

2. **Backend Separately**:
   - Deploy backend on Railway/Render
   - Update `VITE_API_URL` to point to backend

### Option 6: Kubernetes (Advanced)

For high-availability production deployments:

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: research-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: research-agent
  template:
    metadata:
      labels:
        app: research-agent
    spec:
      containers:
      - name: backend
        image: your-registry/research-agent-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: openai-key
      - name: frontend
        image: your-registry/research-agent-frontend:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: research-agent-service
spec:
  selector:
    app: research-agent
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

## 🔧 Configuration for External Access

### Environment Variables
```bash
# Required for production
OPENAI_API_KEY=your_actual_key_here
DEMO_MODE=false

# Optional optimizations
NODE_ENV=production
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Performance settings
SEARCH_TIMEOUT_SECONDS=30
PARALLEL_SEARCH_LIMIT=5
MAX_RESEARCH_LOOPS=2
```

### Security Configuration

#### CORS Settings
Update `backend/api.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://api.yourdomain.com",
        # Add your specific domains
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

#### Firewall Rules
```bash
# Ubuntu/Debian
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# CentOS/RHEL
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### SSL Certificate Setup

#### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Monitoring and Maintenance

### Health Checks
```bash
# Check backend health
curl https://yourdomain.com/api/health

# Check frontend
curl https://yourdomain.com/

# Monitor logs
tail -f /var/log/nginx/access.log
docker-compose logs -f
```

### Performance Monitoring
- Use monitoring tools like:
  - **Uptime Robot** - Service availability
  - **New Relic** - Application performance
  - **Sentry** - Error tracking
  - **Grafana** - Metrics visualization

### Backup Strategy
```bash
# Environment variables
cp .env .env.backup

# Database (if added later)
pg_dump your_db > backup.sql

# Configuration files
tar -czf config-backup.tar.gz *.json *.yaml *.env
```

## 💰 Cost Estimation

### Free Options
- **Ngrok**: Free tier with limitations
- **Cloudflare Tunnel**: Free
- **Railway**: $5/month free tier
- **Render**: Free tier available

### Paid Options
- **DigitalOcean**: $10-20/month
- **AWS EC2**: $10-30/month
- **Google Cloud**: $10-25/month
- **Azure**: $15-30/month

### Domain and SSL
- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)

## 🔍 Troubleshooting

### Common Issues

1. **Port Access Issues**:
   ```bash
   # Check if ports are open
   netstat -tlnp | grep :8000
   
   # Test external access
   curl -I http://your-ip:8000/
   ```

2. **CORS Errors**:
   - Update CORS origins in backend
   - Ensure proper domain configuration

3. **SSL Certificate Issues**:
   ```bash
   # Check certificate validity
   openssl s_client -connect yourdomain.com:443
   
   # Renew certificate
   sudo certbot renew
   ```

4. **Performance Issues**:
   - Monitor server resources
   - Optimize database queries
   - Enable caching
   - Use CDN for static assets

### Debug Commands
```bash
# Check service status
./deploy-external.sh status

# View logs
tail -f backend-external.log
tail -f frontend-external.log

# Test API endpoints
curl -X POST https://yourdomain.com/api/research \
  -H "Content-Type: application/json" \
  -d '{"question": "test question"}'
```

## 🚀 Quick Deployment Commands

```bash
# Local network access
./deploy-external.sh local-external

# Public internet (ngrok)
./deploy-external.sh ngrok

# Public internet (Cloudflare)
./deploy-external.sh cloudflare

# Check status
./deploy-external.sh status

# Stop all services
./deploy-external.sh stop
```

## 📱 Mobile Access

Once deployed externally, your application will be accessible from:
- Mobile phones
- Tablets
- Other computers
- Any device with internet access

The responsive design ensures optimal experience across all devices.

---

Choose the deployment option that best fits your needs and budget. For testing and development, start with local network access or tunneling services. For production, consider VPS hosting with a custom domain and SSL certificate. 