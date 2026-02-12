# 🚀 Getting Started - Senapati Hardware

## Quick Start Checklist

### ✅ Prerequisites Check

1. **Docker Desktop (Recommended Method)**
   - [ ] Install Docker Desktop from https://www.docker.com/products/docker-desktop
   - [ ] **Start Docker Desktop** (IMPORTANT: Must be running!)
   - [ ] Verify in terminal: `docker --version` and `docker-compose --version`
   - [ ] Ensure Docker is running (check system tray icon)

2. **OR Local Development**
   - [ ] Python 3.13+ installed
   - [ ] Node.js 18/20/22 installed (NOT v21.7.3)
   - [ ] PostgreSQL 16 installed and running
   - [ ] Git installed

---

## 🐳 Method 1: Docker (EASIEST - Recommended)

### Step 1: Start Docker Desktop
- **Windows**: Open Docker Desktop from Start Menu
- **Mac**: Open Docker Desktop from Applications
- **Wait** for Docker to fully start (whale icon in system tray should be steady)

### Step 2: Run the Application

**Option A: Using start script (Windows)**
```bash
start-docker.bat
```

**Option B: Using start script (Linux/Mac)**
```bash
chmod +x start-docker.sh
./start-docker.sh
```

**Option C: Manual command**
```bash
docker-compose up --build
```

### Step 3: Access the Application

Wait 30-60 seconds for all services to start, then:

- **🛒 Store**: http://localhost
- **👨‍💼 Admin Panel**: http://localhost/admin
- **📚 API Docs**: http://localhost:8000/docs
- **🔍 API Explorer**: http://localhost:8000/redoc

### Step 4: Login with Default Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@senapatihardware.com | admin123 |
| Customer | customer@demo.com | customer123 |
| Staff | staff@senapatihardware.com | staff123 |

### Step 5: Stop the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v
```

---

## 💻 Method 2: Local Development

### Backend Setup (Terminal 1)

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt
pip install email-validator

# 5. Setup database (PostgreSQL must be running!)
# Create database 'senapati_hardware' first in PostgreSQL

# 6. Configure .env file
# Copy ../.env.example to .env and update DATABASE_URL

# 7. Seed database
python seed.py

# 8. Start backend
uvicorn app.main:app --reload --port 8000
```

Backend will be at: **http://localhost:8000**

### Frontend Setup (Terminal 2)

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend will be at: **http://localhost:5173**

---

## 🔧 Troubleshooting

### Docker Issues

**Problem**: "Docker daemon is not running" or "pipe error"
- **Solution**: Start Docker Desktop and wait for it to fully initialize

**Problem**: "Port already in use"
- **Solution**: 
  ```bash
  # Check what's using the port
  netstat -ano | findstr :80
  netstat -ano | findstr :8000
  netstat -ano | findstr :5432
  
  # Stop conflicting services or change ports in docker-compose.yml
  ```

**Problem**: "Build failed" or dependency errors
- **Solution**: 
  ```bash
  # Clean rebuild
  docker-compose down -v
  docker system prune -a
  docker-compose up --build
  ```

**Problem**: Backend health check failing
- **Solution**: Check logs
  ```bash
  docker-compose logs backend
  ```

**Problem**: Database connection failed
- **Solution**: Ensure PostgreSQL container is healthy
  ```bash
  docker-compose ps
  docker-compose logs postgres
  ```

### Local Development Issues

**Problem**: "Module not found" in backend
- **Solution**: Ensure virtual environment is activated and dependencies installed

**Problem**: Frontend won't start
- **Solution**: 
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Problem**: Database connection error
- **Solution**: 
  - Verify PostgreSQL is running
  - Check credentials in `.env`
  - Ensure database `senapati_hardware` exists

**Problem**: CORS errors
- **Solution**: Update `CORS_ORIGINS` in backend `.env` to include frontend URL

---

## 📊 Verification Steps

### 1. Check All Services Running (Docker)

```bash
docker-compose ps
```

All services should show "Up" and "healthy"

### 2. Test Backend API

Visit: http://localhost:8000/docs

Try the `/api/health` endpoint

### 3. Test Frontend

Visit: http://localhost

Should see Senapati Hardware homepage

### 4. Test Admin Panel

Visit: http://localhost/admin

Login with: admin@senapatihardware.com / admin123

### 5. Check Database Seeding

- Should see 27 products on homepage
- Categories should be populated
- Admin dashboard should show stats

---

## 🎯 Next Steps

1. **Explore the Store**
   - Browse products
   - Add items to cart
   - Create an order

2. **Use Admin Panel**
   - Add/edit products
   - Manage categories
   - View orders
   - Create coupons

3. **Customize**
   - Update store name in `backend/app/models/store_settings.py`
   - Change logo and colors
   - Add your products

4. **Deploy to Production**
   - See [DOCKER-README.md](DOCKER-README.md) for deployment guides
   - Configure domain and SSL
   - Set production environment variables

---

## 📞 Need Help?

1. Check [DOCKER-README.md](DOCKER-README.md) for detailed Docker info
2. Check [README.md](README.md) for project overview
3. Review API docs at http://localhost:8000/docs
4. Check logs:
   ```bash
   # Docker
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f backend
   docker-compose logs -f frontend
   docker-compose logs -f postgres
   ```

---

## 🎉 Ready!

You're all set! The complete e-commerce platform is ready to use.

**Default admin**: admin@senapatihardware.com / admin123

Happy selling! 🛠️
