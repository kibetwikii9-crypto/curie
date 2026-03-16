"""Binance Pay crypto payment processing service."""
import logging
import hmac
import hashlib
import json
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
import qrcode
import io
import base64

from app.config import settings

logger = logging.getLogger(__name__)


class BinancePayService:
    """Service for Binance Pay crypto payment processing."""
    
    def __init__(self):
        """Initialize Binance Pay with API credentials."""
        self.api_key = settings.binance_api_key
        self.secret_key = settings.binance_secret_key
        self.merchant_id = settings.binance_merchant_id
        self.base_url = "https://bpay.binanceapi.com"
        
        if not all([self.api_key, self.secret_key, self.merchant_id]):
            logger.warning("Binance Pay credentials not configured. Crypto payments will not work.")
    
    def _get_headers(self, payload: str = "") -> Dict[str, str]:
        """Get headers for Binance Pay API requests."""
        timestamp = str(int(time.time() * 1000))
        signature = self._generate_signature(payload, timestamp)
        
        return {
            "Content-Type": "application/json",
            "BinancePay-Timestamp": timestamp,
            "BinancePay-Nonce": str(int(time.time() * 1000000)),  # Random nonce
            "BinancePay-Certificate-SN": self.api_key,
            "BinancePay-Signature": signature
        }
    
    def _generate_signature(self, payload: str, timestamp: str) -> str:
        """Generate HMAC SHA512 signature."""
        message = f"{timestamp}\n{payload}"
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        return signature
    
    async def create_prepay_order(
        self,
        amount: float,
        currency: str = "USDT",
        description: str = "Subscription Payment",
        order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a prepay order for crypto payment."""
        if not order_id:
            order_id = f"curie_{int(time.time())}"
        
        payload = {
            "merchantId": self.merchant_id,
            "merchantTradeNo": order_id,
            "totalFee": str(int(amount * 100)),  # Amount in cents/minor units
            "currency": currency,
            "productName": description,
            "productDetail": description,
            "returnUrl": f"{settings.frontend_url}/billing/success",
            "cancelUrl": f"{settings.frontend_url}/billing/cancel",
            "webhookUrl": f"{settings.backend_url}/api/webhooks/binance",
            "orderType": "WEB"  # WEB for web payments
        }
        
        payload_str = json.dumps(payload, separators=(',', ':'))
        
        url = f"{self.base_url}/binancepay/openapi/v2/order"
        headers = self._get_headers(payload_str)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, content=payload_str)
                response.raise_for_status()
                result = response.json()
                
                if result.get("status") == "SUCCESS":
                    return {
                        "success": True,
                        "prepay_id": result["data"]["prepayId"],
                        "qr_code_url": result["data"]["qrcodeLink"],
                        "order_id": order_id
                    }
                else:
                    logger.error(f"Binance Pay error: {result}")
                    return {"success": False, "error": result.get("errorMessage", "Unknown error")}
                    
        except Exception as e:
            logger.error(f"Failed to create Binance prepay order: {e}")
            return {"success": False, "error": str(e)}
    
    def generate_qr_code(self, qr_url: str) -> str:
        """Generate base64 encoded QR code image."""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        qr_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return f"data:image/png;base64,{qr_base64}"
    
    async def query_order(self, prepay_id: str) -> Dict[str, Any]:
        """Query order status."""
        payload = {
            "prepayId": prepay_id
        }
        
        payload_str = json.dumps(payload, separators=(',', ':'))
        
        url = f"{self.base_url}/binancepay/openapi/v2/order/query"
        headers = self._get_headers(payload_str)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, content=payload_str)
                response.raise_for_status()
                result = response.json()
                
                if result.get("status") == "SUCCESS":
                    return {
                        "success": True,
                        "status": result["data"]["status"],
                        "order_id": result["data"]["merchantTradeNo"]
                    }
                else:
                    return {"success": False, "error": result.get("errorMessage")}
                    
        except Exception as e:
            logger.error(f"Failed to query Binance order: {e}")
            return {"success": False, "error": str(e)}
    
    def verify_webhook_signature(self, payload: str, signature: str, timestamp: str, nonce: str) -> bool:
        """Verify webhook signature."""
        message = f"{timestamp}\n{nonce}\n{payload}\n"
        expected_signature = hmac.new(
            self.secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)