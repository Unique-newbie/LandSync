"""Search API endpoints"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from rapidfuzz import fuzz

from app.core.database import get_db
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import Parcel, TextRecord, Village
from app.schemas.schemas import SearchRequest, SearchResult, ParcelResponse, TextRecordResponse


router = APIRouter()


@router.get("", response_model=SearchResult)
async def search(
    query: str = Query(..., min_length=1),
    search_type: str = Query("all", regex="^(all|plot_id|owner_name|village)$"),
    village_id: Optional[UUID] = None,
    fuzzy: bool = True,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = None, # Depends(RequirePermission(Permission.VIEW_RECORDS)),
    db: AsyncSession = Depends(get_db)
):
    """
    Search parcels and text records.
    
    - **query**: Search term
    - **search_type**: all, plot_id, owner_name, or village
    - **village_id**: Optional filter by village
    - **fuzzy**: Enable fuzzy matching
    """
    
    parcels = []
    text_records = []
    
    # Build parcel query
    parcel_query = select(Parcel)
    record_query = select(TextRecord)
    
    # Apply village filter
    if village_id:
        parcel_query = parcel_query.where(Parcel.village_id == village_id)
        record_query = record_query.where(TextRecord.village_id == village_id)
    
    # Apply search type filter
    if search_type == "plot_id":
        if fuzzy:
            parcel_query = parcel_query.where(Parcel.plot_id.ilike(f"%{query}%"))
            record_query = record_query.where(TextRecord.plot_id.ilike(f"%{query}%"))
        else:
            parcel_query = parcel_query.where(Parcel.plot_id == query)
            record_query = record_query.where(TextRecord.plot_id == query)
            
    elif search_type == "owner_name":
        if fuzzy:
            parcel_query = parcel_query.where(Parcel.owner_name.ilike(f"%{query}%"))
            record_query = record_query.where(TextRecord.owner_name.ilike(f"%{query}%"))
        else:
            parcel_query = parcel_query.where(Parcel.owner_name == query)
            record_query = record_query.where(TextRecord.owner_name == query)
            
    elif search_type == "village":
        # Search by village name
        village_result = await db.execute(
            select(Village).where(Village.name.ilike(f"%{query}%"))
        )
        villages = village_result.scalars().all()
        village_ids = [v.id for v in villages]
        
        if village_ids:
            parcel_query = parcel_query.where(Parcel.village_id.in_(village_ids))
            record_query = record_query.where(TextRecord.village_id.in_(village_ids))
        else:
            # No matching villages
            return SearchResult(
                parcels=[],
                text_records=[],
                total_parcels=0,
                total_records=0
            )
    else:
        # Search all fields
        if fuzzy:
            parcel_query = parcel_query.where(
                or_(
                    Parcel.plot_id.ilike(f"%{query}%"),
                    Parcel.owner_name.ilike(f"%{query}%")
                )
            )
            record_query = record_query.where(
                or_(
                    TextRecord.plot_id.ilike(f"%{query}%"),
                    TextRecord.owner_name.ilike(f"%{query}%"),
                    TextRecord.record_id.ilike(f"%{query}%")
                )
            )
        else:
            parcel_query = parcel_query.where(
                or_(
                    Parcel.plot_id == query,
                    Parcel.owner_name == query
                )
            )
            record_query = record_query.where(
                or_(
                    TextRecord.plot_id == query,
                    TextRecord.owner_name == query
                )
            )
    
    # Get total counts
    parcel_count_result = await db.execute(
        select(func.count()).select_from(parcel_query.subquery())
    )
    total_parcels = parcel_count_result.scalar() or 0
    
    record_count_result = await db.execute(
        select(func.count()).select_from(record_query.subquery())
    )
    total_records = record_count_result.scalar() or 0
    
    # Apply pagination and execute
    parcel_query = parcel_query.offset(offset).limit(limit)
    record_query = record_query.offset(offset).limit(limit)
    
    parcel_result = await db.execute(parcel_query)
    record_result = await db.execute(record_query)
    
    parcel_list = parcel_result.scalars().all()
    record_list = record_result.scalars().all()
    
    # Convert to response format
    parcels = [
        ParcelResponse(
            id=p.id,
            plot_id=p.plot_id,
            owner_name=p.owner_name,
            owner_name_hindi=p.owner_name_hindi,
            area_sqm=float(p.area_sqm),
            area_hectares=float(p.area_hectares) if p.area_hectares else None,
            area_bigha=float(p.area_bigha) if p.area_bigha else None,
            village_id=p.village_id,
            geometry=None,  # Omit geometry in search results
            centroid=None,
            source_file=p.source_file,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in parcel_list
    ]
    
    text_records = [
        TextRecordResponse(
            id=r.id,
            record_id=r.record_id,
            plot_id=r.plot_id,
            owner_name=r.owner_name,
            owner_name_hindi=r.owner_name_hindi,
            area_declared=float(r.area_declared),
            area_unit=r.area_unit,
            village_id=r.village_id,
            khata_number=r.khata_number,
            khasra_number=r.khasra_number,
            father_name=r.father_name,
            source_file=r.source_file,
            created_at=r.created_at,
            updated_at=r.updated_at
        )
        for r in record_list
    ]
    
    return SearchResult(
        parcels=parcels,
        text_records=text_records,
        total_parcels=total_parcels,
        total_records=total_records
    )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """Get search suggestions based on partial input"""
    
    suggestions = []
    
    # Get plot_id suggestions
    plot_result = await db.execute(
        select(Parcel.plot_id)
        .where(Parcel.plot_id.ilike(f"{query}%"))
        .distinct()
        .limit(limit // 2)
    )
    suggestions.extend([{"type": "plot_id", "value": r} for r in plot_result.scalars().all()])
    
    # Get owner name suggestions
    owner_result = await db.execute(
        select(Parcel.owner_name)
        .where(Parcel.owner_name.ilike(f"%{query}%"))
        .distinct()
        .limit(limit // 2)
    )
    suggestions.extend([{"type": "owner_name", "value": r} for r in owner_result.scalars().all()])
    
    return {"suggestions": suggestions[:limit]}
