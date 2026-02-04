# ⚡ Quick Test - 5 Minutes

## 🎯 **Quick Test Steps:**

### **1. Install Packages (30 seconds):**
```bash
pip install python-docx PyPDF2 pdfplumber openpyxl markdown
```

### **2. Start Backend (if not running):**
```bash
python -m uvicorn app.main:app --reload
```

### **3. Open Knowledge Base:**
```
http://localhost:3000/dashboard/knowledge
```

### **4. Upload Document:**
1. Click **"Upload Document"** button (next to "Import JSON")
2. Choose file: `test_documents/sample_faq.txt`
3. Click **"Process Document"**
4. Wait 10-30 seconds
5. Review extracted Q&As (should see ~8-10)
6. Click **"Save All X Entries"**

### **5. Verify:**
- Scroll down in knowledge base
- You should see new entries with Q&As about:
  - Business hours
  - Pricing plans
  - Refund policy
  - Getting started
  - Technical support
  - Data security
  - Payment methods

### **6. Test AI:**
Send to your Telegram bot:
```
"What are your business hours?"
```

AI should respond with the hours from the uploaded document!

---

## ✅ **Success = AI responds with uploaded knowledge!**

---

## 🐛 **If Something Goes Wrong:**

**"Upload Document" button not visible?**
```bash
cd frontend
npm run dev
```

**"Module not found" error?**
```bash
pip install python-docx PyPDF2
```

**"Processing" hangs?**
- Check OpenAI API key in `.env`
- Check backend logs for errors

---

## 📄 **Test Files Located At:**
- `test_documents/sample_faq.txt`
- `test_documents/product_info.txt`

---

## 📖 **Full Test Guide:**
See `TEST_DOCUMENT_UPLOAD.md` for detailed testing instructions.

---

**Ready? Start testing now!** 🚀
