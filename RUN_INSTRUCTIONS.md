# 🚀 HOW TO RUN EVERYTHING - STEP BY STEP

## ✅ Step 1: Install Python Package

Open **Command Prompt** or **PowerShell** and run:

```bash
# Navigate to project
cd C:\Users\Kibee\Desktop\projects\Curie

# Install pyotp (for 2FA)
python -m pip install pyotp

# OR if that doesn't work:
py -m pip install pyotp

# OR install all from requirements:
python -m pip install -r requirements.txt
```

---

## ✅ Step 2: Start Backend Server

In the **same terminal** (or new one):

```bash
# Make sure you're in the project folder
cd C:\Users\Kibee\Desktop\projects\Curie

# Start the FastAPI server
python main.py

# OR if that doesn't work:
py main.py

# OR using uvicorn:
python -m uvicorn main:app --reload
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**⚠️ Keep this terminal open!** The backend needs to keep running.

---

## ✅ Step 3: Start Frontend Server

Open a **NEW terminal** (don't close the backend!):

```bash
# Navigate to frontend folder
cd C:\Users\Kibee\Desktop\projects\Curie\frontend

# Start Next.js dev server
npm run dev
```

**You should see:**
```
- ready started server on 0.0.0.0:3000
- Local: http://localhost:3000
```

**⚠️ Keep this terminal open too!**

---

## ✅ Step 4: Test the New Pages

Open your browser and visit:

### 🛡️ Security Page
```
http://localhost:3000/dashboard/security
```

**What to test:**
- Click "Enable 2FA" button (generates QR code)
- Check "Active Sessions" tab
- Try "Create API Key" (shows once!)
- View your security score

### 🔔 Notifications Page
```
http://localhost:3000/dashboard/notifications
```

**What to test:**
- View the stats dashboard (5 cards)
- Try search and filters
- Check empty state (if no notifications)

### 🎯 Onboarding Page
```
http://localhost:3000/dashboard/onboarding
```

**What to test:**
- See all 6 steps
- Click on any step
- Try "Get Started" on welcome step
- Watch progress percentage

---

## 🐛 If You See Errors

### Backend Error: "ModuleNotFoundError: No module named 'pyotp'"
**Solution:** Run this:
```bash
python -m pip install pyotp
```

### Backend Error: "Table doesn't exist"
**Solution:** The SQL is already in Supabase! ✅ (You already did this successfully)

### Frontend Error: "Cannot connect to API"
**Solution:** Make sure backend is running on http://localhost:8000

### Port Already in Use
**Solution:** Kill the process:
```bash
# For port 8000 (backend):
netstat -ano | findstr :8000
taskkill /PID <number> /F

# For port 3000 (frontend):
netstat -ano | findstr :3000
taskkill /PID <number> /F
```

---

## 📋 Quick Checklist

- [ ] Installed pyotp: `python -m pip install pyotp`
- [ ] Started backend: `python main.py` (keep terminal open)
- [ ] Started frontend: `npm run dev` in frontend folder (keep terminal open)
- [ ] Tested Security page: http://localhost:3000/dashboard/security
- [ ] Tested Notifications page: http://localhost:3000/dashboard/notifications
- [ ] Tested Onboarding page: http://localhost:3000/dashboard/onboarding

---

## 🎉 That's It!

Both servers should be running:
- **Backend:** http://localhost:8000
- **Frontend:** http://localhost:3000

**Enjoy your new features!** 🚀

---

## 💡 Tips

- Use **Ctrl+C** to stop servers
- Keep both terminals open while working
- Check browser console (F12) for frontend errors
- Check backend terminal for API errors
