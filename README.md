# Multi-Tenant Messaging SaaS - Phase 1

Production-ready messaging infrastructure for a multi-tenant SaaS platform supporting WhatsApp Cloud API.

## 🎯 Phase 1 Objectives

✅ WhatsApp message reaches webhook  
✅ Message is stored in Supabase  
✅ Contact and conversation are created  
✅ Static auto-reply is sent  
✅ System supports multiple tenants  
✅ Architecture is ready for AI later  

## 🏗️ Architecture

### Design Principles

- **Multi-Tenancy First**: Complete tenant isolation from day one
- **API-First**: Clean REST API, no frontend dependencies
- **Extensibility**: AI can be plugged in without refactoring
- **Reliability**: Webhooks never crash, graceful error handling
- **Scalability**: Designed for 10,000+ businesses

### Key Components

1. **Webhook Handlers**: Receive and verify platform webhooks
2. **Channel Services**: Platform-specific message parsing
3. **Message Router**: Routes messages through the system
4. **Response Handler**: Sends replies back to users
5. **Database Layer**: Tenant-scoped database operations

See [WHATSAPP_OAUTH_SETUP.md](./WHATSAPP_OAUTH_SETUP.md) for WhatsApp integration setup.

## 📋 Prerequisites

- Python 3.11+
- Supabase account and project
- Meta Business Account with WhatsApp Business API access
- PostgreSQL client (for database setup)

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run migration in Supabase SQL Editor
# See SUPABASE_WHATSAPP_MIGRATION.sql for WhatsApp integration setup
```

### 2. Environment Variables

Create `.env` file:

```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
WHATSAPP_VERIFY_TOKEN=your_random_token
WHATSAPP_APP_SECRET=your_app_secret
LOG_LEVEL=INFO
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run Application

```bash
uvicorn app.main:app --reload
```

### 5. Test Webhook Verification

```bash
curl "http://localhost:8000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

Should return: `test123`

## 📚 Documentation

- [WHATSAPP_OAUTH_SETUP.md](./WHATSAPP_OAUTH_SETUP.md) - WhatsApp OAuth integration setup
- [SUPABASE_WHATSAPP_MIGRATION.sql](./SUPABASE_WHATSAPP_MIGRATION.sql) - Database migration for WhatsApp

## 🔒 Security

### Multi-Tenant Isolation

- **Row Level Security (RLS)**: Enabled on all tables
- **Tenant Resolution**: Always resolved from channel, never trusted from client
- **Database Queries**: All queries filtered by tenant_id
- **Webhook Verification**: Signature verification enabled

### Best Practices

- Never trust client-provided tenant_id
- Always resolve tenant from channel identifier
- All database operations are tenant-scoped
- Credentials encrypted in database

## 📊 Database Schema

### Core Tables

- **tenants**: Business accounts
- **channels**: Connected messaging channels
- **contacts**: End users
- **conversations**: Conversation threads
- **messages**: Individual messages

All tables have:
- UUID primary keys
- Proper foreign keys
- Tenant isolation indexes
- RLS policies enabled

## 🔄 Message Flow

```
WhatsApp Message
    ↓
Webhook Handler (verify signature)
    ↓
WhatsApp Service (parse & normalize)
    ↓
UnifiedMessage
    ↓
Message Router
    ├─ Resolve tenant from channel
    ├─ Get/create contact
    ├─ Get/create conversation
    └─ Store message
    ↓
Response Strategy (static reply)
    ↓
Response Handler
    ├─ Send via WhatsApp API
    └─ Store outbound message
```

## 🧪 Testing

### Manual Testing

1. Send WhatsApp message to business number
2. Check application logs
3. Verify in Supabase:
   - Contact created
   - Conversation created
   - Messages stored (inbound + outbound)
4. Verify reply received

### Health Check

```bash
curl http://localhost:8000/health
```

## 🚫 Phase 1 Limitations

**Explicitly NOT included:**
- ❌ AI/LLM logic
- ❌ Embeddings or vector databases
- ❌ Payments
- ❌ Dashboards or UI
- ❌ Analytics
- ❌ Automation workflows

These will be added in Phase 2+.

## 🔮 Future Phases

### Phase 2: AI Integration
- LLM integration point ready
- Response strategy pluggable
- No router refactoring needed

### Phase 3: Additional Channels
- Telegram
- Instagram
- Facebook Messenger

### Phase 4: Dashboard & Analytics
- Agent dashboard
- Conversation management
- Analytics and reporting

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string |
| `META_APP_ID` | Yes | Meta App ID for OAuth |
| `META_APP_SECRET` | Yes | Meta App Secret for OAuth |
| `META_REDIRECT_URI` | Yes | OAuth redirect URI |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Webhook verification token |
| `WHATSAPP_APP_SECRET` | Yes | App secret for signature verification |
| `LOG_LEVEL` | No | Logging level (default: INFO) |
| `PUBLIC_URL` | Yes | Public backend URL for webhooks |

## 🐛 Troubleshooting

### Webhook Not Receiving Messages

1. Verify webhook URL in Meta dashboard
2. Check webhook is verified
3. Check application logs
4. Verify phone number is connected

### Messages Not Stored

1. Check database connection
2. Verify RLS policies
3. Check application logs
4. Verify tenant_id resolution

### Replies Not Sending

1. Verify access token is valid
2. Check WhatsApp API response
3. Verify phone number format (E.164)
4. Check 24-hour session window

## 📄 License

Proprietary - All rights reserved

## 👥 Support

For issues and questions, refer to:
- [WHATSAPP_OAUTH_SETUP.md](./WHATSAPP_OAUTH_SETUP.md) for WhatsApp setup
- [WHATSAPP_READY_CHECKLIST.md](./WHATSAPP_READY_CHECKLIST.md) for deployment checklist

---

**Built for production. Designed for scale. Ready for AI.**

