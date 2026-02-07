"""Parcels API endpoints - SQLite Compatible"""

import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import Parcel, Village
from app.schemas.schemas import ParcelResponse, VillageResponse, VillageCreate


router = APIRouter()


# =============================================================================
# VILLAGE ENDPOINTS (must come before /{parcel_id} to avoid route conflicts)
# =============================================================================

@router.get("/villages", response_model=List[VillageResponse])
async def get_villages(
    district: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all villages"""
    
    query = select(Village)
    
    if district:
        query = query.where(Village.district.ilike(f"%{district}%"))
    
    result = await db.execute(query)
    villages = result.scalars().all()
    
    return [
        VillageResponse(
            id=v.id,
            village_id=v.village_id,
            name=v.name,
            name_hindi=v.name_hindi,
            district=v.district,
            tehsil=v.tehsil,
            state=v.state,
            created_at=v.created_at
        )
        for v in villages
    ]


@router.post("/villages", response_model=VillageResponse)
async def create_village(
    village: VillageCreate,
    current_user: dict = Depends(RequirePermission(Permission.MANAGE_VILLAGES)),
    db: AsyncSession = Depends(get_db)
):
    """Create a new village"""
    
    # Check if village_id already exists
    existing = await db.execute(
        select(Village).where(Village.village_id == village.village_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Village ID already exists")
    
    new_village = Village(**village.model_dump())
    db.add(new_village)
    await db.commit()
    await db.refresh(new_village)
    
    return VillageResponse(
        id=new_village.id,
        village_id=new_village.village_id,
        name=new_village.name,
        name_hindi=new_village.name_hindi,
        district=new_village.district,
        tehsil=new_village.tehsil,
        state=new_village.state,
        created_at=new_village.created_at
    )


# =============================================================================
# STATS ENDPOINT (must come before /{parcel_id})
# =============================================================================

@router.get("/stats")
async def get_parcel_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get parcel statistics"""
    
    # Total parcels
    total_result = await db.execute(select(func.count(Parcel.id)))
    total_parcels = total_result.scalar() or 0
    
    # Total area
    area_result = await db.execute(select(func.sum(Parcel.area_sqm)))
    total_area_sqm = float(area_result.scalar() or 0)
    
    # Villages count
    village_result = await db.execute(select(func.count(Village.id)))
    total_villages = village_result.scalar() or 0
    
    # Parcels by status
    status_query = await db.execute(
        select(
            Parcel.status,
            func.count(Parcel.id).label("count")
        )
        .group_by(Parcel.status)
    )
    
    return {
        "total_parcels": total_parcels,
        "total_area_sqm": total_area_sqm,
        "total_area_hectares": total_area_sqm / 10000,
        "total_villages": total_villages,
        "parcels_by_status": [
            {"status": row.status, "count": row.count}
            for row in status_query.all()
        ]
    }


# =============================================================================
# GEOJSON ENDPOINT (must come before /{parcel_id})
# =============================================================================

@router.get("/geojson")
async def get_parcels_geojson(
    village_id: Optional[str] = None,
    limit: int = Query(500, ge=1, le=5000),
    current_user: dict = Depends(RequirePermission(Permission.VIEW_MAP)),
    db: AsyncSession = Depends(get_db)
):
    """Get parcels as GeoJSON FeatureCollection for map display"""
    
    query = select(Parcel)
    
    if village_id:
        query = query.where(Parcel.village_id == village_id)
    
    query = query.limit(limit)
    result = await db.execute(query)
    parcels = result.scalars().all()
    
    features = []
    for p in parcels:
        try:
            geometry = json.loads(p.geometry_json) if p.geometry_json else None
        except:
            geometry = None
        
        features.append({
            "type": "Feature",
            "id": str(p.id),
            "geometry": geometry,
            "properties": {
                "plot_id": p.plot_id,
                "owner_name": p.owner_name,
                "area_sqm": float(p.area_sqm),
                "status": p.status,
                "village_id": str(p.village_id) if p.village_id else None
            }
        })
    
    return {
        "type": "FeatureCollection",
        "features": features,
        "total": len(features)
    }


# =============================================================================
# PARCEL LIST ENDPOINT
# =============================================================================

@router.get("", response_model=List[ParcelResponse])
async def get_parcels(
    village_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(RequirePermission(Permission.VIEW_RECORDS)),
    db: AsyncSession = Depends(get_db)
):
    """Get all parcels with optional filtering"""
    
    query = select(Parcel)
    
    if village_id:
        query = query.where(Parcel.village_id == village_id)
    
    if status:
        query = query.where(Parcel.status == status)
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    parcels = result.scalars().all()
    
    return [
        ParcelResponse(
            id=p.id,
            plot_id=p.plot_id,
            owner_name=p.owner_name,
            owner_name_hindi=p.owner_name_hindi,
            area_sqm=float(p.area_sqm),
            area_hectares=float(p.area_hectares) if p.area_hectares else None,
            area_bigha=float(p.area_bigha) if p.area_bigha else None,
            village_id=p.village_id,
            status=p.status,
            geometry=None,
            centroid=None,
            source_file=p.source_file,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in parcels
    ]


# =============================================================================
# SINGLE PARCEL ENDPOINT (with path parameter - must come LAST)
# =============================================================================

@router.get("/{parcel_id}", response_model=ParcelResponse)
async def get_parcel(
    parcel_id: str,
    current_user: dict = Depends(RequirePermission(Permission.VIEW_RECORDS)),
    db: AsyncSession = Depends(get_db)
):
    """Get a single parcel by ID"""
    
    result = await db.execute(
        select(Parcel).where(Parcel.id == parcel_id)
    )
    parcel = result.scalar_one_or_none()
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    
    return ParcelResponse(
        id=parcel.id,
        plot_id=parcel.plot_id,
        owner_name=parcel.owner_name,
        owner_name_hindi=parcel.owner_name_hindi,
        area_sqm=float(parcel.area_sqm),
        area_hectares=float(parcel.area_hectares) if parcel.area_hectares else None,
        area_bigha=float(parcel.area_bigha) if parcel.area_bigha else None,
        village_id=parcel.village_id,
        status=parcel.status,
        geometry=None,
        centroid=None,
        source_file=parcel.source_file,
        created_at=parcel.created_at,
        updated_at=parcel.updated_at
    )
