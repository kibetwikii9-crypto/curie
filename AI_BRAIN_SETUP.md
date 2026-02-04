# 🚀 AI BRAIN QUICK SETUP GUIDE

## ⚡ **Get Your AI Brain Running in 5 Minutes**

---

## **Step 1: Install OpenAI Package**

```bash
pip install openai
```

---

## **Step 2: Get Your OpenAI API Key**

1. Go to: https://platform.openai.com/api-keys
2. Sign in (or create account)
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)

---

## **Step 3: Add API Key to `.env`**

Open `C:\Users\Kibee\Desktop\projects\Curie\.env` and add:

```env
# AI Brain - GPT-4o
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Your existing settings (keep these)
DATABASE_URL=your_supabase_url
SECRET_KEY=your_secret_key
# ... rest of your settings ...
```

---

## **Step 4: Restart Backend**

```bash
# Stop backend (Ctrl+C)
# Start again:
python -m uvicorn app.main:app --reload
```

Look for this in logs:
```
✅ OpenAI GPT client initialized successfully
```

---

## **Step 5: Test the AI Brain**

### **Test via Telegram:**

1. Send a message to your Telegram bot:
   ```
   "Hello!"
   ```

2. You should get an intelligent GPT-4o response!

3. Check backend logs for:
   ```
   ✅ gpt_response_generated user_id=123 model=gpt-4o tokens=150
   ```

### **Test Knowledge Base (RAG):**

1. Go to dashboard: http://localhost:3000/dashboard/knowledge
2. Add a knowledge entry:
   - **Question:** "What are your business hours?"
   - **Answer:** "We're open 24/7 with AI support, and human agents are available 9am-5pm EST."
   - **Keywords:** ["hours", "when", "open", "available", "support hours"]

3. Send message via Telegram:
   ```
   "When are you open?"
   ```

4. AI should respond with your knowledge base answer! 🎉

### **Test AI Rules:**

1. Go to dashboard: http://localhost:3000/dashboard/ai-rules
2. Add a rule:
   - **Name:** "Always mention free trial"
   - **Description:** "Always mention our 14-day free trial when discussing pricing"
   - **Priority:** High

3. Send message via Telegram:
   ```
   "How much does it cost?"
   ```

4. AI should mention the free trial in the response! ✨

---

## 🎯 **How It Works**

```
User Message → AI Engine → GPT-4o
                 ↓
        [Retrieves from Database]
                 ↓
         1. Knowledge Base (RAG)
         2. AI Rules (Business Logic)
         3. Conversation Memory (Context)
                 ↓
        Builds Smart Prompt with:
        - Your knowledge entries
        - Your business rules  
        - Conversation history
                 ↓
         GPT-4o Generates Response
                 ↓
         Update Memory → Send to User
```

---

## 💰 **Cost Tracking**

Monitor your usage in backend logs:

```
✅ gpt_response_generated user_id=123 model=gpt-4o tokens=245
```

**Tokens = Input + Output**

**Estimated Costs:**
- **1,000 messages/day:** ~$15-60/month
- **10,000 messages/day:** ~$150-600/month

**Optimize Costs:**
- Keep knowledge base entries concise
- Limit max_tokens (currently 500)
- Use rule-based fallback for simple questions

---

## 🔧 **Troubleshooting**

### **"API key not configured" Warning**

**Check:**
1. Is `OPENAI_API_KEY` in your `.env` file?
2. Did you restart the backend after adding it?
3. Is the key valid? (starts with `sk-proj-` or `sk-`)

**Fix:**
```bash
# Check .env
cat .env | grep OPENAI

# Should show:
# OPENAI_API_KEY=sk-proj-xxxxx

# Restart backend
python -m uvicorn app.main:app --reload
```

### **"Rate limit exceeded" Error**

**What it means:** Too many API requests

**Fix:**
- Upgrade your OpenAI account
- Or: System automatically falls back to rule-based (free)

### **AI Not Using Knowledge Base**

**Check:**
1. Did you add knowledge via dashboard?
2. Are keywords matching the user's question?
3. Is the knowledge entry marked as "active"?

**Debug:**
```sql
-- Check your knowledge entries in Supabase
SELECT * FROM knowledge_entries WHERE business_id = 1 AND is_active = true;
```

### **AI Not Following Rules**

**Check:**
1. Is the rule marked as "active" and "high priority"?
2. Is the rule description clear and specific?

**Tip:** Make rules actionable:
- ✅ Good: "Always mention our 24/7 support availability"
- ❌ Bad: "Be nice"

---

## 🎉 **YOU'RE DONE!**

Your AI Brain is now **fully operational** with:
- ✅ GPT-4o intelligence
- ✅ Your business knowledge (RAG)
- ✅ Your custom rules
- ✅ Conversation memory
- ✅ Multi-tenant support
- ✅ Graceful error handling

**Start chatting with your bot and watch the magic happen!** ✨

---

## 📞 **Next Steps**

1. Test basic conversation
2. Add 5-10 knowledge entries
3. Create 2-3 AI rules
4. Monitor token usage
5. Adjust based on customer feedback

**Your AI is learning and ready to serve customers!** 🚀
