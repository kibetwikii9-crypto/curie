# 🔑 Client Accounts & Credentials Required

## 📋 **Complete Checklist for Client**

Based on the Multi-Platform AI Assistant Blueprint, here are ALL accounts your client needs to create and credentials they should send you.

---

## 🎯 **CRITICAL (Required for Launch)**

### **1. OpenAI Account (AI Brain)** ⭐ **MOST IMPORTANT**

**What it's for:** Powers the AI responses (GPT-4o)

**How to create:**
1. Go to: https://platform.openai.com/signup
2. Sign up with business email
3. Add payment method (credit card)
4. Go to: https://platform.openai.com/api-keys
5. Click "Create new secret key"
6. Copy the key (starts with `sk-proj-...`)

**Credentials to send you:**
```
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Cost:** ~$15-60/month for 1,000 messages/day

**Priority:** 🔴 **CRITICAL** - AI won't work without this!

---

### **2. Stripe Account (Payment Processing)** ⭐

**What it's for:** Accept payments from customers, process subscriptions

**How to create:**
1. Go to: https://stripe.com/
2. Click "Start now" → Sign up
3. Complete business verification (takes 1-2 days)
4. Go to Dashboard → Developers → API Keys
5. Use "Test mode" for testing, "Live mode" for production

**Credentials to send you:**
```
# Test credentials (for development)
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxxxxxxxxxxxxxxxxxx

# Live credentials (for production)
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxxxxxxxxxxxxxxxxxx

# Webhook signing secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

**Cost:** 2.9% + $0.30 per transaction

**Priority:** 🔴 **CRITICAL** - Can't accept payments without this!

---

### **3. Meta Business Account (WhatsApp & Instagram)** ⭐

**What it's for:** WhatsApp Business API, Instagram DM

**How to create:**
1. Go to: https://business.facebook.com/
2. Click "Create Account"
3. Set up business details
4. Go to: https://developers.facebook.com/
5. Create new app → Type: "Business"
6. Add WhatsApp product
7. Add Instagram product (optional)

**Credentials to send you:**
```
# Meta App Credentials
META_APP_ID=123456789012345
META_APP_SECRET=abcdef123456789abcdef123456789ab

# WhatsApp Business Account ID
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345

# WhatsApp Phone Number ID
WHATSAPP_PHONE_NUMBER_ID=123456789012345

# Access Token (permanent)
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook verification token (you create this)
WHATSAPP_VERIFY_TOKEN=your_custom_secret_token_here

# App secret for signature verification
WHATSAPP_APP_SECRET=abcdef123456789abcdef123456789ab
```

**Cost:** 
- Free tier: 1,000 conversations/month
- Paid: $0.005 - $0.09 per conversation (varies by country)

**Priority:** 🔴 **CRITICAL** - Already implemented, needs credentials!

---

## 🟡 **IMPORTANT (Needed Soon)**

### **4. Supabase/PostgreSQL Database** (Already set up?)

**What it's for:** Store all data (conversations, users, knowledge, etc.)

**If not set up yet:**
1. Go to: https://supabase.com/
2. Sign up and create new project
3. Wait for database provisioning (2-3 minutes)
4. Go to Project Settings → Database
5. Copy connection string

**Credentials to send you:**
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DATABASE]
```

**Cost:** Free tier available, $25/month for Pro

**Priority:** 🟡 **IMPORTANT** - Likely already set up

---

### **5. Telegram Bot** (Already working?)

**What it's for:** Telegram channel integration

**How to create:**
1. Open Telegram
2. Search for @BotFather
3. Send `/newbot`
4. Follow instructions
5. Copy the bot token

**Credentials to send you:**
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Cost:** Free!

**Priority:** 🟡 **IMPORTANT** - Already implemented

---

## 🟢 **OPTIONAL (Add Later)**

### **6. PayPal Account (Alternative Payment)**

**What it's for:** PayPal payments (alternative to Stripe)

**How to create:**
1. Go to: https://www.paypal.com/us/business
2. Sign up for business account
3. Go to Dashboard → Apps & Credentials
4. Create REST API app

**Credentials to send you:**
```
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=sandbox  # or "live"
```

**Cost:** 2.9% + $0.30 per transaction

**Priority:** 🟢 **OPTIONAL** - Nice to have

---

### **7. Flutterwave (Africa Payments)**

**What it's for:** Mobile money, cards in Africa (M-Pesa, Airtel Money, etc.)

**How to create:**
1. Go to: https://flutterwave.com/
2. Sign up for business account
3. Complete KYC verification
4. Go to Settings → API Keys

**Credentials to send you:**
```
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxxxxx
```

**Cost:** 1.4% per transaction

**Priority:** 🟢 **OPTIONAL** - For Africa market

---

### **8. Paystack (Africa Payments - Alternative)**

**What it's for:** Nigerian payments, mobile money

**How to create:**
1. Go to: https://paystack.com/
2. Sign up for business account
3. Complete verification
4. Go to Settings → API Keys & Webhooks

**Credentials to send you:**
```
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

**Cost:** 1.5% + ₦100 per transaction

**Priority:** 🟢 **OPTIONAL** - For Nigeria specifically

---

### **9. SendGrid (Email Service)**

**What it's for:** Send transactional emails (receipts, notifications)

**How to create:**
1. Go to: https://sendgrid.com/
2. Sign up (free tier: 100 emails/day)
3. Complete sender verification
4. Create API key

**Credentials to send you:**
```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@clientdomain.com
```

**Cost:** Free tier, then $15/month for 40,000 emails

**Priority:** 🟢 **OPTIONAL** - For email notifications

---

### **10. Twilio (SMS/WhatsApp Alternative)**

**What it's for:** SMS notifications, alternative WhatsApp API

**How to create:**
1. Go to: https://www.twilio.com/
2. Sign up for account
3. Verify phone number
4. Get credentials from console

**Credentials to send you:**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Cost:** Pay as you go, ~$0.0075 per SMS

**Priority:** 🟢 **OPTIONAL** - For SMS features

---

## 📊 **Priority Summary**

### **Phase 1: MVP Launch (MUST HAVE)**
1. ✅ **OpenAI** - AI brain (already added to .env)
2. ⚠️ **Stripe** - Payment processing (NEED ASAP!)
3. ⚠️ **Meta/WhatsApp** - Already integrated, needs credentials
4. ✅ **Database** - Already set up (Supabase)
5. ✅ **Telegram** - Already working

### **Phase 2: Growth (Add Within 1 Month)**
6. PayPal - Alternative payment
7. SendGrid - Email notifications
8. Flutterwave/Paystack - Africa payments

### **Phase 3: Scale (Add Later)**
9. Twilio - SMS notifications
10. Additional payment processors

---

## 📝 **How Client Should Send Credentials**

### **Option 1: Secure .env File (Recommended)**

Client creates a file called `production.env`:

```env
# AI Brain
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx

# Payment Processing
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# WhatsApp Business
META_APP_ID=123456789012345
META_APP_SECRET=abcdef123456789abcdef123456789ab
WHATSAPP_BUSINESS_ACCOUNT_ID=123456789012345
WHATSAPP_PHONE_NUMBER_ID=123456789012345
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=your_custom_secret
WHATSAPP_APP_SECRET=abcdef123456789abcdef

# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/[DATABASE]

# Optional
PAYPAL_CLIENT_ID=xxxxxxxxxxxxx
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

Send via:
- Encrypted email (password-protected zip)
- Secure file sharing (Google Drive with restricted access)
- LastPass/1Password shared vault

### **Option 2: Step-by-Step (More Secure)**

Client sends each credential separately with context:

```
Subject: OpenAI API Key
Body: Here's the OpenAI API key for the AI brain:
sk-proj-xxxxxxxxxxxxxxxxxxxxx

Please add it to the .env file as OPENAI_API_KEY
```

---

## 💰 **Cost Breakdown for Client**

### **Monthly Costs (Estimated for 1,000 customers/day)**

| Service | Cost | Required? |
|---------|------|-----------|
| OpenAI (GPT-4o) | $15-60 | ✅ Required |
| Stripe | 2.9% per transaction | ✅ Required |
| WhatsApp Business | Free (1k/mo) or $5-50 | ✅ Required |
| Supabase/Database | $0-25 | ✅ Required |
| Telegram | Free | ✅ Required |
| PayPal | 2.9% per transaction | ⭐ Optional |
| SendGrid | $0-15 | ⭐ Optional |
| Flutterwave | 1.4% per transaction | ⭐ Optional |
| **Total (MVP)** | **~$40-135/month + transaction fees** | - |

---

## 🔐 **Security Reminders for Client**

When creating accounts:

1. ✅ **Use strong passwords** (password manager)
2. ✅ **Enable 2FA** on all accounts
3. ✅ **Use business email** (not personal)
4. ✅ **Keep test/live keys separate**
5. ✅ **Never share keys in plain text email**
6. ✅ **Rotate keys quarterly**
7. ✅ **Use environment variables** (never hardcode)
8. ✅ **Restrict API key permissions** (only what's needed)

---

## 📞 **What to Tell Your Client**

**Email Template:**

```
Subject: Required Accounts & Credentials for AI Assistant Platform

Hi [Client Name],

To complete the setup of your AI assistant platform, I need you to create the following accounts and send me the credentials securely.

PRIORITY 1 (Needed This Week):
1. OpenAI Account - For AI responses
   → Cost: ~$15-60/month
   → Sign up: https://platform.openai.com/
   
2. Stripe Account - For payment processing
   → Cost: 2.9% + $0.30 per transaction
   → Sign up: https://stripe.com/
   
3. Meta Business Account - For WhatsApp
   → Cost: Free tier (1,000 messages/month)
   → Sign up: https://business.facebook.com/

PRIORITY 2 (Can add later):
4. PayPal Business Account
5. SendGrid for emails

I've attached a detailed guide (CLIENT_ACCOUNTS_REQUIRED.md) with step-by-step instructions for each account.

Please send credentials via encrypted email or secure file sharing.

Total estimated monthly cost: $40-135 + transaction fees

Let me know if you have questions!

Best regards,
[Your Name]
```

---

## ✅ **Checklist for You**

When client sends credentials:

- [ ] Receive OpenAI API key
- [ ] Receive Stripe test keys
- [ ] Receive Stripe live keys
- [ ] Receive Meta/WhatsApp credentials
- [ ] Receive database connection string (if new)
- [ ] Receive Telegram bot token (if new)
- [ ] Add all to `.env` file
- [ ] Test each integration
- [ ] Enable webhook endpoints
- [ ] Verify payment flow works
- [ ] Test WhatsApp messaging
- [ ] Test AI responses

---

## 🎉 **Summary**

**Client MUST create:**
1. ✅ OpenAI (AI brain)
2. ✅ Stripe (payments)
3. ✅ Meta/WhatsApp (messaging)

**Client SHOULD create (soon):**
4. PayPal (alternative payment)
5. SendGrid (emails)

**Client CAN create (later):**
6. Flutterwave/Paystack (Africa)
7. Twilio (SMS)

**Total setup time:** 2-3 hours
**Total monthly cost:** $40-135 + transaction fees

---

**Ready to send this to your client!** 🚀
