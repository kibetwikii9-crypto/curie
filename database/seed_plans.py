"""Seed subscription plans and add-ons into database."""
import json
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Plan, Addon


def seed_plans(db: Session):
    """Seed subscription plans."""
    plans_data = [
        {
            "name": "starter",
            "display_name": "Starter Plan",
            "description": "Perfect for small businesses just getting started with AI automation",
            "price_monthly": 25.00,
            "price_annual": 240.00,  # 20% discount
            "currency": "USD",
            "conversation_limit": 1000,
            "channel_limit": 3,
            "user_limit": 2,
            "storage_limit": 10,  # MB
            "ai_tokens_limit": 50000,
            "features": json.dumps({
                "voice_ai": False,
                "api_access": False,
                "crm": False,
                "payment_automation": False,
                "advanced_analytics": False,
                "white_label": False,
                "priority_support": False
            }),
            "is_active": True,
            "is_popular": False,
            "sort_order": 1
        },
        {
            "name": "business",
            "display_name": "Business Plan",
            "description": "For growing businesses that need more power and features",
            "price_monthly": 49.00,
            "price_annual": 470.40,  # 20% discount
            "currency": "USD",
            "conversation_limit": 5000,
            "channel_limit": 5,
            "user_limit": 5,
            "storage_limit": 50,  # MB
            "ai_tokens_limit": 250000,
            "features": json.dumps({
                "voice_ai": False,
                "api_access": False,
                "crm": True,
                "payment_automation": True,
                "advanced_analytics": False,
                "white_label": False,
                "priority_support": True
            }),
            "is_active": True,
            "is_popular": True,  # Most popular!
            "sort_order": 2
        },
        {
            "name": "pro",
            "display_name": "Pro Plan",
            "description": "Advanced features for established businesses scaling up",
            "price_monthly": 99.00,
            "price_annual": 950.40,  # 20% discount
            "currency": "USD",
            "conversation_limit": 20000,
            "channel_limit": 10,
            "user_limit": 15,
            "storage_limit": 200,  # MB
            "ai_tokens_limit": None,  # Unlimited
            "features": json.dumps({
                "voice_ai": True,
                "api_access": True,
                "crm": True,
                "payment_automation": True,
                "advanced_analytics": True,
                "white_label": False,
                "priority_support": True
            }),
            "is_active": True,
            "is_popular": False,
            "sort_order": 3
        },
        {
            "name": "enterprise",
            "display_name": "Enterprise Plan",
            "description": "Unlimited everything for large organizations",
            "price_monthly": 299.00,
            "price_annual": 2870.40,  # 20% discount
            "currency": "USD",
            "conversation_limit": None,  # Unlimited
            "channel_limit": None,  # Unlimited
            "user_limit": None,  # Unlimited
            "storage_limit": None,  # Unlimited
            "ai_tokens_limit": None,  # Unlimited
            "features": json.dumps({
                "voice_ai": True,
                "api_access": True,
                "crm": True,
                "payment_automation": True,
                "advanced_analytics": True,
                "white_label": True,
                "priority_support": True,
                "dedicated_support": True,
                "sla": True,
                "custom_integrations": True
            }),
            "is_active": True,
            "is_popular": False,
            "sort_order": 4
        }
    ]
    
    for plan_data in plans_data:
        existing = db.query(Plan).filter(Plan.name == plan_data["name"]).first()
        if not existing:
            plan = Plan(**plan_data)
            db.add(plan)
            print(f"✅ Created plan: {plan_data['display_name']}")
        else:
            print(f"⏭️  Plan already exists: {plan_data['display_name']}")
    
    db.commit()
    print("\n✅ Plans seeded successfully!")


def seed_addons(db: Session):
    """Seed add-ons."""
    addons_data = [
        {
            "name": "voice_ai",
            "display_name": "Voice AI Module",
            "description": "Add voice recognition and text-to-speech capabilities",
            "price_monthly": 29.00,
            "currency": "USD",
            "icon": "mic",
            "color": "bg-blue-500",
            "features": json.dumps({"voice_ai": True}),
            "is_active": True,
            "sort_order": 1
        },
        {
            "name": "image_recognition",
            "display_name": "Image Recognition",
            "description": "AI-powered image analysis and understanding",
            "price_monthly": 19.00,
            "currency": "USD",
            "icon": "image",
            "color": "bg-purple-500",
            "features": json.dumps({"image_recognition": True}),
            "is_active": True,
            "sort_order": 2
        },
        {
            "name": "advanced_crm",
            "display_name": "Advanced CRM",
            "description": "Full customer relationship management suite",
            "price_monthly": 39.00,
            "currency": "USD",
            "icon": "users",
            "color": "bg-green-500",
            "features": json.dumps({"advanced_crm": True}),
            "is_active": True,
            "sort_order": 3
        },
        {
            "name": "payment_processing",
            "display_name": "Payment Processing",
            "description": "Accept payments directly in conversations",
            "price_monthly": 15.00,
            "currency": "USD",
            "icon": "credit-card",
            "color": "bg-yellow-500",
            "features": json.dumps({"payment_processing": True}),
            "is_active": True,
            "sort_order": 4
        },
        {
            "name": "custom_integrations",
            "display_name": "Custom Integrations",
            "description": "Connect to your custom APIs and services",
            "price_monthly": 49.00,
            "currency": "USD",
            "icon": "plug",
            "color": "bg-red-500",
            "features": json.dumps({"custom_integrations": True}),
            "is_active": True,
            "sort_order": 5
        }
    ]
    
    for addon_data in addons_data:
        existing = db.query(Addon).filter(Addon.name == addon_data["name"]).first()
        if not existing:
            addon = Addon(**addon_data)
            db.add(addon)
            print(f"✅ Created add-on: {addon_data['display_name']}")
        else:
            print(f"⏭️  Add-on already exists: {addon_data['display_name']}")
    
    db.commit()
    print("\n✅ Add-ons seeded successfully!")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("\n🌱 Seeding plans and add-ons...\n")
        seed_plans(db)
        print()
        seed_addons(db)
        print("\n🎉 All done!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()
