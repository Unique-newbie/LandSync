"""Reconciliation API endpoints"""

import time
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import Parcel, TextRecord, Match, MatchStatus, ConfidenceLevel, AuditLog
from app.schemas.schemas import (
    ReconcileRequest, ReconcileResponse, MatchResponse, 
    MatchVerifyRequest, MatchStatusEnum, ConfidenceLevelEnum
)
from app.matching.engine import MatchingEngine


router = APIRouter()


@router.post("", response_model=ReconcileResponse)
async def run_reconciliation(
    request: ReconcileRequest,
    current_user: dict = None, # Depends(RequirePermission(Permission.RUN_RECONCILIATION)),
    db: AsyncSession = Depends(get_db)
):
    """
    Run reconciliation matching between parcels and text records.
    
    Algorithms:
    - levenshtein: Levenshtein distance for name matching
    - jaro_winkler: Jaro-Winkler similarity
    - cosine: Cosine similarity with TF-IDF
    - combined: Weighted combination of all methods
    """
    
    start_time = time.time()
    
    # Get parcels
    parcel_query = select(Parcel)
    if request.village_id:
        parcel_query = parcel_query.where(Parcel.village_id == request.village_id)
    
    parcel_result = await db.execute(parcel_query)
    parcels = parcel_result.scalars().all()
    
    # Get text records
    record_query = select(TextRecord)
    if request.village_id:
        record_query = record_query.where(TextRecord.village_id == request.village_id)
    
    record_result = await db.execute(record_query)
    text_records = record_result.scalars().all()
    
    if not parcels or not text_records:
        return ReconcileResponse(
            total_parcels=len(parcels),
            total_records=len(text_records),
            matches_found=0,
            partial_matches=0,
            mismatches=0,
            processing_time_ms=int((time.time() - start_time) * 1000),
            matches=[]
        )
    
    # Run matching engine
    engine = MatchingEngine(
        algorithm=request.algorithm,
        area_tolerance=request.area_tolerance
    )
    
    matches_data = engine.run_matching(
        parcels=[{
            "id": p.id,
            "plot_id": p.plot_id,
            "owner_name": p.owner_name,
            "area": float(p.area_sqm)
        } for p in parcels],
        records=[{
            "id": r.id,
            "plot_id": r.plot_id,
            "owner_name": r.owner_name,
            "area": float(r.area_declared)
        } for r in text_records]
    )
    
    # Store matches
    created_matches = []
    matches_count = 0
    partial_count = 0
    mismatch_count = 0
    
    for match_data in matches_data:
        # Determine status based on score
        score = match_data["total_score"]
        if score >= 80:
            status = MatchStatus.MATCHED
            confidence = ConfidenceLevel.HIGH
            matches_count += 1
        elif score >= 50:
            status = MatchStatus.PARTIAL
            confidence = ConfidenceLevel.MEDIUM
            partial_count += 1
        else:
            status = MatchStatus.MISMATCH
            confidence = ConfidenceLevel.LOW
            mismatch_count += 1
        
        match = Match(
            parcel_id=match_data["parcel_id"],
            text_record_id=match_data["record_id"],
            match_score=score,
            name_score=match_data.get("name_score"),
            area_score=match_data.get("area_score"),
            id_score=match_data.get("id_score"),
            status=status,
            confidence_level=confidence,
            algorithm_details={
                "algorithm": request.algorithm,
                "area_tolerance": request.area_tolerance
            }
        )
        db.add(match)
        created_matches.append(match)
    
    await db.commit()
    
    # Refresh matches to get IDs
    for m in created_matches:
        await db.refresh(m)
    
    processing_time = int((time.time() - start_time) * 1000)
    
    return ReconcileResponse(
        total_parcels=len(parcels),
        total_records=len(text_records),
        matches_found=matches_count,
        partial_matches=partial_count,
        mismatches=mismatch_count,
        processing_time_ms=processing_time,
        matches=[
            MatchResponse(
                id=m.id,
                parcel_id=m.parcel_id,
                text_record_id=m.text_record_id,
                match_score=float(m.match_score),
                name_score=float(m.name_score) if m.name_score else None,
                area_score=float(m.area_score) if m.area_score else None,
                id_score=float(m.id_score) if m.id_score else None,
                status=MatchStatusEnum(m.status.value),
                confidence_level=ConfidenceLevelEnum(m.confidence_level.value) if m.confidence_level else None,
                algorithm_details=m.algorithm_details,
                verified_by_id=m.verified_by_id,
                verified_at=m.verified_at,
                rejection_reason=m.rejection_reason,
                created_at=m.created_at,
                updated_at=m.updated_at
            )
            for m in created_matches
        ]
    )


@router.get("/matches", response_model=List[MatchResponse])
async def get_matches(
    status: Optional[str] = None,
    confidence: Optional[str] = None,
    village_id: Optional[UUID] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: dict = None, # Depends(RequirePermission(Permission.VIEW_RECORDS)),
    db: AsyncSession = Depends(get_db)
):
    """Get all matches with optional filtering"""
    
    query = select(Match)
    
    if status:
        query = query.where(Match.status == MatchStatus(status))
    
    if confidence:
        query = query.where(Match.confidence_level == ConfidenceLevel(confidence))
    
    if village_id:
        # Filter by village through parcel
        query = query.join(Parcel).where(Parcel.village_id == village_id)
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    matches = result.scalars().all()
    
    return [
        MatchResponse(
            id=m.id,
            parcel_id=m.parcel_id,
            text_record_id=m.text_record_id,
            match_score=float(m.match_score),
            name_score=float(m.name_score) if m.name_score else None,
            area_score=float(m.area_score) if m.area_score else None,
            id_score=float(m.id_score) if m.id_score else None,
            status=MatchStatusEnum(m.status.value),
            confidence_level=ConfidenceLevelEnum(m.confidence_level.value) if m.confidence_level else None,
            algorithm_details=m.algorithm_details,
            verified_by_id=m.verified_by_id,
            verified_at=m.verified_at,
            rejection_reason=m.rejection_reason,
            created_at=m.created_at,
            updated_at=m.updated_at
        )
        for m in matches
    ]


@router.get("/matches/{match_id}", response_model=MatchResponse)
async def get_match(
    match_id: UUID,
    current_user: dict = None, # Depends(RequirePermission(Permission.VIEW_RECORDS)),
    db: AsyncSession = Depends(get_db)
):
    """Get a single match by ID"""
    
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    return MatchResponse(
        id=match.id,
        parcel_id=match.parcel_id,
        text_record_id=match.text_record_id,
        match_score=float(match.match_score),
        name_score=float(match.name_score) if match.name_score else None,
        area_score=float(match.area_score) if match.area_score else None,
        id_score=float(match.id_score) if match.id_score else None,
        status=MatchStatusEnum(match.status.value),
        confidence_level=ConfidenceLevelEnum(match.confidence_level.value) if match.confidence_level else None,
        algorithm_details=match.algorithm_details,
        verified_by_id=match.verified_by_id,
        verified_at=match.verified_at,
        rejection_reason=match.rejection_reason,
        created_at=match.created_at,
        updated_at=match.updated_at
    )


@router.post("/matches/{match_id}/verify")
async def verify_match(
    match_id: UUID,
    request: MatchVerifyRequest,
    current_user: dict = None, # Depends(RequirePermission(Permission.VERIFY_MATCHES)),
    db: AsyncSession = Depends(get_db)
):
    """Verify or reject a match"""
    
    result = await db.execute(
        select(Match).where(Match.id == match_id)
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Update match
    old_status = match.status
    match.status = MatchStatus(request.status.value)
    match.verified_by_id = UUID(current_user.get("sub"))
    match.verified_at = datetime.utcnow()
    
    if request.rejection_reason:
        match.rejection_reason = request.rejection_reason
    
    # Create audit log
    audit = AuditLog(
        user_id=UUID(current_user.get("sub")),
        action="VERIFY",
        entity_type="match",
        entity_id=match_id,
        changes={
            "old_status": old_status.value,
            "new_status": request.status.value,
            "rejection_reason": request.rejection_reason
        }
    )
    db.add(audit)
    
    await db.commit()
    
    return {"success": True, "message": f"Match {request.status.value}"}


@router.get("/stats")
async def get_reconciliation_stats(
    village_id: Optional[UUID] = None,
    current_user: dict = None, # Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get reconciliation statistics"""
    
    base_query = select(Match)
    if village_id:
        base_query = base_query.join(Parcel).where(Parcel.village_id == village_id)
    
    # Total matches
    total_result = await db.execute(
        select(func.count(Match.id)).select_from(base_query.subquery())
    )
    total = total_result.scalar() or 0
    
    # Count by status
    status_counts = {}
    for status in MatchStatus:
        count_query = select(func.count(Match.id)).where(Match.status == status)
        if village_id:
            count_query = count_query.join(Parcel).where(Parcel.village_id == village_id)
        result = await db.execute(count_query)
        status_counts[status.value] = result.scalar() or 0
    
    # Average score
    avg_result = await db.execute(
        select(func.avg(Match.match_score)).select_from(base_query.subquery())
    )
    avg_score = float(avg_result.scalar() or 0)
    
    return {
        "total_matches": total,
        "by_status": status_counts,
        "average_score": round(avg_score, 2),
        "verified_count": status_counts.get("verified", 0) + status_counts.get("rejected", 0)
    }
