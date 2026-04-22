#!/bin/bash

echo "=== HOSTINGER DEPLOYMENT FIX SCRIPT ==="
echo "Run this on your Hostinger server"
echo ""

# 1. Kill any existing uvicorn processes
echo "1. Killing existing backend processes..."
pkill -f uvicorn
sleep 2

# 2. Activate virtual environment and install dependencies
echo "2. Setting up virtual environment..."
cd ~/curie
source venv/bin/activate

# Install/update requirements if needed
pip install --upgrade pip
pip install -r requirements.txt

# 3. Start backend
echo "3. Starting FastAPI backend..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
sleep 3

# 4. Test backend
echo "4. Testing backend connectivity..."
curl -s http://localhost:8000/api/health || echo "Backend not responding"

# 5. Check if process is running
echo "5. Checking if backend is running..."
ps aux | grep uvicorn | grep -v grep || echo "No uvicorn process found"

# 6. Check nginx configuration
echo "6. Checking nginx proxy configuration..."
if [ -f /etc/nginx/sites-available/default ]; then
    echo "Nginx config found. Checking for proxy_pass to port 8000..."
    grep -A 5 -B 5 "proxy_pass.*8000" /etc/nginx/sites-available/default || echo "No proxy to port 8000 found in nginx config"
else
    echo "Nginx config not found at expected location"
fi

echo ""
echo "=== MANUAL STEPS IF NEEDED ==="
echo "If backend is running but you still get 502:"
echo "1. Check nginx error logs: tail -f /var/log/nginx/error.log"
echo "2. Restart nginx: sudo systemctl restart nginx"
echo "3. Check if port 8000 is accessible: curl http://localhost:8000"
echo ""
echo "If backend won't start:"
echo "1. Check app logs: tail -f ~/curie/app.log"
echo "2. Test manually: source venv/bin/activate && python -c 'from app.main import app; print(\"App imports OK\")'"

echo ""
echo "=== CURRENT STATUS ==="
echo "Backend should be running on http://localhost:8000"
echo "Frontend should be served by nginx on https://automifyyai.com"