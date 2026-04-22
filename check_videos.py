import sys
sys.path.append('.')
from app.database import SessionLocal
from app.models import VideoProject

db = SessionLocal()
try:
    projects = db.query(VideoProject).all()
    print(f'Found {len(projects)} video projects')
    for p in projects[:5]:  # Show first 5 projects
        print(f'Project {p.id}: {p.name}')
        if p.assets:
            print(f'  Assets: {len(p.assets)}')
            for i, asset in enumerate(p.assets):
                if isinstance(asset, dict):
                    filename = asset.get('filename', 'unknown')
                    url = asset.get('url', 'no url')
                    print(f'    Asset {i}: {filename} - {url}')
                else:
                    filename = getattr(asset, 'filename', 'unknown')
                    url = getattr(asset, 'url', 'no url')
                    print(f'    Asset {i}: {filename} - {url}')
        else:
            print('  No assets')
finally:
    db.close()