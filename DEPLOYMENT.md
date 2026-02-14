# Deployment Guide

This guide covers deploying the AI Interview Assistant to production environments.

## 📦 Deployment Options

### Option 1: Docker (Recommended for Self-Hosting)

#### Prerequisites
- Docker and Docker Compose installed
- Domain name (optional)
- SSL certificate (for production)

#### Steps

1. **Clone and Configure**
```bash
git clone <repository-url>
cd ai-interviewer
cp .env.example .env
# Edit .env with production values
```

2. **Build and Run**
```bash
docker-compose up -d
```

3. **Access**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

4. **Production Setup**
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Vercel (Frontend) + Railway (Backend)

#### Deploy Frontend to Vercel

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```

3. **Configure Environment Variables**
- Go to Vercel Dashboard → Settings → Environment Variables
- Add:
  - `VITE_GEMINI_API_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` (your backend URL)

4. **Redeploy**
```bash
vercel --prod
```

#### Deploy Backend to Railway

1. **Create Railway Account**
- Go to https://railway.app
- Connect your GitHub account

2. **New Project**
- Create new project
- Deploy from GitHub repo
- Select `backend` folder

3. **Configure**
- Add environment variables:
  - `GEMINI_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_KEY`
  - `PORT=8000`

4. **Deploy**
- Railway automatically builds and deploys
- Get your deployment URL

5. **Update Frontend**
- Update `VITE_API_URL` in Vercel to Railway URL
- Redeploy frontend

### Option 3: AWS (Production-Grade)

#### Architecture
```
CloudFront → S3 (Frontend)
    ↓
ALB → ECS/Fargate (Backend)
    ↓
RDS/Supabase (Database)
```

#### Steps

1. **Frontend (S3 + CloudFront)**
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Create CloudFront distribution
# Point to S3 bucket
# Enable HTTPS
```

2. **Backend (ECS/Fargate)**
```bash
# Build Docker image
docker build -t ai-interview-backend ./backend

# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-url>
docker tag ai-interview-backend:latest <ecr-url>/ai-interview-backend:latest
docker push <ecr-url>/ai-interview-backend:latest

# Deploy to ECS
# Create task definition
# Create service
# Configure load balancer
```

3. **Database**
- Use existing Supabase (recommended)
- Or deploy RDS PostgreSQL

### Option 4: Render (All-in-One)

#### Deploy Backend

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - Name: ai-interview-backend
   - Environment: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Root Directory: `backend`

5. Add environment variables

#### Deploy Frontend

1. New → Static Site
2. Connect GitHub repo
3. Configure:
   - Name: ai-interview-frontend
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

4. Add environment variables

## 🔧 Production Configuration

### Environment Variables

#### Frontend Production
```env
VITE_GEMINI_API_KEY=your_production_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=https://api.yourdomain.com
```

#### Backend Production
```env
GEMINI_API_KEY=your_production_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
HOST=0.0.0.0
PORT=8000
```

### Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Secure API keys in environment variables
- [ ] Enable CORS only for your domain
- [ ] Set up rate limiting
- [ ] Enable Supabase RLS
- [ ] Use strong passwords
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup database regularly
- [ ] Set up error tracking (Sentry)

### Performance Optimization

#### Frontend
```javascript
// vite.config.ts production optimizations
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
})
```

#### Backend
- Use production ASGI server (Gunicorn + Uvicorn)
- Enable response caching
- Use connection pooling
- Implement rate limiting
- Add CDN for static assets

### Monitoring Setup

#### Application Monitoring
```python
# Add to backend/main.py
from fastapi.middleware.cors import CORSMiddleware
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    environment="production",
)
```

#### Analytics
```typescript
// Add to src/main.tsx
import * as analytics from '@vercel/analytics';

analytics.inject();
```

### Database Backup

#### Supabase
- Automatic backups included
- Manual backup:
```bash
pg_dump -h db.your-project.supabase.co -U postgres > backup.sql
```

### CI/CD Pipeline

#### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          curl -X POST ${{ secrets.RAILWAY_WEBHOOK_URL }}
```

## 🚀 Post-Deployment

### Health Checks

Test these endpoints:
- Frontend: https://yourdomain.com
- Backend: https://api.yourdomain.com/
- WebSocket: wss://api.yourdomain.com/api/ws/test

### Monitoring

Set up monitoring for:
- Uptime (UptimeRobot, Pingdom)
- Error tracking (Sentry)
- Performance (New Relic, DataDog)
- Logs (Logtail, Papertrail)

### Scaling Strategy

#### Horizontal Scaling
- Add more backend instances
- Use load balancer
- Session affinity for WebSockets

#### Vertical Scaling
- Increase instance size
- More CPU for audio processing
- More memory for concurrent requests

## 📊 Cost Estimates

### Low Traffic (< 1000 users/month)
- Vercel: Free
- Railway: $5-10/month
- Supabase: Free
- **Total: $5-10/month**

### Medium Traffic (1000-10000 users/month)
- Vercel: $20/month
- Railway: $20-50/month
- Supabase: $25/month
- **Total: $65-95/month**

### High Traffic (> 10000 users/month)
- AWS/Custom: $200-500/month
- Includes CDN, load balancing, auto-scaling

## 🆘 Troubleshooting

### Frontend Not Loading
- Check build logs
- Verify environment variables
- Check CORS settings
- Inspect browser console

### Backend Errors
- Check server logs
- Verify API keys
- Test endpoints with curl
- Check database connection

### WebSocket Issues
- Verify WSS (not WS) in production
- Check load balancer timeout settings
- Ensure sticky sessions enabled
- Test with wscat tool

## 📈 Scaling Beyond 10K Users

Consider:
1. **Microservices**: Split into separate services
2. **Message Queue**: Redis/RabbitMQ for async processing
3. **Caching Layer**: Redis for response caching
4. **CDN**: CloudFlare/CloudFront for static assets
5. **Database**: Read replicas, connection pooling
6. **Load Balancer**: Multiple backend instances

---

For support, open an issue on GitHub or contact support@example.com

