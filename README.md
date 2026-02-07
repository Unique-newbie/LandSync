# LandSync - Land Record Digitization & Reconciliation Platform

A production-grade web platform for digitizing, reconciling, and managing land records with GIS integration, specifically designed for Indian government compliance.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 15+ with PostGIS extension
- Node.js 18+ (for frontend)
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start all services
docker-compose up -d

# Access:
# API Docs: http://localhost:8000/api/docs
# Frontend: http://localhost:3000
```

### Option 2: Local Development

```bash
# 1. Setup PostgreSQL with PostGIS
createdb LandSync
psql -d LandSync -c "CREATE EXTENSION postgis;"

# 2. Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database credentials

# 3. Start backend
uvicorn app.main:app --reload

# 4. Frontend setup (in another terminal)
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
LandSync/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI endpoints
│   │   ├── core/          # Config, security, database
│   │   ├── models/        # SQLAlchemy models with PostGIS
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── gis/           # GIS processing
│   │   └── matching/      # Reconciliation engine
│   └── requirements.txt
├── frontend/              # React.js frontend
├── diagrams/              # Architecture diagrams
├── scripts/               # Database scripts
└── docker-compose.yml
```

## 🔑 Key Features

- **Data Ingestion**: Upload Shapefiles, GeoPackage, CSV, Excel
- **GIS Visualization**: Interactive maps with Leaflet
- **Reconciliation Engine**: Multi-algorithm matching (Levenshtein, Jaro-Winkler, Cosine)
- **Government Integration**: Aadhaar, DigiLocker, Bhulekh (sandbox mode)
- **RBAC**: Role-based access control (Admin, Officer, Surveyor, Viewer)
- **Reports**: PDF, Excel, CSV export

## 🔐 Default Login

```
Email: admin@LandSync.gov.in
Password: Admin@123
```

## 📚 API Documentation

- Swagger UI: `http://localhost:8000/api/docs`
- ReDoc: `http://localhost:8000/api/redoc`

## 📄 License

MIT License - Built for SIH Hackathon 2024
