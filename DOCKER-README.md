# 🐳 Docker Deployment Guide - Senapati Hardware

Complete Docker setup for the Senapati Hardware e-commerce platform.

## 📋 Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)

## 🚀 Quick Start

### 1. Clone and Navigate
```bash
cd Senapati-Hardware
```

### 2. Build and Start All Services
```bash
docker-compose up --build
```

This single command will:
- ✅ Build the backend FastAPI container
- ✅ Build the frontend React+Nginx container  
- ✅ Start PostgreSQL database
- ✅ Create database tables
- ✅ Seed initial data (admin, products, categories)
- ✅ Start all services

### 3. Access the Application

- **Frontend (Store)**: http://localhost
- **Admin Panel**: http://localhost/admin
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔐 Default Credentials

After seeding, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@senapatihardware.com | admin123 |
| Customer | customer@demo.com | customer123 |
| Staff | staff@senapatihardware.com | staff123 |

## 🛠️ Docker Commands

### Start Services (Detached)
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Everything (including volumes)
```bash
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild After Code Changes
```bash
docker-compose up --build -d
```

### Check Service Health
```bash
docker-compose ps
```

## 📦 Services Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (Nginx + React)                           │
│  Port: 80                                            │
│  Health: /health                                     │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ Proxies /api & /uploads
                  ▼
┌─────────────────────────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)                        │
│  Port: 8000                                          │
│  Health: /api/health                                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  │ Database Connection
                  ▼
┌─────────────────────────────────────────────────────┐
│  PostgreSQL Database                                 │
│  Port: 5432                                          │
│  Database: senapati_hardware                         │
└─────────────────────────────────────────────────────┘
```

## 🗂️ Volume Persistence

Data is persisted in Docker volumes:

- `postgres_data`: Database data
- `backend_uploads`: User uploaded files (product images, etc.)

To backup volumes:
```bash
docker run --rm -v senapati-hardware_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres-backup.tar.gz /data
```

## ⚙️ Environment Variables

### Backend (docker-compose.yml)

```yaml
DATABASE_URL: postgresql://postgres:postgres@postgres:5432/senapati_hardware
SECRET_KEY: your-secret-key-change-in-production
ALGORITHM: HS256
ACCESS_TOKEN_EXPIRE_MINUTES: 1440
UPLOAD_DIR: uploads
CORS_ORIGINS: http://localhost,http://localhost:80
```

**🔒 Security Note**: Change `SECRET_KEY` in production!

### Production Deployment

For production, create a `.env` file:

```env
POSTGRES_PASSWORD=strong-random-password
SECRET_KEY=your-super-secret-jwt-key-min-32-chars
```

Then reference in docker-compose.yml:
```yaml
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  SECRET_KEY: ${SECRET_KEY}
```

## 🔧 Troubleshooting

### Port Already in Use
If port 80 or 8000 is already in use:

```yaml
# Edit docker-compose.yml
services:
  frontend:
    ports:
      - "3000:80"  # Change 80 to 3000
  backend:
    ports:
      - "8001:8000"  # Change 8000 to 8001
```

### Database Connection Issues
```bash
# Check if postgres is healthy
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Frontend Not Loading
```bash
# Check nginx logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend
```

### Backend API Errors
```bash
# Check backend logs
docker-compose logs backend

# Access backend shell
docker-compose exec backend sh

# Test database connection
docker-compose exec backend python -c "from app.database import engine; print(engine.execute('SELECT 1').fetchone())"
```

### Reset Everything
```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up --build
```

## 📊 Monitoring

### Container Stats
```bash
docker stats senapati-backend senapati-frontend senapati-postgres
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend health  
curl http://localhost/health

# Database health
docker-compose exec postgres pg_isready -U postgres
```

## 🚢 Production Deployment

### Using Docker Swarm
```bash
docker swarm init
docker stack deploy -c docker-compose.yml senapati
```

### Using Kubernetes
Convert docker-compose to k8s:
```bash
kompose convert
kubectl apply -f .
```

### Cloud Deployment

**AWS ECS**: Use docker-compose.yml with ECS CLI
**Google Cloud Run**: Build and push images, deploy services
**Azure Container Instances**: Use docker-compose with ACI context

## 📝 Development vs Production

### Development
```bash
# Use docker-compose.yml as-is
docker-compose up --build
```

### Production
1. Update `SECRET_KEY` and database passwords
2. Use production-grade PostgreSQL (RDS, CloudSQL, etc.)
3. Add SSL/TLS certificates to nginx
4. Enable rate limiting and security headers
5. Use environment-specific .env files
6. Implement backup strategies

## 🆘 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify health: `docker-compose ps`
- Restart services: `docker-compose restart`
- Full reset: `docker-compose down -v && docker-compose up --build`

---

**Built with**: FastAPI • React • PostgreSQL • Docker • Nginx
