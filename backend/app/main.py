"""FastAPI Main Application"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, upload, search, parcels, reconcile, reports, gov


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print(f"[START] Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    
    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Initialize database
    try:
        await init_db()
        print("[OK] Database initialized")
    except Exception as e:
        print(f"[WARN] Database init error: {e}")
    
    yield
    
    # Shutdown
    print("👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="Land Record Digitization & Reconciliation Platform for India",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["Authentication"])
app.include_router(upload.router, prefix=f"{settings.API_PREFIX}/upload", tags=["Data Upload"])
app.include_router(search.router, prefix=f"{settings.API_PREFIX}/search", tags=["Search"])
app.include_router(parcels.router, prefix=f"{settings.API_PREFIX}/parcels", tags=["Parcels"])
app.include_router(reconcile.router, prefix=f"{settings.API_PREFIX}/reconcile", tags=["Reconciliation"])
app.include_router(reports.router, prefix=f"{settings.API_PREFIX}/reports", tags=["Reports"])
app.include_router(gov.router, prefix=f"{settings.API_PREFIX}/gov", tags=["Government Integration"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/api/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "connected",
        "gov_sandbox": settings.GOV_SANDBOX_MODE
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
