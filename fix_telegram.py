"""
Telegram Bot Diagnostic & Fix Script
Run this to diagnose and fix Telegram bot issues
"""
import asyncio
import httpx
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def print_warning(msg):
    print(f"{YELLOW}⚠️  {msg}{RESET}")

def print_info(msg):
    print(f"{BLUE}ℹ️  {msg}{RESET}")

async def check_bot_token(bot_token):
    """Check if bot token is valid"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.telegram.org/bot{bot_token}/getMe", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    bot_info = data.get("result", {})
                    print_success(f"Bot token is VALID")
                    print_info(f"   Bot username: @{bot_info.get('username')}")
                    print_info(f"   Bot name: {bot_info.get('first_name')}")
                    return True
            else:
                print_error(f"Bot token is INVALID (HTTP {response.status_code})")
                return False
    except Exception as e:
        print_error(f"Failed to check bot token: {e}")
        return False

async def check_webhook(bot_token):
    """Check current webhook configuration"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                webhook_info = data.get("result", {})
                
                webhook_url = webhook_info.get("url", "")
                pending_updates = webhook_info.get("pending_update_count", 0)
                last_error = webhook_info.get("last_error_message", "")
                
                if webhook_url:
                    print_success(f"Webhook is SET")
                    print_info(f"   URL: {webhook_url}")
                    print_info(f"   Pending updates: {pending_updates}")
                    if last_error:
                        print_warning(f"   Last error: {last_error}")
                    
                    # Check if it's the correct URL
                    expected_url = os.getenv("PUBLIC_URL", "https://automify-ai-backend.onrender.com")
                    if not expected_url.endswith("/telegram/webhook"):
                        expected_url += "/telegram/webhook"
                    
                    if webhook_url != expected_url:
                        print_warning(f"   Expected: {expected_url}")
                        print_warning(f"   Current:  {webhook_url}")
                        return False
                    return True
                else:
                    print_error("Webhook is NOT SET")
                    return False
    except Exception as e:
        print_error(f"Failed to check webhook: {e}")
        return False

async def set_webhook(bot_token):
    """Set the webhook URL"""
    try:
        public_url = os.getenv("PUBLIC_URL", "https://automify-ai-backend.onrender.com")
        webhook_url = f"{public_url}/telegram/webhook"
        
        print_info(f"Setting webhook to: {webhook_url}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{bot_token}/setWebhook",
                json={"url": webhook_url},
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    print_success("Webhook set successfully!")
                    return True
                else:
                    print_error(f"Failed to set webhook: {data.get('description')}")
                    return False
            else:
                print_error(f"Failed to set webhook (HTTP {response.status_code})")
                return False
    except Exception as e:
        print_error(f"Failed to set webhook: {e}")
        return False

def check_database():
    """Check Telegram integration in database"""
    try:
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        result = session.execute(text("""
            SELECT id, channel_name, is_active, credentials, business_id, created_at, updated_at
            FROM channel_integrations
            WHERE channel = 'telegram'
            ORDER BY updated_at DESC
        """))
        
        integrations = result.fetchall()
        
        if not integrations:
            print_error("No Telegram integrations found in database")
            print_info("   Go to: https://automify-ai-frontend.onrender.com/dashboard/integrations")
            print_info("   Click 'Connect' on Telegram and enter your bot token")
            session.close()
            return None
        
        print_success(f"Found {len(integrations)} Telegram integration(s)")
        
        active_integrations = []
        for i, integration in enumerate(integrations, 1):
            print_info(f"\n   Integration #{i}:")
            print_info(f"      ID: {integration.id}")
            print_info(f"      Bot: @{integration.channel_name}")
            print_info(f"      Active: {integration.is_active}")
            print_info(f"      Business ID: {integration.business_id}")
            print_info(f"      Updated: {integration.updated_at}")
            
            if integration.is_active:
                active_integrations.append(integration)
                # Extract bot token
                try:
                    credentials = json.loads(integration.credentials)
                    bot_token = credentials.get("bot_token")
                    if bot_token:
                        print_info(f"      Token: {bot_token[:10]}...{bot_token[-10:]}")
                    else:
                        print_warning("      No bot token found in credentials!")
                except:
                    print_warning("      Failed to parse credentials")
        
        if not active_integrations:
            print_warning("No ACTIVE Telegram integrations found")
            print_info("   Activate one via the dashboard")
        
        session.close()
        return active_integrations[0] if active_integrations else None
        
    except Exception as e:
        print_error(f"Database check failed: {e}")
        return None

async def main():
    print("\n" + "="*60)
    print(f"{BLUE}🤖 Telegram Bot Diagnostic & Fix Tool{RESET}")
    print("="*60 + "\n")
    
    # Step 1: Check database
    print(f"\n{BLUE}[1/4] Checking database...{RESET}")
    integration = check_database()
    
    if not integration:
        print_error("\n❌ No active Telegram integration found!")
        print_info("Fix: Go to dashboard → Integrations → Connect Telegram")
        return
    
    # Extract bot token
    try:
        credentials = json.loads(integration.credentials)
        bot_token = credentials.get("bot_token")
    except:
        print_error("Failed to extract bot token from integration")
        return
    
    if not bot_token:
        print_error("Bot token is empty!")
        return
    
    # Step 2: Check bot token
    print(f"\n{BLUE}[2/4] Checking bot token...{RESET}")
    token_valid = await check_bot_token(bot_token)
    
    if not token_valid:
        print_error("\n❌ Bot token is INVALID!")
        print_info("Fix: Get a new token from @BotFather and update in dashboard")
        return
    
    # Step 3: Check webhook
    print(f"\n{BLUE}[3/4] Checking webhook configuration...{RESET}")
    webhook_ok = await check_webhook(bot_token)
    
    if not webhook_ok:
        print_warning("\nWebhook is not configured correctly")
        print_info("Attempting to fix...")
        
        # Step 4: Fix webhook
        print(f"\n{BLUE}[4/4] Setting webhook...{RESET}")
        fixed = await set_webhook(bot_token)
        
        if fixed:
            print_success("\n✅ Webhook fixed!")
        else:
            print_error("\n❌ Failed to fix webhook")
            print_info("Manual fix:")
            public_url = os.getenv("PUBLIC_URL", "https://automify-ai-backend.onrender.com")
            print_info(f"   1. Go to: https://api.telegram.org/bot{bot_token}/setWebhook")
            print_info(f"   2. POST with body: {{\"url\": \"{public_url}/telegram/webhook\"}}")
    else:
        print_success("\n✅ Webhook is correctly configured!")
    
    # Final summary
    print("\n" + "="*60)
    print(f"{BLUE}📊 SUMMARY{RESET}")
    print("="*60)
    print(f"Bot Token:     {'✅ Valid' if token_valid else '❌ Invalid'}")
    print(f"Webhook:       {'✅ OK' if webhook_ok else '❌ Needs fixing'}")
    print(f"Database:      {'✅ Connected' if integration else '❌ Not found'}")
    print("="*60)
    
    print(f"\n{GREEN}💡 Next steps:{RESET}")
    print("1. Send a message to your bot on Telegram")
    print("2. Check Render logs: https://dashboard.render.com")
    print("3. If still not working, check for errors in logs")
    print()

if __name__ == "__main__":
    asyncio.run(main())
