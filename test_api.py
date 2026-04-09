import requests
import json

# Test health endpoint
try:
    response = requests.get('http://localhost:8000/health', timeout=5)
    print(f"Health Status: {response.status_code}")
    print(f"Health Response: {response.json()}")
except Exception as e:
    print(f"Health check failed: {e}")

# Test video projects endpoint (will fail auth but shows endpoint works)
try:
    response = requests.get('http://localhost:8000/api/ads/video-projects', timeout=5)
    print(f"\nVideo Projects Status: {response.status_code}")
except Exception as e:
    print(f"Video projects endpoint test: {e}")
