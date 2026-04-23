# Hostinger Deployment Guide

## Commands to run on Hostinger (SSH/Terminal)

### 1. Fix File Permissions
```bash
chmod -R 755 ~/curie
chmod -R 755 ~/curie/app
chmod -R 755 ~/curie/frontend
```

### 2. Navigate to project
```bash
cd ~/curie
```

### 3. Pull latest code
```bash
git pull origin main
```

### 4. Install/Update backend dependencies
```bash
python3 -m pip install -r requirements.txt
```

### 5. Install frontend dependencies
```bash
cd frontend
npm install
```

### 6. Build frontend
```bash
npm run build
```

### 7. Return to root and start backend
```bash
cd ~/curie
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
```

### 8. Verify it's running
```bash
ps aux | grep uvicorn
```

## Environment Setup on Hostinger

Make sure these are set in your `.env` on the server:
```
PUBLIC_URL=https://automifyyai.com:8000
LOG_LEVEL=INFO
FRONTEND_URL=https://automifyyai.com
DATABASE_URL=postgresql://...
```

And `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=https://automifyyai.com:8000
```

## Troubleshooting

- If `python` not found: Use `python3` instead
- If `npm` not found: Install Node.js first
- If permission denied: Run `chmod` commands above
- If port 8000 is in use: Kill the process with `pkill -f uvicorn` and restart

