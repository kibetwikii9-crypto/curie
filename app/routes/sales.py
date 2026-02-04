"""Sales and Products API routes."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Product, DigitalAsset, Service, Bundle, Order, OrderItem, User as UserModel, Conversation, Lead
from app.routes.auth import get_current_user, get_user_business_id
from app.services.sales_ai import SalesAIService

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sales", tags=["sales"])


# ========== PYDANTIC MODELS ==========

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    image_url: Optional[str] = None
    inventory_count: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    currency: str
    category: Optional[str]
    inventory_count: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    duration: Optional[int] = None  # in minutes


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    currency: str
    duration: Optional[int]
    is_active: bool

    class Config:
        from_attributes = True


class DigitalAssetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    file_type: Optional[str] = None


class DigitalAssetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    file_url: str
    file_size: Optional[int]
    file_type: Optional[str]
    download_count: int
    is_active: bool

    class Config:
        from_attributes = True


class BundleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    discount_percentage: Optional[float] = None
    product_ids: Optional[List[int]] = []
    service_ids: Optional[List[int]] = []


class BundleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price: float
    currency: str
    discount_percentage: Optional[float]
    is_active: bool

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: str  # pending, confirmed, shipped, delivered, cancelled


# ========== PRODUCT ENDPOINTS ==========

@router.get("/products/", response_model=List[ProductResponse])
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get products."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product access requires a business account"
        )
    
    query = db.query(Product).filter(Product.business_id == business_id)
    
    if category:
        query = query.filter(Product.category == category)
    
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    
    offset = (page - 1) * limit
    products = query.order_by(Product.created_at.desc()).offset(offset).limit(limit).all()
    
    return products


@router.post("/products/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a product."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product creation requires a business account"
        )
    
    import json
    product = Product(
        business_id=business_id,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        currency=product_data.currency,
        category=product_data.category,
        tags=json.dumps(product_data.tags) if product_data.tags else None,
        image_url=product_data.image_url,
        inventory_count=product_data.inventory_count,
    )
    
    db.add(product)
    db.commit()
    db.refresh(product)
    
    log.info(f"Product created: {product.name} (ID: {product.id}) by user {current_user.id}")
    
    return product


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single product by ID."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product access requires a business account"
        )
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return product


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a product."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product update requires a business account"
        )
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    import json
    # Update fields
    product.name = product_data.name
    product.description = product_data.description
    product.price = product_data.price
    product.currency = product_data.currency
    product.category = product_data.category
    product.tags = json.dumps(product_data.tags) if product_data.tags else None
    product.image_url = product_data.image_url
    product.inventory_count = product_data.inventory_count
    
    db.commit()
    db.refresh(product)
    
    log.info(f"Product updated: {product.name} (ID: {product.id}) by user {current_user.id}")
    
    return product


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a product."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product deletion requires a business account"
        )
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    product_name = product.name
    db.delete(product)
    db.commit()
    
    log.info(f"Product deleted: {product_name} (ID: {product_id}) by user {current_user.id}")
    
    return {"success": True, "message": f"Product '{product_name}' deleted successfully"}


@router.patch("/products/{product_id}/toggle")
async def toggle_product_active(
    product_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Toggle product active status."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Product access requires a business account"
        )
    
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.business_id == business_id
    ).first()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    product.is_active = not product.is_active
    db.commit()
    db.refresh(product)
    
    status_text = "activated" if product.is_active else "deactivated"
    log.info(f"Product {status_text}: {product.name} (ID: {product.id}) by user {current_user.id}")
    
    return {
        "success": True,
        "message": f"Product '{product.name}' {status_text}",
        "is_active": product.is_active
    }


@router.get("/orders/", response_model=List[dict])
async def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get orders."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    query = db.query(Order).filter(Order.business_id == business_id)
    
    if status:
        query = query.filter(Order.status == status)
    
    offset = (page - 1) * limit
    orders = query.order_by(Order.created_at.desc()).offset(offset).limit(limit).all()
    
    return [{
        "id": o.id,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "status": o.status,
        "total_amount": o.total_amount,
        "currency": o.currency,
        "payment_status": o.payment_status,
        "created_at": o.created_at.isoformat(),
    } for o in orders]


@router.get("/orders/{order_id}")
async def get_order(
    order_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single order with items."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get order items
    items = db.query(OrderItem).filter(OrderItem.order_id == order_id).all()
    
    return {
        "id": order.id,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "status": order.status,
        "total_amount": order.total_amount,
        "currency": order.currency,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "shipping_address": order.shipping_address,
        "tracking_number": order.tracking_number,
        "notes": order.notes,
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
        "items": [{
            "id": item.id,
            "item_type": item.item_type,
            "name": item.name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item.total_price,
        } for item in items]
    }


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update order status."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Validate status
    valid_statuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"]
    if status_data.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    old_status = order.status
    order.status = status_data.status
    
    from datetime import datetime
    order.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(order)
    
    log.info(f"Order #{order.id} status updated from '{old_status}' to '{status_data.status}' by user {current_user.id}")
    
    return {
        "success": True,
        "message": f"Order status updated to '{status_data.status}'",
        "order_id": order.id,
        "status": order.status
    }


@router.delete("/orders/{order_id}")
async def cancel_order(
    order_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel an order (soft delete by setting status to cancelled)."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Can only cancel pending/confirmed orders
    if order.status in ["shipped", "delivered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status '{order.status}'"
        )
    
    order.status = "cancelled"
    
    from datetime import datetime
    order.updated_at = datetime.utcnow()
    
    db.commit()
    
    log.info(f"Order #{order.id} cancelled by user {current_user.id}")
    
    return {
        "success": True,
        "message": f"Order #{order.id} cancelled successfully"
    }


# ========== SERVICES ENDPOINTS ==========

@router.get("/services/", response_model=List[ServiceResponse])
async def get_services(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get services."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service access requires a business account"
        )
    
    offset = (page - 1) * limit
    services = db.query(Service).filter(
        Service.business_id == business_id
    ).order_by(Service.created_at.desc()).offset(offset).limit(limit).all()
    
    return services


@router.post("/services/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_data: ServiceCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a service."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service creation requires a business account"
        )
    
    service = Service(
        business_id=business_id,
        name=service_data.name,
        description=service_data.description,
        price=service_data.price,
        currency=service_data.currency,
        duration=service_data.duration,
    )
    
    db.add(service)
    db.commit()
    db.refresh(service)
    
    log.info(f"Service created: {service.name} (ID: {service.id}) by user {current_user.id}")
    
    return service


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: int,
    service_data: ServiceCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a service."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service update requires a business account"
        )
    
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.business_id == business_id
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service.name = service_data.name
    service.description = service_data.description
    service.price = service_data.price
    service.currency = service_data.currency
    service.duration = service_data.duration
    
    db.commit()
    db.refresh(service)
    
    log.info(f"Service updated: {service.name} (ID: {service.id}) by user {current_user.id}")
    
    return service


@router.delete("/services/{service_id}")
async def delete_service(
    service_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a service."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Service deletion requires a business account"
        )
    
    service = db.query(Service).filter(
        Service.id == service_id,
        Service.business_id == business_id
    ).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    service_name = service.name
    db.delete(service)
    db.commit()
    
    log.info(f"Service deleted: {service_name} (ID: {service_id}) by user {current_user.id}")
    
    return {"success": True, "message": f"Service '{service_name}' deleted successfully"}


# ========== DIGITAL ASSETS ENDPOINTS ==========

@router.get("/digital-assets/", response_model=List[DigitalAssetResponse])
async def get_digital_assets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get digital assets."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Digital asset access requires a business account"
        )
    
    offset = (page - 1) * limit
    assets = db.query(DigitalAsset).filter(
        DigitalAsset.business_id == business_id
    ).order_by(DigitalAsset.created_at.desc()).offset(offset).limit(limit).all()
    
    return assets


@router.post("/digital-assets/", response_model=DigitalAssetResponse, status_code=status.HTTP_201_CREATED)
async def create_digital_asset(
    asset_data: DigitalAssetCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a digital asset."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Digital asset creation requires a business account"
        )
    
    asset = DigitalAsset(
        business_id=business_id,
        name=asset_data.name,
        description=asset_data.description,
        file_url=asset_data.file_url,
        file_size=asset_data.file_size,
        file_type=asset_data.file_type,
    )
    
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    log.info(f"Digital asset created: {asset.name} (ID: {asset.id}) by user {current_user.id}")
    
    return asset


@router.delete("/digital-assets/{asset_id}")
async def delete_digital_asset(
    asset_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a digital asset."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Digital asset deletion requires a business account"
        )
    
    asset = db.query(DigitalAsset).filter(
        DigitalAsset.id == asset_id,
        DigitalAsset.business_id == business_id
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Digital asset not found"
        )
    
    asset_name = asset.name
    db.delete(asset)
    db.commit()
    
    log.info(f"Digital asset deleted: {asset_name} (ID: {asset_id}) by user {current_user.id}")
    
    return {"success": True, "message": f"Digital asset '{asset_name}' deleted successfully"}


# ========== BUNDLES ENDPOINTS ==========

@router.get("/bundles/", response_model=List[BundleResponse])
async def get_bundles(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get bundles."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bundle access requires a business account"
        )
    
    offset = (page - 1) * limit
    bundles = db.query(Bundle).filter(
        Bundle.business_id == business_id
    ).order_by(Bundle.created_at.desc()).offset(offset).limit(limit).all()
    
    return bundles


@router.post("/bundles/", response_model=BundleResponse, status_code=status.HTTP_201_CREATED)
async def create_bundle(
    bundle_data: BundleCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a bundle."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bundle creation requires a business account"
        )
    
    import json
    bundle = Bundle(
        business_id=business_id,
        name=bundle_data.name,
        description=bundle_data.description,
        price=bundle_data.price,
        currency=bundle_data.currency,
        discount_percentage=bundle_data.discount_percentage,
        product_ids=json.dumps(bundle_data.product_ids) if bundle_data.product_ids else None,
        service_ids=json.dumps(bundle_data.service_ids) if bundle_data.service_ids else None,
    )
    
    db.add(bundle)
    db.commit()
    db.refresh(bundle)
    
    log.info(f"Bundle created: {bundle.name} (ID: {bundle.id}) by user {current_user.id}")
    
    return bundle


@router.put("/bundles/{bundle_id}", response_model=BundleResponse)
async def update_bundle(
    bundle_id: int,
    bundle_data: BundleCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a bundle."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bundle update requires a business account"
        )
    
    bundle = db.query(Bundle).filter(
        Bundle.id == bundle_id,
        Bundle.business_id == business_id
    ).first()
    
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bundle not found"
        )
    
    import json
    bundle.name = bundle_data.name
    bundle.description = bundle_data.description
    bundle.price = bundle_data.price
    bundle.currency = bundle_data.currency
    bundle.discount_percentage = bundle_data.discount_percentage
    bundle.product_ids = json.dumps(bundle_data.product_ids) if bundle_data.product_ids else None
    bundle.service_ids = json.dumps(bundle_data.service_ids) if bundle_data.service_ids else None
    
    db.commit()
    db.refresh(bundle)
    
    log.info(f"Bundle updated: {bundle.name} (ID: {bundle.id}) by user {current_user.id}")
    
    return bundle


@router.delete("/bundles/{bundle_id}")
async def delete_bundle(
    bundle_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a bundle."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bundle deletion requires a business account"
        )
    
    bundle = db.query(Bundle).filter(
        Bundle.id == bundle_id,
        Bundle.business_id == business_id
    ).first()
    
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bundle not found"
        )
    
    bundle_name = bundle.name
    db.delete(bundle)
    db.commit()
    
    log.info(f"Bundle deleted: {bundle_name} (ID: {bundle_id}) by user {current_user.id}")
    
    return {"success": True, "message": f"Bundle '{bundle_name}' deleted successfully"}


# ========== STATS & ANALYTICS ENDPOINTS ==========

@router.get("/stats")
async def get_sales_stats(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get sales statistics."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stats access requires a business account"
        )
    
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Total revenue (all time)
    total_revenue = db.query(func.sum(Order.total_amount)).filter(
        Order.business_id == business_id,
        Order.payment_status == "paid"
    ).scalar() or 0
    
    # Revenue last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    revenue_30d = db.query(func.sum(Order.total_amount)).filter(
        Order.business_id == business_id,
        Order.payment_status == "paid",
        Order.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Total orders
    total_orders = db.query(func.count(Order.id)).filter(
        Order.business_id == business_id
    ).scalar() or 0
    
    # Orders by status
    orders_by_status = db.query(Order.status, func.count(Order.id)).filter(
        Order.business_id == business_id
    ).group_by(Order.status).all()
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(
        Product.business_id == business_id
    ).scalar() or 0
    
    # Active products
    active_products = db.query(func.count(Product.id)).filter(
        Product.business_id == business_id,
        Product.is_active == True
    ).scalar() or 0
    
    return {
        "total_revenue": total_revenue,
        "revenue_last_30_days": revenue_30d,
        "total_orders": total_orders,
        "orders_by_status": {status: count for status, count in orders_by_status},
        "total_products": total_products,
        "active_products": active_products,
    }


# ========== AI-POWERED FEATURES ==========

class AIDescriptionRequest(BaseModel):
    product_name: str
    category: Optional[str] = None
    key_features: Optional[List[str]] = None


class AIPricingRequest(BaseModel):
    product_name: str
    category: Optional[str] = None
    description: Optional[str] = None
    competitor_prices: Optional[List[float]] = None


@router.post("/ai/generate-description")
async def generate_product_description(
    request: AIDescriptionRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI-powered product description."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features require a business account"
        )
    
    try:
        ai_service = SalesAIService()
        description = await ai_service.generate_product_description(
            product_name=request.product_name,
            category=request.category,
            key_features=request.key_features
        )
        
        return {
            "success": True,
            "description": description
        }
    except Exception as e:
        log.error(f"Error generating description: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate description: {str(e)}"
        )


@router.post("/ai/suggest-price")
async def suggest_product_price(
    request: AIPricingRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-powered pricing suggestion."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features require a business account"
        )
    
    try:
        ai_service = SalesAIService()
        pricing = await ai_service.suggest_price(
            product_name=request.product_name,
            category=request.category,
            description=request.description,
            competitor_prices=request.competitor_prices
        )
        
        return {
            "success": True,
            **pricing
        }
    except Exception as e:
        log.error(f"Error suggesting price: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to suggest price: {str(e)}"
        )


@router.post("/ai/generate-tags")
async def generate_product_tags(
    product_name: str = Body(..., embed=True),
    description: Optional[str] = Body(None, embed=True),
    category: Optional[str] = Body(None, embed=True),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI-optimized tags for product."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI features require a business account"
        )
    
    try:
        ai_service = SalesAIService()
        tags = await ai_service.optimize_product_tags(
            product_name=product_name,
            description=description,
            category=category
        )
        
        return {
            "success": True,
            "tags": tags
        }
    except Exception as e:
        log.error(f"Error generating tags: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate tags: {str(e)}"
        )


# ========== INTEGRATION WITH CONVERSATIONS & LEADS ==========

class CreateOrderFromConversationRequest(BaseModel):
    conversation_id: int
    product_ids: List[int]
    quantities: List[int]
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None


@router.post("/orders/from-conversation")
async def create_order_from_conversation(
    request: CreateOrderFromConversationRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an order from a conversation (AI detected purchase intent)."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order creation requires a business account"
        )
    
    # Verify conversation belongs to this business
    conversation = db.query(Conversation).filter(
        Conversation.id == request.conversation_id,
        Conversation.business_id == business_id
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Calculate total
    total_amount = 0
    order_items_data = []
    
    for product_id, quantity in zip(request.product_ids, request.quantities):
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.business_id == business_id
        ).first()
        
        if not product:
            continue
        
        item_total = product.price * quantity
        total_amount += item_total
        
        order_items_data.append({
            "product_id": product_id,
            "item_type": "product",
            "name": product.name,
            "quantity": quantity,
            "unit_price": product.price,
            "total_price": item_total,
        })
    
    # Create order
    from datetime import datetime
    order = Order(
        business_id=business_id,
        conversation_id=request.conversation_id,
        customer_name=request.customer_name or conversation.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone or conversation.phone_number,
        status="pending",
        total_amount=total_amount,
        currency="USD",
        payment_status="pending",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    db.add(order)
    db.flush()
    
    # Add order items
    for item_data in order_items_data:
        order_item = OrderItem(
            order_id=order.id,
            **item_data
        )
        db.add(order_item)
    
    db.commit()
    db.refresh(order)
    
    log.info(f"Order created from conversation {conversation.id}: Order #{order.id}, Total ${total_amount}")
    
    return {
        "success": True,
        "message": "Order created successfully",
        "order_id": order.id,
        "total_amount": total_amount
    }


@router.post("/orders/{order_id}/link-lead")
async def link_order_to_lead(
    order_id: int,
    lead_id: int = Body(..., embed=True),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link an order to a lead (convert lead to customer)."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    # Verify order
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify lead
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.business_id == business_id
    ).first()
    
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Link order to lead
    order.lead_id = lead_id
    
    # Update lead status to converted
    lead.status = "converted"
    
    from datetime import datetime
    order.updated_at = datetime.utcnow()
    lead.updated_at = datetime.utcnow()
    
    db.commit()
    
    log.info(f"Order #{order.id} linked to Lead #{lead.id} - Lead converted to customer")
    
    return {
        "success": True,
        "message": "Order linked to lead successfully. Lead marked as converted."
    }


@router.get("/orders/{order_id}/conversation")
async def get_order_conversation(
    order_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the conversation associated with an order."""
    business_id = get_user_business_id(current_user, db)
    
    if business_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Order access requires a business account"
        )
    
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.business_id == business_id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if not order.conversation_id:
        return {
            "has_conversation": False,
            "message": "No conversation linked to this order"
        }
    
    conversation = db.query(Conversation).filter(
        Conversation.id == order.conversation_id
    ).first()
    
    if not conversation:
        return {
            "has_conversation": False,
            "message": "Conversation not found"
        }
    
    return {
        "has_conversation": True,
        "conversation_id": conversation.id,
        "customer_name": conversation.customer_name,
        "channel": conversation.channel,
        "created_at": conversation.created_at.isoformat(),
    }

