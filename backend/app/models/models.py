"""Database Models - SQLite/PostgreSQL Compatible"""

import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Boolean, DateTime, ForeignKey, 
    Numeric, Integer, JSON, Index
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
import enum

from app.core.database import Base


class MatchStatus(str, enum.Enum):
    """Match status enumeration"""
    MATCHED = "matched"
    PARTIAL = "partial"
    MISMATCH = "mismatch"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ConfidenceLevel(str, enum.Enum):
    """Confidence level enumeration"""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# =============================================================================
# USER MANAGEMENT
# =============================================================================

class Role(Base):
    """User roles with RBAC permissions"""
    __tablename__ = "roles"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    permissions: Mapped[Optional[str]] = mapped_column(Text)  # JSON string
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="role")


class User(Base):
    """User accounts"""
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Role
    role_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("roles.id"))
    role: Mapped[Optional["Role"]] = relationship("Role", back_populates="users")
    
    # Aadhaar verification
    aadhaar_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    aadhaar_hash: Mapped[Optional[str]] = mapped_column(String(64))
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audit_logs: Mapped[List["AuditLog"]] = relationship("AuditLog", back_populates="user")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="generated_by_user")


# =============================================================================
# GEOGRAPHIC DATA
# =============================================================================

class Village(Base):
    """Village master data"""
    __tablename__ = "villages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    village_id: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    name_hindi: Mapped[Optional[str]] = mapped_column(String(100))
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    tehsil: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(50), default="Rajasthan")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    parcels: Mapped[List["Parcel"]] = relationship("Parcel", back_populates="village")
    text_records: Mapped[List["TextRecord"]] = relationship("TextRecord", back_populates="village")
    
    __table_args__ = (
        Index("idx_village_district", "district"),
    )


class Parcel(Base):
    """Spatial parcel data - geometry stored as GeoJSON text"""
    __tablename__ = "parcels"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plot_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    owner_name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_name_hindi: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Area
    area_sqm: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False)
    area_hectares: Mapped[Optional[float]] = mapped_column(Numeric(15, 6))
    area_bigha: Mapped[Optional[float]] = mapped_column(Numeric(15, 4))
    
    # Geometry stored as GeoJSON text (SQLite compatible)
    geometry_json: Mapped[str] = mapped_column(Text, nullable=False)
    centroid_lat: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    centroid_lng: Mapped[Optional[float]] = mapped_column(Numeric(10, 6))
    
    # Village reference
    village_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("villages.id"))
    village: Mapped[Optional["Village"]] = relationship("Village", back_populates="parcels")
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, verified, mismatch, disputed
    
    # Metadata
    source_file: Mapped[Optional[str]] = mapped_column(String(255))
    source_layer: Mapped[Optional[str]] = mapped_column(String(100))
    attributes_json: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    matches: Mapped[List["Match"]] = relationship("Match", back_populates="parcel")
    
    __table_args__ = (
        Index("idx_parcel_plot_village", "plot_id", "village_id"),
    )


class TextRecord(Base):
    """Textual land records from CSV/Excel"""
    __tablename__ = "text_records"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    plot_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    owner_name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_name_hindi: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Area (declared in records)
    area_declared: Mapped[float] = mapped_column(Numeric(15, 4), nullable=False)
    area_unit: Mapped[str] = mapped_column(String(20), default="sqm")
    
    # Village reference
    village_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("villages.id"))
    village: Mapped[Optional["Village"]] = relationship("Village", back_populates="text_records")
    
    # Additional fields
    khata_number: Mapped[Optional[str]] = mapped_column(String(50))
    khasra_number: Mapped[Optional[str]] = mapped_column(String(50))
    father_name: Mapped[Optional[str]] = mapped_column(String(200))
    
    # Metadata
    source_file: Mapped[Optional[str]] = mapped_column(String(255))
    raw_data_json: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    matches: Mapped[List["Match"]] = relationship("Match", back_populates="text_record")
    
    __table_args__ = (
        Index("idx_text_record_village", "village_id"),
    )


# =============================================================================
# MATCHING & RECONCILIATION
# =============================================================================

class Match(Base):
    """Reconciliation matches between parcels and text records"""
    __tablename__ = "matches"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Linked records
    parcel_id: Mapped[str] = mapped_column(String(36), ForeignKey("parcels.id"))
    parcel: Mapped["Parcel"] = relationship("Parcel", back_populates="matches")
    
    text_record_id: Mapped[str] = mapped_column(String(36), ForeignKey("text_records.id"))
    text_record: Mapped["TextRecord"] = relationship("TextRecord", back_populates="matches")
    
    # Match scores
    match_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    name_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    area_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    id_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    
    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending")
    confidence_level: Mapped[Optional[str]] = mapped_column(String(20))
    
    # Algorithm details (JSON string)
    algorithm_details_json: Mapped[Optional[str]] = mapped_column(Text)
    
    # Verification
    verified_by_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_match_status", "status"),
        Index("idx_match_score", "match_score"),
    )


# =============================================================================
# AUDIT & LOGGING
# =============================================================================

class AuditLog(Base):
    """Audit trail for all changes"""
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    user: Mapped[Optional["User"]] = relationship("User", back_populates="audit_logs")
    
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    
    changes_json: Mapped[Optional[str]] = mapped_column(Text)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_audit_entity", "entity_type", "entity_id"),
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_created", "created_at"),
    )


class GovSyncLog(Base):
    """Government service integration logs"""
    __tablename__ = "gov_sync_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    service_name: Mapped[str] = mapped_column(String(50), nullable=False)
    request_type: Mapped[str] = mapped_column(String(30), nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    response_code: Mapped[Optional[int]] = mapped_column(Integer)
    response_data_json: Mapped[Optional[str]] = mapped_column(Text)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_gov_sync_service", "service_name", "created_at"),
    )


# =============================================================================
# REPORTS & DOCUMENTS
# =============================================================================

class Report(Base):
    """Generated reports"""
    __tablename__ = "reports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    report_type: Mapped[str] = mapped_column(String(30), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    
    parameters_json: Mapped[Optional[str]] = mapped_column(Text)
    
    generated_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    generated_by_user: Mapped["User"] = relationship("User", back_populates="reports")
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Document(Base):
    """Uploaded documents"""
    __tablename__ = "documents"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(20), nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    
    processing_status: Mapped[str] = mapped_column(String(20), default="pending")
    processing_errors_json: Mapped[Optional[str]] = mapped_column(Text)
    records_count: Mapped[Optional[int]] = mapped_column(Integer)
    
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
