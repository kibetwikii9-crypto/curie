# 🧪 Document Upload - Complete Test Guide

## ✅ **Test Documents Created**

I've created 2 test documents for you:

1. **`test_documents/sample_faq.txt`** - Company FAQ (comprehensive)
2. **`test_documents/product_info.txt`** - Product information

---

## 🚀 **Step-by-Step Testing Instructions**

### **Pre-Test Checklist:**

1. **Install Required Packages:**
   ```bash
   pip install python-docx PyPDF2 pdfplumber openpyxl markdown
   ```

2. **Verify OpenAI API Key (Optional but Recommended):**
   ```bash
   # Check .env file has:
   OPENAI_API_KEY=sk-proj-your-key-here
   ```

3. **Start Backend:**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   
   Wait for: `Application startup complete`

4. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   
   Wait for: `Ready on http://localhost:3000`

---

## 📝 **Test 1: Upload Text File**

### **Expected Outcome:**
AI should extract 8-10 Q&A pairs from the FAQ document.

### **Steps:**

1. **Open Knowledge Base:**
   - Go to: `http://localhost:3000/dashboard/knowledge`
   - Make sure you're logged in

2. **Click "Upload Document" Button:**
   - You should see it next to "Import JSON" button
   - It's the NEW button with a FileText icon

3. **Select Test File:**
   - Click "Choose File" or drag & drop
   - Select: `test_documents/sample_faq.txt`
   - You should see: "Selected: sample_faq.txt" with file size

4. **Click "Process Document":**
   - Button shows "Processing..." with spinner
   - Wait 10-30 seconds

5. **Review Extracted Q&As:**
   - Preview modal should open
   - You should see ~8-10 Q&A pairs like:
     - "What are your business hours?" → "Monday-Friday 9 AM to 6 PM EST..."
     - "What is your refund policy?" → "30-day money-back guarantee..."
     - "How do I get started?" → "Sign up, connect channels..."
   - Each Q&A should have keywords (blue tags)

6. **Save Entries:**
   - Click "Save All X Entries" button
   - Wait for success message
   - Modal closes

7. **Verify in Knowledge Base:**
   - Scroll down to knowledge entries table
   - You should see all new entries
   - Check that keywords are displayed
   - Try searching for "hours" or "refund"

---

## 📝 **Test 2: Upload Second File**

### **Expected Outcome:**
AI should extract 5-7 Q&A pairs from product info.

### **Steps:**

1. **Click "Upload Document" Again**

2. **Select:** `test_documents/product_info.txt`

3. **Process & Review:**
   - Should extract Q&As like:
     - "What is your platform?" → "Intelligent AI-powered customer support..."
     - "How does it work?" → "Customers message, AI analyzes..."
     - "Who is it for?" → "Small businesses, e-commerce stores..."

4. **Save All Entries**

5. **Verify Total Count:**
   - Knowledge base should now have ~15-17 entries total
   - Check "Total Entries" stat at the top

---

## 📝 **Test 3: Test AI Using Uploaded Knowledge**

Now let's test if the AI actually uses this knowledge!

### **Steps:**

1. **Send Message via Telegram Bot:**
   - Message your bot: "What are your business hours?"
   - AI should respond with the exact info from the uploaded FAQ!

2. **Try Different Questions:**
   - "Do you offer refunds?" → Should mention 30-day guarantee
   - "How much does it cost?" → Should list pricing plans
   - "How do I get started?" → Should give setup steps

3. **Check Backend Logs:**
   - Look for: `knowledge_retrieved count=X`
   - This confirms RAG is working!

---

## 📝 **Test 4: Error Handling**

### **Test Invalid File:**

1. **Try uploading a .exe file:**
   - Should show error: "Unsupported format"

2. **Try uploading empty file:**
   - Should show error: "Failed to extract text"

3. **Try uploading file > 10MB:**
   - Should show error: "File too large"

---

## 📝 **Test 5: Without OpenAI API Key**

### **Test Manual Mode:**

1. **Remove OpenAI key from .env:**
   ```env
   # Comment out:
   # OPENAI_API_KEY=sk-proj-xxx
   ```

2. **Restart Backend**

3. **Upload Document:**
   - Should show "Manual" mode
   - Shows raw extracted text
   - No automatic Q&A generation

4. **Restore API Key** and restart

---

## ✅ **Expected Results Summary**

| Test | Expected Result | Status |
|------|-----------------|--------|
| Upload .txt file | 8-10 Q&As extracted | ⬜ |
| Review Q&As | All have questions, answers, keywords | ⬜ |
| Save entries | Entries appear in knowledge base | ⬜ |
| Search entries | Can find by keywords | ⬜ |
| AI uses knowledge | Bot responds with uploaded info | ⬜ |
| Upload 2nd file | Additional Q&As extracted | ⬜ |
| Total count | ~15-17 entries in knowledge base | ⬜ |
| Invalid file | Shows error message | ⬜ |
| Manual mode | Shows raw text when no API key | ⬜ |

---

## 🐛 **Troubleshooting**

### **"Upload Document" button not visible:**
- **Cause:** Frontend not updated
- **Fix:** 
  ```bash
  cd frontend
  npm run dev
  ```

### **"Module not found" error:**
- **Cause:** Packages not installed
- **Fix:**
  ```bash
  pip install python-docx PyPDF2 pdfplumber openpyxl markdown
  ```

### **"Failed to extract text":**
- **Cause:** File corrupted or unsupported
- **Fix:** Try a different file or format

### **"Processing..." hangs forever:**
- **Cause:** OpenAI API timeout or error
- **Fix:** 
  - Check OpenAI API key is valid
  - Check internet connection
  - Look at backend logs for errors

### **Q&As not appearing:**
- **Cause:** GPT response parsing failed
- **Fix:** Check backend logs, might fallback to manual mode

### **AI not using uploaded knowledge:**
- **Cause:** Keywords don't match user query
- **Fix:** 
  - Edit keywords in knowledge base
  - Add more variations
  - Check backend logs for `knowledge_retrieved`

---

## 📊 **Backend Logs to Watch**

When you upload a document, you should see:

```
INFO: Parsing uploaded document: sample_faq.txt (2458 bytes)
INFO: ✅ Extracted 2458 characters from sample_faq.txt
INFO: Using GPT-4o to extract Q&A pairs...
INFO: ✅ GPT extracted 9 Q&A pairs
```

When AI uses the knowledge:

```
DEBUG: knowledge_retrieved count=1
DEBUG: knowledge_keyword_match keyword=hours
INFO: ✅ gpt_response_generated user_id=123 model=gpt-4o tokens=245
```

---

## 🎉 **Success Criteria**

The feature is working correctly if:

- ✅ You can upload text files without errors
- ✅ AI extracts 5+ Q&A pairs from documents
- ✅ Q&As have questions, answers, and keywords
- ✅ You can save extracted Q&As to knowledge base
- ✅ You can search and find saved entries
- ✅ **MOST IMPORTANT:** AI actually uses the uploaded knowledge when responding to customers

---

## 📞 **Next Steps After Testing**

Once everything works:

1. **Upload Real Documents:**
   - Your actual company FAQ
   - Product manuals
   - Policy documents
   - Training materials

2. **Test with Customers:**
   - Have real customers ask questions
   - Verify AI gives accurate answers
   - Refine keywords if needed

3. **Monitor Performance:**
   - Check backend logs
   - Watch GPT token usage
   - Track knowledge base hits

---

## 🚀 **Ready to Test!**

Everything is set up and ready to go!

**Start with Test 1** and work through each test systematically.

**Good luck!** 🎉
