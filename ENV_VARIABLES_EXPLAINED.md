# Environment Variables Explained

## Overview

Your application uses **two different environment variables** that serve different purposes:

1. **`PUBLIC_URL`** - Used by the **BACKEND**
2. **`NEXT_PUBLIC_API_URL`** - Used by the **FRONTEND**

## PUBLIC_URL (Backend)

### Purpose
Tells the **backend** what its own public URL is. The backend uses this to:
- Detect if it's running in production (checks if URL contains "onrender.com")
- Generate absolute URLs for webhooks, links, etc.
- Know its own address for external services

### Where to Set It
- **Local Development**: Root `.env` file
- **Render (Production)**: Automatically set by Render via `render.yaml` (using `fromService`)

### Example Values
```env
# Localhost
PUBLIC_URL=http://localhost:8000

# Render (auto-set, but you can override)
PUBLIC_URL=https://automify-ai-backend-xxxx.onrender.com
```

### Used By
- `app/config.py` - Backend settings
- `app/main.py` - Production detection, CORS configuration

---

## NEXT_PUBLIC_API_URL (Frontend)

### Purpose
Tells the **frontend** where to send API requests. The frontend uses this to:
- Make HTTP requests to the backend API
- Connect to authentication endpoints
- Fetch data from the backend

### Where to Set It
- **Local Development**: `frontend/.env.local` file
- **Render (Production)**: Render dashboard → `automify-ai-frontend` → Environment tab

### Example Values
```env
# Localhost
NEXT_PUBLIC_API_URL=http://localhost:8000

# Render (must be set manually or via render.yaml)
NEXT_PUBLIC_API_URL=https://automify-ai-backend-xxxx.onrender.com
```

### Used By
- `frontend/lib/api.ts` - Axios API client configuration

---

## File Structure

### For Local Development

```
project-root/
├── .env                    ← Backend env vars (PUBLIC_URL, DATABASE_URL, etc.)
└── frontend/
    └── .env.local          ← Frontend env vars (NEXT_PUBLIC_API_URL)
```

### Example `.env` (Root - Backend)
```env
# Backend Configuration
BOT_TOKEN=your_token
PUBLIC_URL=http://localhost:8000          ← Backend's own URL
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
# Note: No default admin accounts for security.
# Create users via the application signup flow.
```

### Example `frontend/.env.local` (Frontend)
```env
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000  ← Where frontend calls backend
```

---

## For Render (Production)

### Backend Service (`automify-ai-backend`)
- `PUBLIC_URL` - **Auto-set** by Render via `render.yaml` (using `fromService`)
- You can override it manually in Render dashboard if needed

### Frontend Service (`automify-ai-frontend`)
- `NEXT_PUBLIC_API_URL` - **Should be set** in Render dashboard
- Can be auto-set via `render.yaml`, but manual setting is more reliable

---

## Key Differences

| Variable | Used By | Purpose | Example |
|----------|---------|---------|---------|
| `PUBLIC_URL` | Backend | Backend's own URL | `https://automify-ai-backend.onrender.com` |
| `NEXT_PUBLIC_API_URL` | Frontend | Where to call backend | `https://automify-ai-backend.onrender.com` |

**Note**: They often have the **same value**, but serve different purposes:
- `PUBLIC_URL` = "I am the backend, this is my address"
- `NEXT_PUBLIC_API_URL` = "I am the frontend, this is where I call the backend"

---

## Common Questions

### Q: Should `.env` contain `NEXT_PUBLIC_API_URL`?
**A**: No! The root `.env` is for **backend** variables. `NEXT_PUBLIC_API_URL` goes in `frontend/.env.local`

### Q: Should `.env` contain `PUBLIC_URL`?
**A**: Yes! The root `.env` is for backend variables, and `PUBLIC_URL` is a backend variable.

### Q: Why do they have the same value?
**A**: Because the frontend needs to call the backend, so `NEXT_PUBLIC_API_URL` should point to the same URL as `PUBLIC_URL`. But they serve different purposes:
- `PUBLIC_URL` = Backend knows itself
- `NEXT_PUBLIC_API_URL` = Frontend knows where backend is

### Q: Can I use `PUBLIC_URL` in the frontend?
**A**: No! The frontend can't access backend environment variables. You must use `NEXT_PUBLIC_API_URL` in the frontend.

---

## Quick Reference

### Local Development Setup

**Root `.env`** (Backend):
```env
PUBLIC_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
# ... other backend vars
```

**`frontend/.env.local`** (Frontend):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Render Production Setup

**Backend Service** (Auto-set via `render.yaml`):
- `PUBLIC_URL` = Auto-set to backend URL

**Frontend Service** (Set manually in dashboard):
- `NEXT_PUBLIC_API_URL` = `https://automify-ai-backend-xxxx.onrender.com`

---

## Troubleshooting

### Frontend can't connect to backend
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (local) or Render dashboard (production)
- Make sure it includes `https://` and full hostname
- Rebuild frontend after changing (Next.js bakes env vars at build time)

### Backend production detection not working
- Check `PUBLIC_URL` in root `.env` (local) or Render dashboard (production)
- Should be full URL with `https://` on Render









