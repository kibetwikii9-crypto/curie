# 🔧 DATABASE MIGRATION - BILLING SYSTEM

Your database needs to be updated to add the billing system tables and columns.

## ⚡ QUICKEST METHOD: Run on Render (Recommended)

1. **Go to your Render Dashboard**
   - Navigate to your PostgreSQL database
   - Click on the "Shell" tab

2. **Copy & Paste the SQL file**
   - Open `database/migrations/001_add_billing_system.sql`
   - Copy ALL the content
   - Paste it into the Render Shell
   - Press Enter to execute

3. **Verify**
   - You should see "INSERT 0 4" for plans
   - You should see "INSERT 0 5" for add-ons
   - No errors!

4. **Restart Backend**
   - Go to your backend service on Render
   - Click "Manual Deploy" → "Clear build cache & deploy"
   - Wait ~2 minutes for deployment

---

## 🐍 ALTERNATIVE: Run Python Script Locally

If you have local access to your database:

```bash
# From project root
cd database
python run_migration.py
```

This will:
- ✅ Add `trial_ends_at` to `users` table
- ✅ Add `stripe_customer_id` and `payment_status` to `businesses` table
- ✅ Create 9 new billing tables
- ✅ Insert 4 default plans
- ✅ Insert 5 default add-ons
- ✅ Verify everything worked

---

## 📋 What This Migration Does

### Adds to Existing Tables:
- `users.trial_ends_at` - When user's trial expires
- `businesses.stripe_customer_id` - Stripe customer reference
- `businesses.payment_status` - Payment status (active/past_due/suspended)

### Creates New Tables:
1. **plans** - Subscription plans (Starter, Business, Pro, Enterprise)
2. **subscriptions** - Active subscriptions for businesses
3. **invoices** - Invoice records
4. **invoice_line_items** - Line items for invoices
5. **payments** - Payment transactions
6. **payment_methods** - Saved payment cards
7. **usage_records** - Usage tracking (conversations, AI tokens, etc.)
8. **addons** - Available add-ons
9. **subscription_addons** - Add-ons attached to subscriptions
10. **billing_events** - Audit log for billing events

### Seeds Initial Data:
- **4 Plans**: Starter ($25), Business ($49), Pro ($99), Enterprise ($299)
- **5 Add-ons**: Voice AI, Image Recognition, CRM, Payment Processing, Custom Integrations

---

## ⚠️ IMPORTANT NOTES

- This migration is **idempotent** - safe to run multiple times
- Uses `IF NOT EXISTS` for all tables/columns
- Uses `ON CONFLICT DO NOTHING` for seed data
- No data will be lost or duplicated

---

## 🐛 Troubleshooting

### Error: "column already exists"
✅ This is fine! It means the column was already added.

### Error: "relation already exists"
✅ This is fine! It means the table was already created.

### Error: "permission denied"
❌ You need database admin access. Contact your Render support or use the Render Shell method above.

---

## ✅ After Migration

Once complete, your backend will start successfully and you'll be able to:
- ✅ Login without errors
- ✅ View billing plans at `/dashboard/billing/plans`
- ✅ See usage statistics
- ✅ Manage subscriptions (once Stripe keys are added)
