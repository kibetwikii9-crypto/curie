"""Ads System API routes for campaign management, video editing, and analytics."""
import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Campaign, VideoProject, ABTest, CampaignPerformance, VideoTemplate
from app.routes.auth import get_user_business_id

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ads", tags=["ads"])

# ========== ENUMS ==========
class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"

class CampaignType(str, Enum):
    standard = "standard"
    ab_test = "ab_test"
    video = "video"
    automated = "automated"

class Platform(str, Enum):
    facebook = "facebook"
    instagram = "instagram"
    whatsapp = "whatsapp"
    telegram = "telegram"
    webchat = "webchat"
    email = "email"

class VideoProjectStatus(str, Enum):
    draft = "draft"
    rendering = "rendering"
    published = "published"
    failed = "failed"

class ABTestStatus(str, Enum):
    draft = "draft"
    running = "running"
    completed = "completed"
    cancelled = "cancelled"

# ========== PYDANTIC MODELS ==========
class CampaignCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    platform: Platform
    campaign_type: CampaignType = CampaignType.standard
    objective: str
    target_audience: Dict[str, Any] = {}
    budget: Optional[float] = None
    budget_type: str = "daily"
    scheduled_at: Optional[datetime] = None
    settings: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class CampaignUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CampaignStatus] = None
    objective: Optional[str] = None
    target_audience: Optional[Dict[str, Any]] = None
    budget: Optional[float] = None
    budget_type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    settings: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class VideoProjectCreateRequest(BaseModel):
    campaign_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    template_id: Optional[int] = None
    status: str = "draft"
    duration: str = "00:30"
    scenes: List[Dict[str, Any]] = []
    assets: List[Dict[str, Any]] = []

class VideoProjectUpdateRequest(BaseModel):
    campaign_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    template_id: Optional[int] = None
    status: Optional[str] = None
    duration: Optional[str] = None
    scenes: Optional[List[Dict[str, Any]]] = None
    assets: Optional[List[Dict[str, Any]]] = None


class SaveTemplateRequest(BaseModel):
    template_name: str

class VideoTemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    video_type: str
    duration: Optional[str]
    scenes: List[Dict[str, Any]]
    is_public: bool

class ABTestCreateRequest(BaseModel):
    campaign_id: int
    name: str
    description: Optional[str] = None
    test_type: str
    variants: List[Dict[str, Any]]
    test_duration_days: int = 7
    min_sample_size: int = 1000

class CampaignPerformanceData(BaseModel):
    date: datetime
    platform: str
    impressions: int = 0
    reach: int = 0
    clicks: int = 0
    engagements: int = 0
    shares: int = 0
    comments: int = 0
    likes: int = 0
    saves: int = 0
    conversions: int = 0
    spend: float = 0.0
    ctr: float = 0.0
    cpc: float = 0.0
    cpm: float = 0.0
    roas: float = 0.0
    conversion_rate: float = 0.0
    frequency: float = 0.0
    metadata: Dict[str, Any] = {}


def _parse_json_field(value, default):
    """Handle JSON strings and native list/dict values safely."""
    if value is None:
        return default
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            log.warning("Failed to decode JSON field")
            return default
    return default


def _autogen_template_thumbnail(template_name: str, assets: Any) -> str:
    """Generate a thumbnail URL from assets, or fallback SVG data URL."""
    parsed_assets = _parse_json_field(assets, [])
    if isinstance(parsed_assets, list):
        for asset in parsed_assets:
            if not isinstance(asset, dict):
                continue
            url = asset.get("url")
            if isinstance(url, str) and url and not url.startswith("blob:"):
                return url

    # Fallback: deterministic simple SVG thumbnail based on template name
    initials = "".join([part[0] for part in template_name.split()[:2]]).upper() or "VT"
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>"
        "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
        "<stop offset='0%' stop-color='#0ea5e9'/>"
        "<stop offset='100%' stop-color='#6366f1'/>"
        "</linearGradient></defs>"
        "<rect width='1280' height='720' fill='url(#g)'/>"
        f"<text x='50%' y='52%' dominant-baseline='middle' text-anchor='middle' "
        "font-family='Arial, sans-serif' font-size='180' fill='white' opacity='0.95'>"
        f"{initials}</text></svg>"
    )
    import urllib.parse
    return "data:image/svg+xml;utf8," + urllib.parse.quote(svg)

# ========== CAMPAIGN ENDPOINTS ==========
@router.get("/campaigns", response_model=None)
async def get_campaigns(
    status: Optional[CampaignStatus] = None,
    platform: Optional[Platform] = None,
    campaign_type: Optional[CampaignType] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get campaigns for the business with optional filtering."""
    query = db.query(Campaign).filter(Campaign.business_id == business_id)

    if status:
        query = query.filter(Campaign.status == status)
    if platform:
        query = query.filter(Campaign.platform == platform)
    if campaign_type:
        query = query.filter(Campaign.campaign_type == campaign_type)

    campaigns = query.order_by(desc(Campaign.created_at)).offset(offset).limit(limit).all()

    return {
        "campaigns": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "platform": c.platform,
                "status": c.status,
                "campaign_type": c.campaign_type,
                "objective": c.objective,
                "budget": c.budget,
                "budget_type": c.budget_type,
                "scheduled_at": c.scheduled_at,
                "started_at": c.started_at,
                "completed_at": c.completed_at,
                "created_at": c.created_at,
                "updated_at": c.updated_at
            }
            for c in campaigns
        ],
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }

@router.post("/campaigns")
async def create_campaign(
    request: CampaignCreateRequest,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Create a new campaign."""
    campaign = Campaign(
        business_id=business_id,
        name=request.name,
        description=request.description,
        platform=request.platform,
        campaign_type=request.campaign_type,
        objective=request.objective,
        target_audience=request.target_audience,
        budget=request.budget,
        budget_type=request.budget_type,
        scheduled_at=request.scheduled_at,
        settings=request.settings,
        extra_data=request.metadata
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return {
        "id": campaign.id,
        "message": "Campaign created successfully",
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "platform": campaign.platform,
            "created_at": campaign.created_at
        }
    }

@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get a specific campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return {
        "id": campaign.id,
        "business_id": campaign.business_id,
        "name": campaign.name,
        "description": campaign.description,
        "platform": campaign.platform,
        "status": campaign.status,
        "campaign_type": campaign.campaign_type,
        "objective": campaign.objective,
        "target_audience": campaign.target_audience,
        "budget": campaign.budget,
        "budget_type": campaign.budget_type,
        "scheduled_at": campaign.scheduled_at,
        "started_at": campaign.started_at,
        "completed_at": campaign.completed_at,
        "settings": campaign.settings,
        "metadata": campaign.extra_data or {},
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at
    }

@router.put("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: int,
    request: CampaignUpdateRequest,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Update a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Update fields
    update_data = request.dict(exclude_unset=True)
    field_map = {
        "metadata": "extra_data",
    }
    for field, value in update_data.items():
        setattr(campaign, field_map.get(field, field), value)

    db.commit()
    db.refresh(campaign)

    return {
        "id": campaign.id,
        "message": "Campaign updated successfully",
        "campaign": {
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "updated_at": campaign.updated_at
        }
    }

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Delete a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status in ["running", "scheduled"]:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete a running or scheduled campaign"
        )

    db.delete(campaign)
    db.commit()

    return {"message": "Campaign deleted successfully"}


@router.get("/campaigns/{campaign_id}/stats")
async def get_campaign_stats(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get aggregate stats for a single campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    result = db.query(
        func.sum(CampaignPerformance.impressions).label("impressions"),
        func.sum(CampaignPerformance.clicks).label("clicks"),
        func.sum(CampaignPerformance.conversions).label("conversions"),
        func.sum(CampaignPerformance.spend).label("spend"),
        func.avg(CampaignPerformance.ctr).label("ctr"),
        func.avg(CampaignPerformance.cpc).label("cpc"),
        func.avg(CampaignPerformance.cpm).label("cpm"),
        func.avg(CampaignPerformance.roas).label("roas"),
    ).filter(
        CampaignPerformance.business_id == business_id,
        CampaignPerformance.campaign_id == campaign_id
    ).first()

    return {
        "impressions": int(result.impressions or 0),
        "clicks": int(result.clicks or 0),
        "conversions": int(result.conversions or 0),
        "spend": float(result.spend or 0.0),
        "ctr": float(result.ctr or 0.0),
        "cpc": float(result.cpc or 0.0),
        "cpm": float(result.cpm or 0.0),
        "roas": float(result.roas or 0.0),
    }

@router.post("/campaigns/{campaign_id}/start")
async def start_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Start a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status != "scheduled":
        raise HTTPException(
            status_code=400,
            detail="Campaign must be in scheduled status to start"
        )

    campaign.status = "running"
    campaign.started_at = datetime.utcnow()
    db.commit()

    return {"message": "Campaign started successfully"}

@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Pause a running campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status != "running":
        raise HTTPException(
            status_code=400,
            detail="Campaign must be running to pause"
        )

    campaign.status = "paused"
    db.commit()

    return {"message": "Campaign paused successfully"}

@router.post("/campaigns/{campaign_id}/complete")
async def complete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Complete a campaign."""
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.status not in ["running", "paused"]:
        raise HTTPException(
            status_code=400,
            detail="Campaign must be running or paused to complete"
        )

    campaign.status = "completed"
    campaign.completed_at = datetime.utcnow()
    db.commit()

    return {"message": "Campaign completed successfully"}

# ========== VIDEO TEMPLATE ENDPOINTS ==========
@router.get("/video-templates", response_model=None)
async def get_video_templates(
    db: Session = Depends(get_db),
):
    """Get all public video templates (global + user's business templates)."""
    templates = db.query(VideoTemplate).filter(
        VideoTemplate.is_public == True
    ).all()

    return {
        "templates": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "video_type": t.video_type,
                "platform": t.platform,
                "duration": (_parse_json_field(t.template_config, {}) or {}).get("duration"),
                "scenes": (_parse_json_field(t.template_config, {}) or {}).get("scenes", []),
                "template_config": t.template_config,
                "thumbnail_url": t.thumbnail_url,
                "is_public": t.is_public
            }
            for t in templates
        ]
    }

@router.post("/video-projects/from-template/{template_id}", response_model=None)
async def create_video_project_from_template(
    template_id: int,
    project_name: str = Query(...),
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Create a new video project from a template."""
    template = db.query(VideoTemplate).filter(
        VideoTemplate.id == template_id,
        VideoTemplate.is_public == True
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    import json
    template_config = json.loads(template.template_config) if isinstance(template.template_config, str) else template.template_config

    project = VideoProject(
        business_id=business_id,
        name=project_name,
        description=template.description,
        template_id=template_id,
        status="draft",
        duration=template_config.get("duration", "00:30"),
        scenes=template_config.get("scenes", []),
        assets=[]
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "message": "Video project created from template successfully.",
        "project": {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "created_at": project.created_at
        }
    }

# ========== VIDEO PROJECT ENDPOINTS ==========
@router.get("/video-projects", response_model=None)
async def get_video_projects(
    campaign_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get video projects for the business."""
    query = db.query(VideoProject).filter(VideoProject.business_id == business_id)

    if campaign_id:
        query = query.filter(VideoProject.campaign_id == campaign_id)
    if status:
        query = query.filter(VideoProject.status == status)

    projects = query.order_by(desc(VideoProject.created_at)).offset(offset).limit(limit).all()

    return {
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "status": p.status,
                "duration": p.duration,
                "scenes": _parse_json_field(p.scenes, []),
                "assets": _parse_json_field(p.assets, []),
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None
            }
            for p in projects
        ],
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }

@router.post("/video-projects")
async def create_video_project(
    request: VideoProjectCreateRequest,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Create a new video project."""
    # Validate campaign_id if provided
    if request.campaign_id:
        campaign = db.query(Campaign).filter(
            Campaign.id == request.campaign_id,
            Campaign.business_id == business_id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

    project = VideoProject(
        business_id=business_id,
        campaign_id=request.campaign_id,
        name=request.name,
        description=request.description,
        template_id=request.template_id,
        status=request.status,
        duration=request.duration,
        scenes=request.scenes if request.scenes else None,
        assets=request.assets if request.assets else None
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "message": "Video project created successfully",
        "project": {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "created_at": project.created_at
        }
    }

@router.get("/video-projects/{project_id}")
async def get_video_project(
    project_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get a specific video project."""
    project = db.query(VideoProject).filter(
        VideoProject.id == project_id,
        VideoProject.business_id == business_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Video project not found")

    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "status": project.status,
        "duration": project.duration,
        "scenes": _parse_json_field(project.scenes, []),
        "assets": _parse_json_field(project.assets, []),
        "created_at": project.created_at.isoformat() if project.created_at else None,
        "updated_at": project.updated_at.isoformat() if project.updated_at else None
    }

@router.put("/video-projects/{project_id}")
async def update_video_project(
    project_id: int,
    request: VideoProjectUpdateRequest,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Update a video project."""
    project = db.query(VideoProject).filter(
        VideoProject.id == project_id,
        VideoProject.business_id == business_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Video project not found")

    # Validate campaign_id if provided
    if request.campaign_id:
        campaign = db.query(Campaign).filter(
            Campaign.id == request.campaign_id,
            Campaign.business_id == business_id
        ).first()
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

    # Update only provided fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return {
        "id": project.id,
        "message": "Video project updated successfully",
        "project": {
            "id": project.id,
            "name": project.name,
            "status": project.status,
            "updated_at": project.updated_at
        }
    }

@router.post("/video-projects/{project_id}/save-as-template", response_model=None)
async def save_video_project_as_template(
    project_id: int,
    template_name: Optional[str] = Query(None),
    body: Optional[SaveTemplateRequest] = None,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Save an existing video project as a reusable template."""
    resolved_template_name = (template_name or (body.template_name if body else "")).strip()
    if not resolved_template_name:
        raise HTTPException(status_code=422, detail="template_name is required")

    project = db.query(VideoProject).filter(
        VideoProject.id == project_id,
        VideoProject.business_id == business_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Video project not found")

    # Create or update template
    existing_template = db.query(VideoTemplate).filter(
        VideoTemplate.name == resolved_template_name,
        VideoTemplate.business_id == business_id
    ).first()

    template_config = {
        "duration": project.duration,
        "scenes": _parse_json_field(project.scenes, [])
    }
    thumbnail_url = _autogen_template_thumbnail(resolved_template_name, project.assets)

    if existing_template:
        existing_template.template_config = json.dumps(template_config)
        existing_template.description = project.description
        existing_template.thumbnail_url = thumbnail_url
        existing_template.updated_at = datetime.utcnow()
        template = existing_template
    else:
        template = VideoTemplate(
            business_id=business_id,
            name=resolved_template_name,
            description=project.description or f"Template from {project.name}",
            video_type="custom",
            platform="custom",
            template_config=json.dumps(template_config),
            thumbnail_url=thumbnail_url,
            is_public=True,  # Global/shared template
            usage_count=0
        )
        db.add(template)

    try:
        db.commit()
        db.refresh(template)
    except Exception as e:
        db.rollback()
        log.error("Failed to save template: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save template")

    return {
        "message": "Project saved as template successfully",
        "template_id": template.id,
        "template_name": template.name
    }

@router.delete("/video-projects/{project_id}")
async def delete_video_project(
    project_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Delete a video project."""
    project = db.query(VideoProject).filter(
        VideoProject.id == project_id,
        VideoProject.business_id == business_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Video project not found")

    db.delete(project)
    db.commit()

    return {"message": "Video project deleted successfully"}

# ========== A/B TEST ENDPOINTS ==========
@router.get("/ab-tests")
async def get_ab_tests(
    campaign_id: Optional[int] = None,
    status: Optional[ABTestStatus] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get A/B tests for the business."""
    query = db.query(ABTest).filter(ABTest.business_id == business_id)

    if campaign_id:
        query = query.filter(ABTest.campaign_id == campaign_id)
    if status:
        query = query.filter(ABTest.status == status)

    tests = query.order_by(desc(ABTest.created_at)).offset(offset).limit(limit).all()

    return {
        "tests": [
            {
                "id": t.id,
                "campaign_id": t.campaign_id,
                "name": t.name,
                "description": t.description,
                "status": t.status,
                "test_type": t.test_type,
                "variants": t.variants,
                "winner_variant_id": t.winner_variant_id,
                "confidence_level": t.confidence_level,
                "test_duration_days": t.test_duration_days,
                "started_at": t.started_at,
                "completed_at": t.completed_at,
                "created_at": t.created_at
            }
            for t in tests
        ],
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }

@router.post("/ab-tests")
async def create_ab_test(
    request: ABTestCreateRequest,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Create a new A/B test."""
    # Validate campaign exists
    campaign = db.query(Campaign).filter(
        Campaign.id == request.campaign_id,
        Campaign.business_id == business_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    ab_test = ABTest(
        business_id=business_id,
        campaign_id=request.campaign_id,
        name=request.name,
        description=request.description,
        test_type=request.test_type,
        variants=request.variants,
        test_duration_days=request.test_duration_days,
        min_sample_size=request.min_sample_size
    )

    db.add(ab_test)
    db.commit()
    db.refresh(ab_test)

    return {
        "id": ab_test.id,
        "message": "A/B test created successfully",
        "test": {
            "id": ab_test.id,
            "name": ab_test.name,
            "status": ab_test.status,
            "created_at": ab_test.created_at
        }
    }

@router.get("/ab-tests/{test_id}")
async def get_ab_test(
    test_id: int,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get a specific A/B test."""
    test = db.query(ABTest).filter(
        ABTest.id == test_id,
        ABTest.business_id == business_id
    ).first()

    if not test:
        raise HTTPException(status_code=404, detail="A/B test not found")

    return {
        "id": test.id,
        "business_id": test.business_id,
        "campaign_id": test.campaign_id,
        "name": test.name,
        "description": test.description,
        "status": test.status,
        "test_type": test.test_type,
        "variants": test.variants,
        "winner_variant_id": test.winner_variant_id,
        "winner_criteria": test.winner_criteria,
        "confidence_level": test.confidence_level,
        "test_duration_days": test.test_duration_days,
        "min_sample_size": test.min_sample_size,
        "results": test.results,
        "started_at": test.started_at,
        "completed_at": test.completed_at,
        "created_at": test.created_at,
        "updated_at": test.updated_at
    }

# ========== PERFORMANCE ANALYTICS ENDPOINTS ==========
@router.get("/campaigns/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: int,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    platform: Optional[str] = None,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get performance data for a campaign."""
    # Validate campaign exists
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    query = db.query(CampaignPerformance).filter(
        CampaignPerformance.campaign_id == campaign_id
    )

    if start_date:
        query = query.filter(CampaignPerformance.date >= start_date.date())
    if end_date:
        query = query.filter(CampaignPerformance.date <= end_date.date())
    if platform:
        query = query.filter(CampaignPerformance.platform == platform)

    performance_data = query.order_by(CampaignPerformance.date).all()

    return {
        "campaign_id": campaign_id,
        "performance": [
            {
                "date": p.date.isoformat(),
                "platform": p.platform,
                "impressions": p.impressions,
                "reach": p.reach,
                "clicks": p.clicks,
                "engagements": p.engagements,
                "shares": p.shares,
                "comments": p.comments,
                "likes": p.likes,
                "saves": p.saves,
                "conversions": p.conversions,
                "spend": p.spend,
                "ctr": p.ctr,
                "cpc": p.cpc,
                "cpm": p.cpm,
                "roas": p.roas,
                "conversion_rate": p.conversion_rate,
                "frequency": p.frequency,
                "metadata": p.extra_data or {}
            }
            for p in performance_data
        ]
    }

@router.post("/campaigns/{campaign_id}/performance")
async def add_campaign_performance(
    campaign_id: int,
    performance_data: List[CampaignPerformanceData],
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Add performance data for a campaign."""
    # Validate campaign exists
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.business_id == business_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Insert performance data
    for data in performance_data:
        perf = CampaignPerformance(
            campaign_id=campaign_id,
            business_id=business_id,
            date=data.date.date(),
            platform=data.platform,
            impressions=data.impressions,
            reach=data.reach,
            clicks=data.clicks,
            engagements=data.engagements,
            shares=data.shares,
            comments=data.comments,
            likes=data.likes,
            saves=data.saves,
            conversions=data.conversions,
            spend=data.spend,
            ctr=data.ctr,
            cpc=data.cpc,
            cpm=data.cpm,
            roas=data.roas,
            conversion_rate=data.conversion_rate,
            frequency=data.frequency,
            extra_data=data.metadata
        )
        db.add(perf)

    db.commit()

    return {"message": f"Added {len(performance_data)} performance records"}

@router.get("/analytics/overview")
async def get_ads_analytics_overview(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    business_id: int = Depends(get_user_business_id)
):
    """Get overall ads analytics overview."""
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Aggregate performance data
    query = db.query(
        func.sum(CampaignPerformance.impressions).label('total_impressions'),
        func.sum(CampaignPerformance.clicks).label('total_clicks'),
        func.sum(CampaignPerformance.engagements).label('total_engagements'),
        func.sum(CampaignPerformance.conversions).label('total_conversions'),
        func.sum(CampaignPerformance.spend).label('total_spend'),
        func.avg(CampaignPerformance.ctr).label('avg_ctr'),
        func.avg(CampaignPerformance.cpc).label('avg_cpc'),
        func.avg(CampaignPerformance.roas).label('avg_roas')
    ).filter(
        CampaignPerformance.business_id == business_id,
        CampaignPerformance.date >= start_date.date(),
        CampaignPerformance.date <= end_date.date()
    )

    result = query.first()

    # Campaign counts
    campaign_counts = db.query(
        Campaign.status,
        func.count(Campaign.id).label('count')
    ).filter(
        Campaign.business_id == business_id
    ).group_by(Campaign.status).all()

    status_counts = {status: count for status, count in campaign_counts}

    return {
        "period": {
            "start_date": start_date.date().isoformat(),
            "end_date": end_date.date().isoformat()
        },
        "performance": {
            "total_impressions": result.total_impressions or 0,
            "total_clicks": result.total_clicks or 0,
            "total_engagements": result.total_engagements or 0,
            "total_conversions": result.total_conversions or 0,
            "total_spend": result.total_spend or 0.0,
            "avg_ctr": result.avg_ctr or 0.0,
            "avg_cpc": result.avg_cpc or 0.0,
            "avg_roas": result.avg_roas or 0.0
        },
        "campaigns": {
            "total": sum(status_counts.values()),
            "by_status": status_counts
        }
    }