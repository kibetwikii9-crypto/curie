from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'video_projects' ORDER BY column_name"))
    columns = [row[0] for row in result]
    print("Current video_projects columns:")
    for col in columns:
        print(f"  - {col}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()