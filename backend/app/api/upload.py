"""Data Upload API endpoints"""

import os
import uuid
import zipfile
import tempfile
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import Document, Parcel, TextRecord, Village
from app.schemas.schemas import UploadResponse, UploadConfig
from app.gis.processor import GISProcessor
from app.services.data_ingestion import TextDataProcessor


router = APIRouter()


@router.post("/spatial", response_model=UploadResponse)
async def upload_spatial_data(
    file: UploadFile = File(...),
    village_id: Optional[str] = Form(None),
    current_user: dict = Depends(RequirePermission(Permission.UPLOAD_DATA)),
    db: AsyncSession = Depends(get_db)
):
    """Upload spatial data (Shapefile/GeoPackage/GeoJSON)"""
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_SPATIAL_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_SPATIAL_EXTENSIONS}"
        )
    
    # Save file
    doc_id = uuid.uuid4()
    file_name = f"{doc_id}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Handle ZIP files (shapefiles)
    processing_path = file_path
    if file_ext == ".zip":
        extract_dir = os.path.join(settings.UPLOAD_DIR, str(doc_id))
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        # Find .shp file
        for f in os.listdir(extract_dir):
            if f.endswith('.shp'):
                processing_path = os.path.join(extract_dir, f)
                break
    
    # Process GIS data
    try:
        processor = GISProcessor()
        parcels_data, errors = processor.process_file(processing_path)
        
        # Get or create village
        village_uuid = None
        if village_id:
            result = await db.execute(
                select(Village).where(Village.id == uuid.UUID(village_id))
            )
            village = result.scalar_one_or_none()
            if village:
                village_uuid = village.id
        
        # Insert parcels
        records_count = 0
        for parcel_data in parcels_data:
            # Get geometry as JSON string
            geometry_data = parcel_data.get("geometry_geojson") or parcel_data.get("geometry")
            geometry_json_str = json.dumps(geometry_data) if geometry_data else None
            
            # Get attributes as JSON string
            attrs = parcel_data.get("attributes", {})
            attrs_json_str = json.dumps(attrs) if attrs else None
            
            parcel = Parcel(
                plot_id=parcel_data.get("plot_id", f"P_{records_count}"),
                owner_name=parcel_data.get("owner_name", "Unknown"),
                area_sqm=parcel_data.get("area_sqm", 0),
                area_hectares=parcel_data.get("area_sqm", 0) / 10000,
                geometry_json=geometry_json_str,
                village_id=village_uuid,
                source_file=file.filename,
                attributes_json=attrs_json_str
            )
            db.add(parcel)
            records_count += 1
        
        # Create document record
        doc = Document(
            id=doc_id,
            file_name=file_name,
            original_name=file.filename,
            file_type="spatial",
            mime_type=file.content_type,
            storage_path=file_path,
            file_size=len(content),
            processing_status="completed",
            records_count=records_count,
            uploaded_by=uuid.UUID(current_user.get("sub"))
        )
        db.add(doc)
        await db.commit()
        
        return UploadResponse(
            document_id=doc_id,
            file_name=file.filename,
            file_type="spatial",
            records_count=records_count,
            status="completed",
            errors=errors if errors else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")


@router.post("/text", response_model=UploadResponse)
async def upload_text_data(
    file: UploadFile = File(...),
    village_id: Optional[str] = Form(None),
    field_mappings: Optional[str] = Form(None),
    current_user: dict = Depends(RequirePermission(Permission.UPLOAD_DATA)),
    db: AsyncSession = Depends(get_db)
):
    """Upload text data (CSV/Excel)"""
    
    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in settings.ALLOWED_TEXT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {settings.ALLOWED_TEXT_EXTENSIONS}"
        )
    
    # Save file
    doc_id = uuid.uuid4()
    file_name = f"{doc_id}{file_ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, file_name)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Parse field mappings
    mappings = None
    if field_mappings:
        try:
            mappings = json.loads(field_mappings)
        except:
            pass
    
    # Process text data
    try:
        processor = TextDataProcessor()
        records_data, errors = processor.process_file(file_path, mappings)
        
        # Get village
        village_uuid = None
        if village_id:
            result = await db.execute(
                select(Village).where(Village.id == uuid.UUID(village_id))
            )
            village = result.scalar_one_or_none()
            if village:
                village_uuid = village.id
        
        # Insert text records
        records_count = 0
        for record_data in records_data:
            # Convert raw data to JSON string
            raw_data_json_str = json.dumps(record_data) if record_data else None
            
            record = TextRecord(
                record_id=record_data.get("record_id", f"R_{records_count}"),
                plot_id=record_data.get("plot_id", ""),
                owner_name=record_data.get("owner_name", "Unknown"),
                area_declared=record_data.get("area", 0),
                area_unit=record_data.get("area_unit", "sqm"),
                village_id=village_uuid,
                khata_number=record_data.get("khata_number"),
                khasra_number=record_data.get("khasra_number"),
                father_name=record_data.get("father_name"),
                source_file=file.filename,
                raw_data_json=raw_data_json_str
            )
            db.add(record)
            records_count += 1
        
        # Create document record
        doc = Document(
            id=doc_id,
            file_name=file_name,
            original_name=file.filename,
            file_type="text",
            mime_type=file.content_type,
            storage_path=file_path,
            file_size=len(content),
            processing_status="completed",
            records_count=records_count,
            uploaded_by=uuid.UUID(current_user.get("sub"))
        )
        db.add(doc)
        await db.commit()
        
        return UploadResponse(
            document_id=doc_id,
            file_name=file.filename,
            file_type="text",
            records_count=records_count,
            status="completed",
            errors=errors if errors else None
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
