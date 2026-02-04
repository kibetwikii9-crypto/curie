"""Security API routes."""
import logging
import secrets
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import TwoFactorAuth, IPAllowlist, Session as SessionModel, APIKey, AuditLog, User as UserModel
from app.routes.auth import get_current_user, get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/security", tags=["security"])


# ========== PYDANTIC MODELS ==========

class TwoFactorAuthSetup(BaseModel):
    secret: str
    backup_codes: List[str]


class IPAllowlistCreate(BaseModel):
    ip_address: str
    description: Optional[str] = None


class APIKeyCreate(BaseModel):
    name: str
    permissions: Optional[List[str]] = []
    expires_at: Optional[str] = None


# ========== 2FA ENDPOINTS ==========

@router.get("/2fa/status", response_model=dict)
async def get_2fa_status(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get 2FA status for current user."""
    two_fa = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    
    return {
        "is_enabled": two_fa.is_enabled if two_fa else False,
        "has_backup_codes": bool(two_fa and two_fa.backup_codes) if two_fa else False,
    }


@router.post("/2fa/setup", response_model=TwoFactorAuthSetup)
async def setup_2fa(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Setup 2FA for current user."""
    import pyotp
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Generate backup codes
    backup_codes = [secrets.token_hex(4) for _ in range(10)]
    
    two_fa = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if two_fa:
        two_fa.secret = secret
        import json
        two_fa.backup_codes = json.dumps(backup_codes)
    else:
        import json
        two_fa = TwoFactorAuth(
            user_id=current_user.id,
            secret=secret,
            backup_codes=json.dumps(backup_codes),
            is_enabled=False,
        )
        db.add(two_fa)
    
    db.commit()
    
    return {
        "secret": secret,
        "backup_codes": backup_codes,
    }


@router.post("/2fa/enable", status_code=status.HTTP_204_NO_CONTENT)
async def enable_2fa(
    code: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable 2FA after verification."""
    import pyotp
    
    two_fa = db.query(TwoFactorAuth).filter(TwoFactorAuth.user_id == current_user.id).first()
    if not two_fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not set up. Please set up first."
        )
    
    totp = pyotp.TOTP(two_fa.secret)
    if not totp.verify(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    two_fa.is_enabled = True
    db.commit()
    
    return None


# ========== SESSION ENDPOINTS ==========

@router.get("/sessions/", response_model=List[dict])
async def get_sessions(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get active sessions for current user."""
    sessions = db.query(SessionModel).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_active == True
    ).all()
    
    return [{
        "id": s.id,
        "ip_address": s.ip_address,
        "user_agent": s.user_agent,
        "created_at": s.created_at.isoformat(),
        "last_activity": s.last_activity.isoformat(),
    } for s in sessions]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke a session."""
    session = db.query(SessionModel).filter(
        SessionModel.id == session_id,
        SessionModel.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    session.is_active = False
    db.commit()
    
    return None


# ========== API KEY ENDPOINTS ==========

@router.get("/api-keys/", response_model=List[dict])
async def get_api_keys(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get API keys for business."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key access requires a business account"
        )
    
    api_keys = db.query(APIKey).filter(APIKey.business_id == business_id).all()
    
    return [{
        "id": k.id,
        "name": k.name,
        "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        "expires_at": k.expires_at.isoformat() if k.expires_at else None,
        "is_active": k.is_active,
        "created_at": k.created_at.isoformat(),
    } for k in api_keys]


@router.post("/api-keys/", response_model=dict)
async def create_api_key(
    key_data: APIKeyCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new API key."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key creation requires a business account"
        )
    
    # Generate API key
    api_key = secrets.token_urlsafe(32)
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    
    import json
    api_key_obj = APIKey(
        business_id=business_id,
        user_id=current_user.id,
        name=key_data.name,
        key_hash=key_hash,
        permissions=json.dumps(key_data.permissions) if key_data.permissions else None,
    )
    
    db.add(api_key_obj)
    db.commit()
    db.refresh(api_key_obj)
    
    # Return the key only once (client should save it)
    return {
        "id": api_key_obj.id,
        "name": api_key_obj.name,
        "key": api_key,  # Only returned once
        "created_at": api_key_obj.created_at.isoformat(),
    }


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke an API key."""
    business_id = get_user_business_id(current_user, db)
    
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.business_id == business_id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    api_key.is_active = False
    db.commit()
    
    return None


# ========== AUDIT LOG ENDPOINTS ==========

@router.get("/audit-logs/", response_model=List[dict])
async def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get audit logs."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Audit log access requires a business account"
        )
    
    query = db.query(AuditLog).filter(AuditLog.business_id == business_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    offset = (page - 1) * limit
    logs = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    
    return [{
        "id": log.id,
        "user_id": log.user_id,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat(),
    } for log in logs]


# ========== IP ALLOWLIST ENDPOINTS ==========

@router.get("/ip-allowlist/", response_model=List[dict])
async def get_ip_allowlist(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get IP allowlist for business."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP allowlist access requires a business account"
        )
    
    ip_list = db.query(IPAllowlist).filter(
        IPAllowlist.business_id == business_id
    ).all()
    
    return [{
        "id": ip.id,
        "ip_address": ip.ip_address,
        "description": ip.description,
        "is_active": ip.is_active,
        "created_at": ip.created_at.isoformat(),
        "created_by_user_id": ip.created_by_user_id,
    } for ip in ip_list]


@router.post("/ip-allowlist/", response_model=dict)
async def create_ip_allowlist(
    ip_data: IPAllowlistCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add IP to allowlist."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="IP allowlist creation requires a business account"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    ip_entry = IPAllowlist(
        business_id=business_id,
        ip_address=ip_data.ip_address,
        description=ip_data.description,
        created_by_user_id=current_user.id,
    )
    
    db.add(ip_entry)
    db.commit()
    db.refresh(ip_entry)
    
    return {
        "id": ip_entry.id,
        "ip_address": ip_entry.ip_address,
        "description": ip_entry.description,
        "is_active": ip_entry.is_active,
        "created_at": ip_entry.created_at.isoformat(),
    }


@router.delete("/ip-allowlist/{ip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ip_allowlist(
    ip_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove IP from allowlist."""
    business_id = get_user_business_id(current_user, db)
    
    ip_entry = db.query(IPAllowlist).filter(
        IPAllowlist.id == ip_id,
        IPAllowlist.business_id == business_id
    ).first()
    
    if not ip_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IP allowlist entry not found"
        )
    
    # Check permissions
    if current_user.role not in ["admin", "business_owner"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    
    db.delete(ip_entry)
    db.commit()
    
    return None


# ========== SECURITY STATS ENDPOINT ==========

@router.get("/stats/dashboard")
async def get_security_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get security statistics for dashboard."""
    business_id = get_user_business_id(current_user, db)
    
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # 2FA status
    two_fa = db.query(TwoFactorAuth).filter(
        TwoFactorAuth.user_id == current_user.id
    ).first()
    
    two_fa_enabled = two_fa.is_enabled if two_fa else False
    
    # Active sessions count
    active_sessions = db.query(func.count(SessionModel.id)).filter(
        SessionModel.user_id == current_user.id,
        SessionModel.is_active == True
    ).scalar() or 0
    
    # API keys count
    api_keys_count = 0
    if business_id:
        api_keys_count = db.query(func.count(APIKey.id)).filter(
            APIKey.business_id == business_id,
            APIKey.is_active == True
        ).scalar() or 0
    
    # IP allowlist count
    ip_allowlist_count = 0
    if business_id:
        ip_allowlist_count = db.query(func.count(IPAllowlist.id)).filter(
            IPAllowlist.business_id == business_id,
            IPAllowlist.is_active == True
        ).scalar() or 0
    
    # Recent audit logs (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_audit_logs = 0
    if business_id:
        recent_audit_logs = db.query(func.count(AuditLog.id)).filter(
            AuditLog.business_id == business_id,
            AuditLog.created_at >= seven_days_ago
        ).scalar() or 0
    
    # Security score calculation
    score = 0
    factors = []
    
    # 2FA enabled (+30 points)
    if two_fa_enabled:
        score += 30
        factors.append({"factor": "2FA enabled", "points": 30})
    else:
        factors.append({"factor": "2FA disabled", "points": 0})
    
    # Active sessions (< 3 is better, +20 points)
    if active_sessions <= 2:
        score += 20
        factors.append({"factor": f"Minimal active sessions ({active_sessions})", "points": 20})
    elif active_sessions <= 5:
        score += 10
        factors.append({"factor": f"Moderate active sessions ({active_sessions})", "points": 10})
    else:
        factors.append({"factor": f"Many active sessions ({active_sessions})", "points": 0})
    
    # API keys exist (+10 points for having security setup)
    if api_keys_count > 0:
        score += 10
        factors.append({"factor": "API keys configured", "points": 10})
    
    # IP allowlist (+20 points if configured)
    if ip_allowlist_count > 0:
        score += 20
        factors.append({"factor": "IP allowlist configured", "points": 20})
    
    # Audit logging active (+20 points)
    if recent_audit_logs > 0:
        score += 20
        factors.append({"factor": "Audit logging active", "points": 20})
    
    # Determine security level
    if score >= 80:
        security_level = "excellent"
    elif score >= 60:
        security_level = "good"
    elif score >= 40:
        security_level = "fair"
    else:
        security_level = "poor"
    
    return {
        "two_fa_enabled": two_fa_enabled,
        "active_sessions": active_sessions,
        "api_keys_count": api_keys_count,
        "ip_allowlist_count": ip_allowlist_count,
        "recent_audit_logs": recent_audit_logs,
        "security_score": score,
        "security_level": security_level,
        "score_factors": factors,
        "max_score": 100,
    }

