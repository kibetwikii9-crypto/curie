#!/usr/bin/env python3
"""
Seed video templates into the database.
Run this after database migrations to add default templates.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import VideoTemplate
from sqlalchemy import text

def seed_templates():
    """Add default video templates to the database."""
    from app.models import Business
    
    db = SessionLocal()
    
    try:
        # Check if templates already exist
        existing = db.query(VideoTemplate).filter(VideoTemplate.is_public == True).count()
        if existing > 0:
            print(f"✅ Found {existing} existing templates. Skipping seed.")
            return
        
        # Try to find any business, or use a default ID
        business = db.query(Business).first()
        if not business:
            print("⚠️  No businesses found. Cannot seed templates (business_id is required).")
            print("Please create a business first, then run this script again.")
            return
        
        business_id = business.id
        print(f"✅ Using business (ID: {business_id}) for global templates")
        
        templates = [
            {
                "name": "Product Launch",
                "description": "30-second product launch video with hook, demo, and CTA",
                "video_type": "short_clip_overlay",
                "platform": "instagram",
                "duration": "00:30",
                "scenes": [
                    {"id": 1, "name": "Hook", "duration": 5, "caption": "Show product"},
                    {"id": 2, "name": "Demo", "duration": 18, "caption": "Demonstrate key features"},
                    {"id": 3, "name": "CTA", "duration": 7, "caption": "Call to action"}
                ]
            },
            {
                "name": "Customer Testimonial",
                "description": "60-second customer success story with testimonial and results",
                "video_type": "image_slideshow",
                "platform": "facebook",
                "duration": "01:00",
                "scenes": [
                    {"id": 1, "name": "Intro", "duration": 8, "caption": "Customer intro"},
                    {"id": 2, "name": "Problem", "duration": 15, "caption": "The challenge"},
                    {"id": 3, "name": "Solution", "duration": 20, "caption": "How we helped"},
                    {"id": 4, "name": "Results", "duration": 10, "caption": "Results & testimonial"},
                    {"id": 5, "name": "CTA", "duration": 7, "caption": "Join them today"}
                ]
            },
            {
                "name": "Flash Sale",
                "description": "Quick 15-second flash sale announcement with urgency",
                "video_type": "static_image_text",
                "platform": "tiktok",
                "duration": "00:15",
                "scenes": [
                    {"id": 1, "name": "Teaser", "duration": 3, "caption": "Limited time offer"},
                    {"id": 2, "name": "Deal", "duration": 8, "caption": "Show discount"},
                    {"id": 3, "name": "Urgency", "duration": 4, "caption": "Ends today!"}
                ]
            }
        ]
        
        for template_data in templates:
            template = VideoTemplate(
                business_id=business_id,  # Use existing business ID
                name=template_data["name"],
                description=template_data["description"],
                video_type=template_data["video_type"],
                platform=template_data["platform"],
                template_config=json.dumps({
                    "duration": template_data["duration"],
                    "scenes": template_data["scenes"]
                }),
                is_public=True,
                usage_count=0
            )
            db.add(template)
            print(f"✅ Added template: {template_data['name']}")
        
        db.commit()
        print("\n✅ All templates seeded successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding templates: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_templates()
