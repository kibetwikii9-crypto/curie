#!/bin/bash

echo "=== BACKEND HEALTH CHECK ==="

# Check if uvicorn is running
if ps aux | grep -v grep | grep uvicorn > /dev/null; then
    echo "✅ Backend process is running"
else
    echo "❌ Backend process NOT running"
    echo "Starting backend..."
    cd ~/curie
    source venv/bin/activate
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    sleep 3
fi

# Test backend health
echo "Testing backend health..."
if curl -s --max-time 5 http://localhost:8000/api/health > /dev/null; then
    echo "✅ Backend responds to /api/health"
else
    echo "❌ Backend NOT responding to /api/health"
fi

# Test integrations endpoint
echo "Testing integrations endpoint..."
if curl -s --max-time 5 http://localhost:8000/api/integrations/ > /dev/null; then
    echo "✅ Backend responds to /api/integrations/"
else
    echo "❌ Backend NOT responding to /api/integrations/"
fi

echo ""
echo "If backend is working but you still get 502 on frontend:"
echo "1. Check nginx is proxying to port 8000"
echo "2. Check nginx error logs: tail -f /var/log/nginx/error.log"
echo "3. Verify frontend .env.local has: NEXT_PUBLIC_API_URL=https://automifyyai.com:8000"