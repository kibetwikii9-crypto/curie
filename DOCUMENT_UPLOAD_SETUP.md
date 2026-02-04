# 🚀 Document Upload - Quick Setup Guide

## ⚡ **Get Started in 5 Minutes**

---

## **Step 1: Install Required Packages**

```bash
pip install python-docx PyPDF2 pdfplumber openpyxl markdown
```

Or install everything at once:

```bash
pip install -r requirements.txt
```

---

## **Step 2: Verify Installation**

```bash
python -c "import docx, PyPDF2, pdfplumber, openpyxl, markdown; print('✅ All packages installed!')"
```

---

## **Step 3: Restart Backend**

```bash
# Stop backend (Ctrl+C if running)

# Start again:
python -m uvicorn app.main:app --reload
```

---

## **Step 4: Test the Feature**

1. Open dashboard: `http://localhost:3000/dashboard/knowledge`
2. Click **"Upload Document"** button (NEW!)
3. Select any document:
   - Word file (`.docx`)
   - PDF (`.pdf`)
   - Text file (`.txt`)
   - Or any supported format

4. Click **"Process Document"**
5. Wait 10-30 seconds (AI is extracting Q&As)
6. Review the extracted Q&As
7. Click **"Save All X Entries"**

**Done!** 🎉

---

## 📄 **Test Documents**

### **Quick Test - Create a Simple Text File**

Create `test_faq.txt`:

```
Q: What are your business hours?
A: We are open Monday to Friday from 9 AM to 6 PM EST.

Q: How can I contact support?
A: You can email us at support@company.com or call 1-800-123-4567.

Q: Do you offer refunds?
A: Yes, we offer a 30-day money-back guarantee on all purchases.
```

Upload this file and watch the AI extract the Q&As!

---

## 🎯 **Supported Formats**

| Format | Extension | Use Case |
|--------|-----------|----------|
| Word | `.docx` | Policies, manuals, FAQs |
| PDF | `.pdf` | Brochures, guides, reports |
| Text | `.txt` | Simple documentation |
| Markdown | `.md` | Technical docs |
| Excel | `.xlsx` | Product catalogs, price lists |
| CSV | `.csv` | Data tables |

---

## ⚙️ **Configuration (Optional)**

### **If you have OpenAI API key:**

Add to `.env`:

```env
OPENAI_API_KEY=sk-proj-your-key-here
```

**Benefits:**
- ✅ AI automatically extracts Q&As
- ✅ Saves you hours of manual work
- ✅ Intelligent keyword extraction

### **If you DON'T have OpenAI key:**

**No problem!** The system will:
- ✅ Extract text from documents
- ✅ Show you the raw text
- ✅ Let you manually create Q&As

---

## 🎉 **What You Get**

After setup, you can:

- ✅ Upload 100-page PDF manuals
- ✅ Get 20-50 Q&As in 30 seconds
- ✅ Process Word documents with tables
- ✅ Import Excel price lists automatically
- ✅ Convert Markdown docs to Q&As

**Save hours of manual Q&A creation!** ⏱️

---

## 🐛 **Troubleshooting**

### **"Module not found" error**

```bash
# Install the specific package:
pip install python-docx  # For Word documents
pip install PyPDF2 pdfplumber  # For PDFs
pip install openpyxl  # For Excel
pip install markdown  # For Markdown
```

### **"File too large" error**

- Maximum file size: 10MB
- Solution: Split large documents into smaller files

### **"Failed to extract text" error**

- Check file isn't password-protected
- Try saving as plain PDF (not scanned image)
- Verify file isn't corrupted

---

## 📊 **Next Steps**

1. Test with a simple `.txt` file first
2. Then try a Word document
3. Upload your company FAQ
4. Import product manuals
5. Process policy documents

**Your AI will now have all this knowledge!** 🧠

---

## 🎊 **YOU'RE READY!**

The document upload feature is **fully functional** and ready to use!

**Go to:** `http://localhost:3000/dashboard/knowledge` and click **"Upload Document"**

**Happy uploading!** 🚀
