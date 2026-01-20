# Telegram Bot Diagnostic Script
# This script checks if your Telegram bot is properly configured

Write-Host "=== Telegram Bot Diagnostic Tool ===" -ForegroundColor Green
Write-Host ""

# Step 1: Get bot token
$botToken = $null
$envPath = ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $botTokenLine = $envContent | Where-Object { $_ -match "^BOT_TOKEN=" }
    if ($botTokenLine) {
        $botToken = $botTokenLine -replace "BOT_TOKEN=", "" -replace '"', "" -replace "'", ""
        Write-Host "✅ Found BOT_TOKEN in .env" -ForegroundColor Green
    }
}

if (-not $botToken) {
    Write-Host "⚠️  BOT_TOKEN not found in .env" -ForegroundColor Yellow
    $botToken = Read-Host "Enter your bot token manually"
}

if (-not $botToken) {
    Write-Host "❌ Bot token is required" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 1: Checking Bot Token ===" -ForegroundColor Cyan
try {
    $botInfoUrl = "https://api.telegram.org/bot$botToken/getMe"
    $botInfo = Invoke-RestMethod -Uri $botInfoUrl -Method Get
    
    if ($botInfo.ok) {
        Write-Host "✅ Bot token is valid" -ForegroundColor Green
        Write-Host "   Bot Username: @$($botInfo.result.username)" -ForegroundColor White
        Write-Host "   Bot Name: $($botInfo.result.first_name)" -ForegroundColor White
    } else {
        Write-Host "❌ Bot token is invalid" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Failed to verify bot token: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Checking Webhook Status ===" -ForegroundColor Cyan
try {
    $webhookInfoUrl = "https://api.telegram.org/bot$botToken/getWebhookInfo"
    $webhookInfo = Invoke-RestMethod -Uri $webhookInfoUrl -Method Get
    
    if ($webhookInfo.ok) {
        $webhookUrl = $webhookInfo.result.url
        $pendingUpdates = $webhookInfo.result.pending_update_count
        
        if ($webhookUrl) {
            Write-Host "✅ Webhook is set" -ForegroundColor Green
            Write-Host "   URL: $webhookUrl" -ForegroundColor White
            Write-Host "   Pending Updates: $pendingUpdates" -ForegroundColor White
            
            if ($pendingUpdates -gt 0) {
                Write-Host "   ⚠️  Warning: $pendingUpdates pending updates (webhook may not be working)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Webhook is NOT set" -ForegroundColor Red
            Write-Host ""
            Write-Host "You need to set the webhook URL." -ForegroundColor Yellow
            Write-Host "Get your backend URL from Render dashboard, then run:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "  `$backendUrl = 'https://automify-ai-backend-xxxx.onrender.com'" -ForegroundColor Gray
            Write-Host "  `$webhookUrl = `"`$backendUrl/telegram/webhook`"" -ForegroundColor Gray
            Write-Host "  Invoke-RestMethod -Uri `"https://api.telegram.org/bot$botToken/setWebhook?url=`$webhookUrl`"" -ForegroundColor Gray
            Write-Host ""
        }
    }
} catch {
    Write-Host "❌ Failed to check webhook: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Step 3: Testing Backend Health ===" -ForegroundColor Cyan

# Try to get backend URL from .env
$backendUrl = $null
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath
    $publicUrlLine = $envContent | Where-Object { $_ -match "^PUBLIC_URL=" }
    if ($publicUrlLine) {
        $backendUrl = $publicUrlLine -replace "PUBLIC_URL=", "" -replace '"', "" -replace "'", ""
    }
}

if (-not $backendUrl) {
    Write-Host "⚠️  PUBLIC_URL not found in .env" -ForegroundColor Yellow
    $backendUrl = Read-Host "Enter your backend URL (e.g., https://automify-ai-backend-xxxx.onrender.com)"
}

if ($backendUrl) {
    # Remove trailing slash
    $backendUrl = $backendUrl.TrimEnd('/')
    
    Write-Host "Testing backend at: $backendUrl" -ForegroundColor White
    
    try {
        $healthUrl = "$backendUrl/health"
        $healthResponse = Invoke-RestMethod -Uri $healthUrl -Method Get -ErrorAction Stop
        
        if ($healthResponse.status -eq "ok") {
            Write-Host "✅ Backend is running and healthy" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Backend responded but status is not 'ok'" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Backend is not accessible: $_" -ForegroundColor Red
        Write-Host "   Make sure:" -ForegroundColor Yellow
        Write-Host "   1. Backend is deployed on Render" -ForegroundColor White
        Write-Host "   2. Backend URL is correct" -ForegroundColor White
        Write-Host "   3. Backend service is 'Live' in Render dashboard" -ForegroundColor White
    }
    
    # Test webhook endpoint
    Write-Host ""
    Write-Host "Testing webhook endpoint..." -ForegroundColor White
    try {
        $webhookTestUrl = "$backendUrl/telegram/webhook"
        # This should return 422 (validation error) which means endpoint exists
        try {
            $webhookTest = Invoke-WebRequest -Uri $webhookTestUrl -Method Post -Body "{}" -ContentType "application/json" -ErrorAction Stop
            Write-Host "⚠️  Webhook endpoint returned unexpected status: $($webhookTest.StatusCode)" -ForegroundColor Yellow
        } catch {
            if ($_.Exception.Response.StatusCode -eq 422) {
                Write-Host "✅ Webhook endpoint exists and is accessible" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Webhook endpoint returned: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "❌ Webhook endpoint is not accessible: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Skipping backend test (no URL provided)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If webhook is NOT set, set it using the command shown above" -ForegroundColor White
Write-Host "2. Verify BOT_TOKEN is set in Render dashboard → Backend service → Environment" -ForegroundColor White
Write-Host "3. Check Render logs for any errors when messages are sent" -ForegroundColor White
Write-Host "4. Send a test message to your bot and check logs" -ForegroundColor White
Write-Host ""







