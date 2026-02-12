# 🛠️ Senapati Hardware - Full-Scale E-Commerce Platform

A comprehensive e-commerce solution for hardware stores with inventory management, admin dashboard, customer portal, and complete product management system.

![Tech Stack](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## ✨ Features

### 🛒 Customer Features
- **Product Browsing**: Advanced search, filters by category/price, sorting
- **Shopping Cart**: Real-time cart management with quantity controls
- **Wishlist**: Save favorite products
- **User Authentication**: Secure JWT-based login/registration
- **Order Management**: Place orders, track status, order history
- **Reviews & Ratings**: Write and read product reviews
- **Coupons**: Apply discount codes at checkout
- **Multiple Addresses**: Manage shipping addresses
- **Responsive Design**: Works on desktop, tablet, and mobile

### 👨‍💼 Admin Features
- **Dashboard**: Sales overview, revenue stats, order metrics
- **Product Management**: CRUD operations, image uploads, stock tracking
- **Category Management**: Organize products into categories
- **Order Management**: View, update order status, cancel orders
- **Customer Management**: View customers, manage accounts
- **Staff Management**: Add/remove staff, assign roles
- **Coupon Management**: Create discount codes, set validity
- **Banner Management**: Control homepage sliders/promotions
- **Review Moderation**: Approve/delete customer reviews
- **Inventory Management**: Track stock levels, low-stock alerts
- **Reports & Analytics**: Sales reports, top products, revenue by category
- **Settings**: Configure store details, shipping, tax

### 📄 Compliance Pages
- Terms & Conditions
- Privacy Policy
- Cancellation & Refund Policy
- Shipping & Exchange Policy
- Contact Us
- About Us
- FAQ

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### One-Command Setup

**Windows:**
```bash
start-docker.bat
```

**Linux/Mac:**
```bash
chmod +x start-docker.sh
./start-docker.sh
```

**Or manually:**
```bash
docker-compose up --build
```

That's it! The application will be available at:
- **Store**: http://localhost
- **Admin**: http://localhost/admin
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs

See [DOCKER-README.md](DOCKER-README.md) for detailed Docker documentation.

## 🛠️ Local Development Setup

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   pip install email-validator
   ```

4. **Setup PostgreSQL**
   - Install PostgreSQL 16
   - Create database:
     ```sql
     CREATE DATABASE senapati_hardware;
     ```

5. **Configure environment**
   ```bash
   cp ../.env.example .env
   # Edit .env with your database credentials
   ```

6. **Run migrations and seed data**
   ```bash
   python seed.py
   ```

7. **Start backend server**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   Backend will be at: http://localhost:8000

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will be at: http://localhost:5173

## 🔐 Default Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@senapatihardware.com | admin123 |
| Customer | customer@demo.com | customer123 |
| Staff | staff@senapatihardware.com | staff123 |

## 📁 Project Structure

```
Senapati-Hardware/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── models/            # SQLAlchemy models
│   │   ├── routes/            # API endpoints
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── utils/             # Auth & utilities
│   │   ├── config.py          # Configuration
│   │   ├── database.py        # Database setup
│   │   └── main.py            # FastAPI app
│   ├── uploads/               # File uploads
│   ├── Dockerfile             # Backend container
│   ├── requirements.txt       # Python dependencies
│   └── seed.py                # Database seeder
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── api/               # API client
│   │   ├── components/        # Reusable components
│   │   ├── context/           # React contexts
│   │   ├── pages/             # Page components
│   │   │   ├── admin/         # Admin dashboard pages
│   │   │   └── ...            # Store pages
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── Dockerfile             # Frontend container
│   ├── nginx.conf             # Nginx config
│   └── package.json           # Node dependencies
│
├── docker-compose.yml         # Docker orchestration
├── DOCKER-README.md           # Docker documentation
├── start-docker.bat           # Windows start script
├── start-docker.sh            # Linux/Mac start script
└── README.md                  # This file
```

## 🏗️ Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migrations
- **PostgreSQL**: Relational database
- **JWT**: Secure authentication
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

### Frontend
- **React 18**: UI library
- **Vite**: Build tool
- **React Router v6**: Client-side routing
- **Tailwind CSS**: Utility-first CSS
- **Axios**: HTTP client
- **React Hot Toast**: Notifications
- **Lucide React**: Icon library

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy & static file serving

## 📊 Database Schema

16 tables with relationships:
- Users, Staff, Addresses
- Categories, Products, ProductImages
- Cart, CartItem
- Orders, OrderItems
- Coupons, Reviews
- WishlistItems, Banners
- StoreSettings, InventoryLogs

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (with filters, search, pagination)
- `GET /api/products/{id}` - Get product details
- `POST /api/products` - Create product (admin)
- `PUT /api/products/{id}` - Update product (admin)
- `DELETE /api/products/{id}` - Delete product (admin)

### Orders
- `GET /api/orders/my-orders` - Get user's orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}/status` - Update order status (admin)

**Full API documentation**: http://localhost:8000/docs

## 🧪 Testing

```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend tests (if implemented)
cd frontend
npm test
```

## 📦 Building for Production

### Docker (Recommended)
```bash
docker-compose up --build -d
```

### Manual Build

**Backend:**
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve dist/ with nginx or any static server
```

## 🌐 Deployment

- **AWS**: ECS, EC2, or Elastic Beanstalk
- **Google Cloud**: Cloud Run or GKE
- **Azure**: Container Instances or AKS
- **DigitalOcean**: App Platform or Droplets
- **Heroku**: Container deployment

See [DOCKER-README.md](DOCKER-README.md) for cloud deployment guides.

## 🔒 Security Considerations

- Change `SECRET_KEY` in production
- Use strong database passwords
- Enable HTTPS/SSL
- Implement rate limiting
- Regular security updates
- Input validation & sanitization
- SQL injection protection (via ORM)
- XSS protection
- CSRF tokens for forms

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built for Senapati Hardware Store

## 🆘 Support

For issues or questions:
- Check [DOCKER-README.md](DOCKER-README.md) for Docker troubleshooting
- Review API docs at `/docs`
- Open an issue on GitHub

---

**⭐ Star this repo if you find it helpful!**
