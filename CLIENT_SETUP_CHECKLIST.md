# ✅ Client Setup Checklist - Simple Version

## 🎯 **What Your Client Needs to Do**

---

## **STEP 1: Create These Accounts (Priority Order)**

### **1. OpenAI Account** ⭐ **DO THIS FIRST**
- **Website:** https://platform.openai.com/signup
- **What to do:**
  1. Sign up with business email
  2. Add credit card
  3. Go to API Keys section
  4. Create new secret key
  5. Copy the key (starts with `sk-proj-...`)
- **Send you:** `OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx`
- **Cost:** ~$15-60/month

---

### **2. Stripe Account** ⭐ **DO THIS SECOND**
- **Website:** https://stripe.com/
- **What to do:**
  1. Click "Start now"
  2. Complete business verification (1-2 days)
  3. Go to Developers → API Keys
  4. Copy test keys AND live keys
  5. Set up webhook endpoint
- **Send you:**
  ```
  STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
  STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
  STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
  STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx
  ```
- **Cost:** 2.9% + $0.30 per transaction

---

### **3. Meta Business Account** ⭐ **DO THIS THIRD**
- **Website:** https://business.facebook.com/
- **What to do:**
  1. Create business account
  2. Go to https://developers.facebook.com/
  3. Create new app (Type: Business)
  4. Add WhatsApp product
  5. Get phone number verified
  6. Copy all credentials
- **Send you:**
  ```
  META_APP_ID=123456789012345
  META_APP_SECRET=abcdef123456789
  WHATSAPP_PHONE_NUMBER_ID=123456789012345
  META_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
  ```
- **Cost:** Free (1,000 messages/month)

---

## **STEP 2: Send Credentials Securely**

### **Option A: Create .env file**
Client creates file called `client_credentials.env`:
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxxxxxxxxxx
META_APP_ID=123456789012345
META_APP_SECRET=abcdef123456789
```

Send via:
- Password-protected zip file
- Secure file sharing (Google Drive with password)
- Encrypted email

### **Option B: Use Password Manager**
- Create shared LastPass/1Password vault
- Add credentials there
- Share vault access with you

---

## **STEP 3: Optional (Can Add Later)**

### **4. PayPal Business**
- **Website:** https://www.paypal.com/business
- **When:** After Stripe is working
- **Cost:** 2.9% + $0.30 per transaction

### **5. SendGrid (Email)**
- **Website:** https://sendgrid.com/
- **When:** For sending receipts/notifications
- **Cost:** Free (100 emails/day)

---

## 💰 **Total Costs for Client**

### **Setup Costs (One-time):**
- $0 (all free to set up!)

### **Monthly Costs:**
| Service | Cost |
|---------|------|
| OpenAI | $15-60/month |
| Stripe | 2.9% per transaction |
| WhatsApp | Free (1k messages/month) |
| Database | $0-25/month (if using Supabase) |
| **TOTAL** | **~$40-100/month + transaction fees** |

---

## ⏱️ **Time Required**

- OpenAI: 10 minutes
- Stripe: 30 minutes (+ 1-2 days verification)
- Meta/WhatsApp: 45 minutes
- **Total:** ~2 hours of work

---

## 📧 **Email Template for Client**

```
Subject: Action Required - Create These 3 Accounts

Hi [Client],

To launch your AI assistant platform, please create these 3 accounts:

1. OpenAI (AI Brain) - https://platform.openai.com/
   → Takes 10 minutes
   → Cost: ~$15-60/month

2. Stripe (Payments) - https://stripe.com/
   → Takes 30 minutes
   → Cost: 2.9% per transaction

3. Meta Business (WhatsApp) - https://business.facebook.com/
   → Takes 45 minutes  
   → Cost: Free (1,000 messages/month)

Total time: ~2 hours
Total cost: ~$40-100/month + transaction fees

I've attached a detailed guide. Please send me the credentials securely once done.

Let me know if you need help!

Thanks,
[Your Name]
```

---

## 🔐 **Security Tips for Client**

✅ Use business email (not personal)
✅ Enable 2FA on all accounts
✅ Use strong, unique passwords
✅ Never share keys in plain text
✅ Keep test and live keys separate

---

## ✅ **You Receive These Credentials**

```env
# From Client
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxxxxxxxxxx
META_APP_ID=123456789012345
META_APP_SECRET=abcdef123456789
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# You Add to .env and Deploy
```

---

## 🎉 **Once You Have These:**

1. Add to `.env` file
2. Restart backend
3. Test payments (Stripe test mode first)
4. Test WhatsApp messaging
5. Test AI responses
6. Switch to live mode
7. **Launch!** 🚀

---

**That's it! Simple and clear.** ✨
