"""Government Integration API endpoints (Sandbox Mode)"""

from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, RequirePermission, Permission
from app.models.models import User, GovSyncLog
from app.schemas.schemas import (
    AadhaarVerifyRequest, AadhaarVerifyResponse,
    DigiLockerPullRequest, DigiLockerResponse,
    BhulekhSyncRequest, BhulekhSyncResponse,
    ESignRequest, ESignResponse
)


router = APIRouter()


# =============================================================================
# AADHAAR VERIFICATION (SANDBOX)
# =============================================================================

@router.post("/aadhaar/verify", response_model=AadhaarVerifyResponse)
async def verify_aadhaar(
    request: AadhaarVerifyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Verify Aadhaar number using eKYC.
    
    **Note**: This is in SANDBOX mode. In production, this would integrate with UIDAI.
    """
    
    if not settings.GOV_SANDBOX_MODE:
        raise HTTPException(
            status_code=503,
            detail="Aadhaar verification requires production credentials"
        )
    
    # Sandbox mock response
    mock_response = {
        "success": True,
        "name": "Test User (Sandbox)",
        "address": "123 Test Street, Jaipur, Rajasthan 302001",
        "photo": None,  # Base64 encoded in production
        "error": None
    }
    
    # Validate test Aadhaar numbers
    test_numbers = ["123456789012", "999999999999"]
    if request.aadhaar_number not in test_numbers:
        mock_response["success"] = True  # Accept any 12-digit number in sandbox
    
    # Log the request
    log = GovSyncLog(
        service_name="aadhaar",
        request_type="verify",
        status="success" if mock_response["success"] else "failed",
        response_data=mock_response,
        user_id=UUID(current_user.get("sub"))
    )
    db.add(log)
    
    # Update user's Aadhaar verification status if successful
    if mock_response["success"]:
        import hashlib
        result = await db.execute(
            select(User).where(User.id == UUID(current_user.get("sub")))
        )
        user = result.scalar_one_or_none()
        if user:
            user.aadhaar_verified = True
            user.aadhaar_hash = hashlib.sha256(request.aadhaar_number.encode()).hexdigest()
    
    await db.commit()
    
    return AadhaarVerifyResponse(**mock_response)


# =============================================================================
# DIGILOCKER INTEGRATION (SANDBOX)
# =============================================================================

@router.post("/digilocker/pull", response_model=DigiLockerResponse)
async def pull_digilocker_document(
    request: DigiLockerPullRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Pull documents from DigiLocker.
    
    Supported document types:
    - land_record: 7/12 extracts, RoR
    - property_card: Property registration documents
    
    **Note**: SANDBOX mode - returns mock data.
    """
    
    if not settings.GOV_SANDBOX_MODE:
        raise HTTPException(
            status_code=503,
            detail="DigiLocker integration requires production credentials"
        )
    
    # Sandbox mock response
    mock_documents = {
        "land_record": {
            "document_type": "7/12 Extract",
            "plot_id": "TEST/123/456",
            "owner_name": "Test Owner",
            "area": "0.5 Hectare",
            "village": "Test Village",
            "taluka": "Test Taluka",
            "district": "Jaipur"
        },
        "property_card": {
            "document_type": "Property Card",
            "property_id": "PC/789/2024",
            "owner_name": "Test Owner",
            "address": "123 Test Street",
            "registration_date": "2024-01-15"
        }
    }
    
    doc_data = mock_documents.get(request.document_type)
    
    if not doc_data:
        return DigiLockerResponse(
            success=False,
            document_url=None,
            document_data=None,
            error=f"Unknown document type: {request.document_type}"
        )
    
    # Log the request
    log = GovSyncLog(
        service_name="digilocker",
        request_type="pull",
        status="success",
        response_data=doc_data,
        user_id=UUID(current_user.get("sub"))
    )
    db.add(log)
    await db.commit()
    
    return DigiLockerResponse(
        success=True,
        document_url=f"https://sandbox.digilocker.gov.in/docs/{request.document_id}",
        document_data=doc_data,
        error=None
    )


# =============================================================================
# BHULEKH SYNC (SANDBOX)
# =============================================================================

@router.post("/bhulekh/sync", response_model=BhulekhSyncResponse)
async def sync_bhulekh_records(
    request: BhulekhSyncRequest,
    current_user: dict = Depends(RequirePermission(Permission.SYNC_GOV_DATA)),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync land records from Bhulekh portal.
    
    Sync types:
    - full: Complete sync of all records
    - incremental: Sync only changed records
    
    **Note**: SANDBOX mode - simulates sync operation.
    """
    
    if not settings.GOV_SANDBOX_MODE:
        raise HTTPException(
            status_code=503,
            detail="Bhulekh sync requires production credentials"
        )
    
    # Sandbox mock response
    import random
    
    mock_response = {
        "success": True,
        "records_synced": random.randint(50, 200),
        "records_updated": random.randint(5, 20),
        "records_failed": random.randint(0, 3),
        "errors": None
    }
    
    if mock_response["records_failed"] > 0:
        mock_response["errors"] = [
            {"record_id": f"REC_{i}", "error": "Mock validation error"}
            for i in range(mock_response["records_failed"])
        ]
    
    # Log the request
    log = GovSyncLog(
        service_name="bhulekh",
        request_type=f"sync_{request.sync_type}",
        status="success",
        response_data=mock_response,
        user_id=UUID(current_user.get("sub"))
    )
    db.add(log)
    await db.commit()
    
    return BhulekhSyncResponse(**mock_response)


# =============================================================================
# eSIGN (SANDBOX)
# =============================================================================

@router.post("/esign/sign", response_model=ESignResponse)
async def esign_document(
    request: ESignRequest,
    current_user: dict = Depends(RequirePermission(Permission.ESIGN_DOCS)),
    db: AsyncSession = Depends(get_db)
):
    """
    Digitally sign a document using Aadhaar eSign.
    
    **Note**: SANDBOX mode - simulates eSign operation.
    """
    
    if not settings.GOV_SANDBOX_MODE:
        raise HTTPException(
            status_code=503,
            detail="eSign requires production credentials"
        )
    
    # Check if user is Aadhaar verified
    result = await db.execute(
        select(User).where(User.id == UUID(current_user.get("sub")))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.aadhaar_verified:
        return ESignResponse(
            success=False,
            signed_document_url=None,
            signature_id=None,
            error="Aadhaar verification required for eSign"
        )
    
    # Sandbox mock response
    import uuid as uuid_lib
    signature_id = str(uuid_lib.uuid4())
    
    mock_response = {
        "success": True,
        "signed_document_url": f"https://sandbox.esign.gov.in/signed/{signature_id}",
        "signature_id": signature_id,
        "error": None
    }
    
    # Log the request
    log = GovSyncLog(
        service_name="esign",
        request_type="sign",
        status="success",
        response_data={"signature_id": signature_id, "document_id": str(request.document_id)},
        user_id=UUID(current_user.get("sub"))
    )
    db.add(log)
    await db.commit()
    
    return ESignResponse(**mock_response)


# =============================================================================
# STATUS & LOGS
# =============================================================================

@router.get("/status")
async def get_gov_integration_status(
    current_user: dict = Depends(get_current_user)
):
    """Get government integration status"""
    
    return {
        "sandbox_mode": settings.GOV_SANDBOX_MODE,
        "services": {
            "aadhaar": {
                "status": "available" if settings.GOV_SANDBOX_MODE else "requires_production",
                "endpoint": "UIDAI eKYC API"
            },
            "digilocker": {
                "status": "available" if settings.GOV_SANDBOX_MODE else "requires_production",
                "endpoint": "DigiLocker Pull API"
            },
            "bhulekh": {
                "status": "available" if settings.GOV_SANDBOX_MODE else "requires_production",
                "endpoint": "State Land Records Portal"
            },
            "esign": {
                "status": "available" if settings.GOV_SANDBOX_MODE else "requires_production",
                "endpoint": "Aadhaar eSign API"
            }
        }
    }


@router.get("/logs")
async def get_gov_sync_logs(
    service: str = None,
    limit: int = 50,
    current_user: dict = Depends(RequirePermission(Permission.VIEW_AUDIT)),
    db: AsyncSession = Depends(get_db)
):
    """Get government integration logs"""
    
    query = select(GovSyncLog)
    
    if service:
        query = query.where(GovSyncLog.service_name == service)
    
    query = query.order_by(GovSyncLog.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [
        {
            "id": str(log.id),
            "service": log.service_name,
            "request_type": log.request_type,
            "status": log.status,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]
