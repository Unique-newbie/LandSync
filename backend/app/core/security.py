"""Security utilities - JWT, password hashing, RBAC"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings


# JWT Bearer
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    return payload


# RBAC Permissions
class Permission:
    """Permission definitions"""
    VIEW_RECORDS = "view_records"
    VIEW_MAP = "view_map"
    UPLOAD_DATA = "upload_data"
    EDIT_RECORDS = "edit_records"
    VERIFY_RECORDS = "verify_records"
    VERIFY_MATCHES = "verify_matches"
    RUN_RECONCILIATION = "run_reconciliation"
    MANAGE_USERS = "manage_users"
    MANAGE_VILLAGES = "manage_villages"
    GENERATE_REPORTS = "generate_reports"
    GOV_SYNC = "gov_sync"
    SYNC_GOV_DATA = "sync_gov_data"
    ESIGN_DOCS = "esign_docs"
    VIEW_AUDIT = "view_audit"
    ADMIN = "admin"


# Role definitions with permissions
ROLE_PERMISSIONS = {
    "admin": [
        Permission.VIEW_RECORDS, Permission.VIEW_MAP, Permission.UPLOAD_DATA, 
        Permission.EDIT_RECORDS, Permission.VERIFY_RECORDS, Permission.VERIFY_MATCHES,
        Permission.RUN_RECONCILIATION, Permission.MANAGE_USERS, 
        Permission.MANAGE_VILLAGES, Permission.GENERATE_REPORTS,
        Permission.GOV_SYNC, Permission.SYNC_GOV_DATA, Permission.ESIGN_DOCS,
        Permission.VIEW_AUDIT, Permission.ADMIN
    ],
    "officer": [
        Permission.VIEW_RECORDS, Permission.VIEW_MAP, Permission.EDIT_RECORDS, 
        Permission.VERIFY_RECORDS, Permission.VERIFY_MATCHES,
        Permission.RUN_RECONCILIATION, Permission.MANAGE_VILLAGES,
        Permission.GENERATE_REPORTS, Permission.GOV_SYNC, Permission.SYNC_GOV_DATA,
        Permission.ESIGN_DOCS, Permission.VIEW_AUDIT
    ],
    "surveyor": [
        Permission.VIEW_RECORDS, Permission.VIEW_MAP, Permission.UPLOAD_DATA, 
        Permission.GENERATE_REPORTS, Permission.RUN_RECONCILIATION
    ],
    "viewer": [
        Permission.VIEW_RECORDS, Permission.VIEW_MAP
    ]
}


def check_permission(user_role: str, required_permission: str) -> bool:
    """Check if a role has a specific permission"""
    permissions = ROLE_PERMISSIONS.get(user_role, [])
    return required_permission in permissions


class RequirePermission:
    """Dependency to require specific permission"""
    
    def __init__(self, permission: str):
        self.permission = permission
    
    async def __call__(self, user: Dict = Depends(get_current_user)):
        role = user.get("role", "viewer")
        if not check_permission(role, self.permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.permission} required"
            )
        return user
