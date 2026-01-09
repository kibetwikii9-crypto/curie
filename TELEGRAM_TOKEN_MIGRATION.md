# Telegram Bot Token System

## Overview

The Telegram integration uses **per-business bot tokens** stored in the database.

## How It Works

- Users connect their Telegram bot through the dashboard UI (Integrations → Telegram)
- Bot tokens are stored per-business in the database (encrypted)
- Each business can have their own bot
- Webhook handler automatically uses the correct bot token from the database

## Setup

1. Go to **Dashboard → Integrations → Telegram**
2. Click **"Connect Bot"**
3. Enter your Telegram bot token (from @BotFather)
4. Click **"Connect"**
5. The webhook is automatically set up

## Important Notes

- **Webhook URL**: All bots use the same webhook URL (`/telegram/webhook`)
- **Token Lookup**: The system tries each active bot token until one works
- **Multi-Tenant**: Each business can have their own bot
- **No Environment Variables**: Bot tokens are stored in the database, not in `.env`

## Troubleshooting

### Bot Not Replying
1. Check if bot is connected via UI (Integrations page)
2. Verify webhook is set (check Render logs)
3. Check Render logs for token lookup errors
4. Ensure bot token is valid (test via @BotFather)

### Multiple Bots
- Each business should connect their own bot via the UI
- The system automatically uses the correct token for each bot
- All bots share the same webhook URL

