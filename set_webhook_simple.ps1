# Simple Telegram Webhook Setup - No prompts
# Usage: .\set_webhook_simple.ps1

Write-Host "=== Setting Telegram Webhook ===" -ForegroundColor Green
Write-Host ""

# Get bot token from .env
$botToken = $null
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $botTokenLine = $envContent | Where-Object { $_ -match "^BOT_TOKEN=" }
    if ($botTokenLine) {
        $botToken = $botTokenLine -replace "BOT_TOKEN=", "" -replace '"', "" -replace "'", ""
        Write-Host "✅ Found BOT_TOKEN in .env" -ForegroundColor Green
    }
}

if (-not $botToken) {
    Write-Host "❌ BOT_TOKEN not found in .env" -ForegroundColor Red
    Write-Host "Please add BOT_TOKEN to your .env file or set it in Render dashboard" -ForegroundColor Yellow
    exit 1
}

# Set webhook URL
$webhookUrl = "https://automify-ai-backend.onrender.com/telegram/webhook"
Write-Host "Setting webhook to: $webhookUrl" -ForegroundColor Cyan
Write-Host ""

try {
    # Set webhook
    $setUrl = "https://api.telegram.org/bot$botToken/setWebhook?url=$webhookUrl"
    $response = Invoke-RestMethod -Uri $setUrl -Method Get
    
    if ($response.ok) {
        Write-Host "✅ Webhook set successfully!" -ForegroundColor Green
        Write-Host ""
        
        # Verify webhook
        Write-Host "Verifying webhook..." -ForegroundColor Cyan
        $infoUrl = "https://api.telegram.org/bot$botToken/getWebhookInfo"
        $info = Invoke-RestMethod -Uri $infoUrl -Method Get
        
        Write-Host ""
        Write-Host "Webhook Info:" -ForegroundColor Green
        Write-Host "  URL: $($info.result.url)" -ForegroundColor White
        Write-Host "  Pending Updates: $($info.result.pending_update_count)" -ForegroundColor White
        
        if ($info.result.pending_update_count -gt 0) {
            Write-Host ""
            Write-Host "⚠️  Warning: $($info.result.pending_update_count) pending updates" -ForegroundColor Yellow
            Write-Host "   This means Telegram tried to send updates but webhook wasn't working." -ForegroundColor Yellow
            Write-Host "   Send a new message to your bot to test if it's working now." -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "✅ Webhook is ready! Send a message to your bot to test." -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Failed to set webhook" -ForegroundColor Red
        Write-Host ($response | ConvertTo-Json)
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Bot token is correct" -ForegroundColor White
    Write-Host "  2. Backend is deployed and accessible at: $webhookUrl" -ForegroundColor White
    Write-Host "  3. BOT_TOKEN is also set in Render dashboard → Backend → Environment" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Verify BOT_TOKEN is set in Render dashboard → Backend → Environment" -ForegroundColor White
Write-Host "2. Send a test message to your bot" -ForegroundColor White
Write-Host "3. Check Render logs: https://dashboard.render.com → automify-ai-backend → Logs" -ForegroundColor White
Write-Host ""







