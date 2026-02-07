"""Reports API endpoints"""

import os
import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import Report, Match, Parcel, TextRecord
from app.schemas.schemas import ReportRequest, ReportResponse
from app.services.report_generator import ReportGenerator


router = APIRouter()


@router.post("", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    current_user: dict = Depends(RequirePermission(Permission.GENERATE_REPORTS)),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a report.
    
    Report types:
    - reconciliation: Full reconciliation report
    - mismatch: Mismatched records only
    - summary: Summary statistics
    - village: Village-specific report
    """
    
    # Get data based on report type
    data = {}
    
    if request.report_type == "reconciliation":
        match_query = select(Match)
        if request.village_id:
            match_query = match_query.join(Parcel).where(Parcel.village_id == request.village_id)
        
        result = await db.execute(match_query)
        matches = result.scalars().all()
        
        data["matches"] = [
            {
                "parcel_id": str(m.parcel_id),
                "record_id": str(m.text_record_id),
                "score": float(m.match_score),
                "status": m.status.value,
                "confidence": m.confidence_level.value if m.confidence_level else None
            }
            for m in matches
        ]
        data["total"] = len(matches)
        
    elif request.report_type == "mismatch":
        from app.models.models import MatchStatus
        
        match_query = select(Match).where(Match.status == MatchStatus.MISMATCH)
        if request.village_id:
            match_query = match_query.join(Parcel).where(Parcel.village_id == request.village_id)
        
        result = await db.execute(match_query)
        mismatches = result.scalars().all()
        
        data["mismatches"] = []
        for m in mismatches:
            # Get parcel and record details
            parcel_result = await db.execute(select(Parcel).where(Parcel.id == m.parcel_id))
            parcel = parcel_result.scalar_one_or_none()
            
            record_result = await db.execute(select(TextRecord).where(TextRecord.id == m.text_record_id))
            record = record_result.scalar_one_or_none()
            
            if parcel and record:
                data["mismatches"].append({
                    "parcel_plot_id": parcel.plot_id,
                    "parcel_owner": parcel.owner_name,
                    "parcel_area": float(parcel.area_sqm),
                    "record_plot_id": record.plot_id,
                    "record_owner": record.owner_name,
                    "record_area": float(record.area_declared),
                    "score": float(m.match_score)
                })
        
        data["total"] = len(data["mismatches"])
        
    elif request.report_type == "summary":
        from sqlalchemy import func
        
        # Get counts
        parcel_count = await db.execute(select(func.count(Parcel.id)))
        record_count = await db.execute(select(func.count(TextRecord.id)))
        match_count = await db.execute(select(func.count(Match.id)))
        
        data["parcels"] = parcel_count.scalar() or 0
        data["records"] = record_count.scalar() or 0
        data["matches"] = match_count.scalar() or 0
        
        # Average score
        avg_score = await db.execute(select(func.avg(Match.match_score)))
        data["average_score"] = round(float(avg_score.scalar() or 0), 2)
        
    # Generate report file
    report_id = uuid.uuid4()
    generator = ReportGenerator()
    
    title = f"{request.report_type.title()} Report - {datetime.now().strftime('%Y-%m-%d')}"
    file_path = generator.generate(
        data=data,
        report_type=request.report_type,
        format=request.format,
        report_id=report_id,
        title=title
    )
    
    # Save report record
    file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
    
    report = Report(
        id=report_id,
        report_type=request.report_type,
        format=request.format,
        title=title,
        description=f"Generated on {datetime.now().isoformat()}",
        file_path=file_path,
        file_size=file_size,
        parameters={
            "village_id": str(request.village_id) if request.village_id else None,
            "date_from": request.date_from.isoformat() if request.date_from else None,
            "date_to": request.date_to.isoformat() if request.date_to else None,
            "include_geometry": request.include_geometry
        },
        generated_by=uuid.UUID(current_user.get("sub"))
    )
    
    db.add(report)
    await db.commit()
    await db.refresh(report)
    
    return ReportResponse(
        id=report.id,
        report_type=report.report_type,
        format=report.format,
        title=report.title,
        description=report.description,
        file_path=report.file_path,
        file_size=report.file_size,
        created_at=report.created_at
    )


@router.get("")
async def list_reports(
    report_type: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all reports"""
    
    query = select(Report)
    
    if report_type:
        query = query.where(Report.report_type == report_type)
    
    query = query.order_by(Report.created_at.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    reports = result.scalars().all()
    
    return [
        ReportResponse(
            id=r.id,
            report_type=r.report_type,
            format=r.format,
            title=r.title,
            description=r.description,
            file_path=r.file_path,
            file_size=r.file_size,
            created_at=r.created_at
        )
        for r in reports
    ]


@router.get("/{report_id}")
async def get_report(
    report_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get report metadata"""
    
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return ReportResponse(
        id=report.id,
        report_type=report.report_type,
        format=report.format,
        title=report.title,
        description=report.description,
        file_path=report.file_path,
        file_size=report.file_size,
        created_at=report.created_at
    )


@router.get("/{report_id}/download")
async def download_report(
    report_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download report file"""
    
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    # Determine media type
    media_types = {
        "pdf": "application/pdf",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv"
    }
    
    return FileResponse(
        path=report.file_path,
        filename=f"{report.title}.{report.format}",
        media_type=media_types.get(report.format, "application/octet-stream")
    )
