"""Pydantic schemas for API request/response validation"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class MatchStatusEnum(str, Enum):
    MATCHED = "matched"
    PARTIAL = "partial"
    MISMATCH = "mismatch"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ConfidenceLevelEnum(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RoleEnum(str, Enum):
    ADMIN = "admin"
    OFFICER = "officer"
    SURVEYOR = "surveyor"
    VIEWER = "viewer"


# =============================================================================
# AUTH SCHEMAS
# =============================================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    role: RoleEnum = RoleEnum.VIEWER


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    phone: Optional[str]
    role: str
    aadhaar_verified: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# VILLAGE SCHEMAS
# =============================================================================

class VillageBase(BaseModel):
    village_id: str
    name: str
    name_hindi: Optional[str] = None
    district: str
    tehsil: Optional[str] = None
    state: str = "Rajasthan"


class VillageCreate(VillageBase):
    pass


class VillageResponse(VillageBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# PARCEL SCHEMAS
# =============================================================================

class ParcelBase(BaseModel):
    plot_id: str
    owner_name: str
    owner_name_hindi: Optional[str] = None
    area_sqm: float
    village_id: UUID


class ParcelCreate(ParcelBase):
    geometry: Dict[str, Any]  # GeoJSON


class ParcelResponse(ParcelBase):
    id: UUID
    area_hectares: Optional[float]
    area_bigha: Optional[float]
    geometry: Optional[Dict[str, Any]]  # GeoJSON
    centroid: Optional[Dict[str, Any]]
    source_file: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ParcelGeoJSON(BaseModel):
    """GeoJSON Feature for a parcel"""
    type: str = "Feature"
    id: UUID
    geometry: Dict[str, Any]
    properties: Dict[str, Any]


# =============================================================================
# TEXT RECORD SCHEMAS
# =============================================================================

class TextRecordBase(BaseModel):
    record_id: str
    plot_id: str
    owner_name: str
    owner_name_hindi: Optional[str] = None
    area_declared: float
    area_unit: str = "sqm"
    village_id: UUID


class TextRecordCreate(TextRecordBase):
    khata_number: Optional[str] = None
    khasra_number: Optional[str] = None
    father_name: Optional[str] = None


class TextRecordResponse(TextRecordBase):
    id: UUID
    khata_number: Optional[str]
    khasra_number: Optional[str]
    father_name: Optional[str]
    source_file: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# MATCH SCHEMAS
# =============================================================================

class MatchBase(BaseModel):
    parcel_id: UUID
    text_record_id: UUID
    match_score: float = Field(..., ge=0, le=100)
    status: MatchStatusEnum


class MatchCreate(MatchBase):
    name_score: Optional[float] = None
    area_score: Optional[float] = None
    id_score: Optional[float] = None
    confidence_level: Optional[ConfidenceLevelEnum] = None
    algorithm_details: Optional[Dict[str, Any]] = None


class MatchResponse(MatchBase):
    id: UUID
    name_score: Optional[float]
    area_score: Optional[float]
    id_score: Optional[float]
    confidence_level: Optional[ConfidenceLevelEnum]
    algorithm_details: Optional[Dict[str, Any]]
    verified_by_id: Optional[UUID]
    verified_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MatchVerifyRequest(BaseModel):
    status: MatchStatusEnum
    rejection_reason: Optional[str] = None


class ReconcileRequest(BaseModel):
    village_id: Optional[UUID] = None
    algorithm: str = "combined"  # levenshtein, jaro_winkler, cosine, combined
    area_tolerance: float = 5.0  # Percentage


class ReconcileResponse(BaseModel):
    total_parcels: int
    total_records: int
    matches_found: int
    partial_matches: int
    mismatches: int
    processing_time_ms: int
    matches: List[MatchResponse]


# =============================================================================
# SEARCH SCHEMAS
# =============================================================================

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    search_type: str = "all"  # all, plot_id, owner_name, village
    village_id: Optional[UUID] = None
    fuzzy: bool = True
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)


class SearchResult(BaseModel):
    parcels: List[ParcelResponse]
    text_records: List[TextRecordResponse]
    total_parcels: int
    total_records: int


# =============================================================================
# UPLOAD SCHEMAS
# =============================================================================

class UploadResponse(BaseModel):
    document_id: UUID
    file_name: str
    file_type: str
    records_count: int
    status: str
    errors: Optional[List[Dict[str, Any]]] = None


class FieldMapping(BaseModel):
    source_field: str
    target_field: str


class UploadConfig(BaseModel):
    field_mappings: Optional[List[FieldMapping]] = None
    skip_validation: bool = False
    village_id: Optional[UUID] = None


# =============================================================================
# REPORT SCHEMAS
# =============================================================================

class ReportRequest(BaseModel):
    report_type: str  # reconciliation, mismatch, summary, village
    format: str = "pdf"  # pdf, excel, csv
    village_id: Optional[UUID] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    include_geometry: bool = False


class ReportResponse(BaseModel):
    id: UUID
    report_type: str
    format: str
    title: str
    description: Optional[str]
    file_path: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# GOVERNMENT INTEGRATION SCHEMAS
# =============================================================================

class AadhaarVerifyRequest(BaseModel):
    aadhaar_number: str = Field(..., min_length=12, max_length=12)
    otp: str = Field(..., min_length=6, max_length=6)


class AadhaarVerifyResponse(BaseModel):
    success: bool
    name: Optional[str]
    address: Optional[str]
    photo: Optional[str]  # Base64
    error: Optional[str]


class DigiLockerPullRequest(BaseModel):
    document_type: str  # land_record, property_card
    document_id: str


class DigiLockerResponse(BaseModel):
    success: bool
    document_url: Optional[str]
    document_data: Optional[Dict[str, Any]]
    error: Optional[str]


class BhulekhSyncRequest(BaseModel):
    village_id: UUID
    sync_type: str = "full"  # full, incremental


class BhulekhSyncResponse(BaseModel):
    success: bool
    records_synced: int
    records_updated: int
    records_failed: int
    errors: Optional[List[Dict[str, Any]]]


class ESignRequest(BaseModel):
    document_id: UUID
    signer_aadhaar: str


class ESignResponse(BaseModel):
    success: bool
    signed_document_url: Optional[str]
    signature_id: Optional[str]
    error: Optional[str]


# =============================================================================
# API RESPONSE WRAPPERS
# =============================================================================

class APIResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    pages: int
