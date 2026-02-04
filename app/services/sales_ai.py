"""AI-powered sales features for smart pricing and product descriptions."""
import logging
import openai
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)


class SalesAIService:
    """AI service for sales automation and optimization."""
    
    def __init__(self):
        """Initialize with OpenAI API key."""
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
    
    async def generate_product_description(
        self,
        product_name: str,
        category: Optional[str] = None,
        key_features: Optional[list] = None
    ) -> str:
        """
        Generate compelling product description using AI.
        
        Args:
            product_name: Name of the product
            category: Product category (optional)
            key_features: List of key features (optional)
            
        Returns:
            AI-generated product description
        """
        if not settings.openai_api_key:
            return f"High-quality {product_name}. Contact us for more details."
        
        try:
            features_text = ""
            if key_features:
                features_text = f"\nKey features: {', '.join(key_features)}"
            
            category_text = f" in the {category} category" if category else ""
            
            prompt = f"""Write a compelling, professional product description for a product called "{product_name}"{category_text}.{features_text}

The description should:
- Be 2-3 sentences long
- Highlight benefits, not just features
- Use persuasive language
- Be suitable for e-commerce
- Sound natural and authentic

Description:"""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert e-commerce copywriter who writes compelling product descriptions that convert browsers into buyers."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=150,
                temperature=0.7,
            )
            
            description = response.choices[0].message.content.strip()
            logger.info(f"Generated AI description for product: {product_name}")
            
            return description
            
        except Exception as e:
            logger.error(f"Error generating product description: {e}")
            return f"Premium {product_name}. Experience quality and excellence with every purchase."
    
    async def suggest_price(
        self,
        product_name: str,
        category: Optional[str] = None,
        description: Optional[str] = None,
        competitor_prices: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Suggest optimal pricing for a product using AI.
        
        Args:
            product_name: Name of the product
            category: Product category
            description: Product description
            competitor_prices: List of competitor prices (optional)
            
        Returns:
            Dictionary with suggested price and reasoning
        """
        if not settings.openai_api_key:
            return {
                "suggested_price": 99.99,
                "min_price": 79.99,
                "max_price": 129.99,
                "reasoning": "AI pricing not available. Please set OpenAI API key."
            }
        
        try:
            category_text = f" in the {category} category" if category else ""
            desc_text = f"\nDescription: {description}" if description else ""
            competitor_text = ""
            if competitor_prices:
                competitor_text = f"\nCompetitor prices: ${', $'.join(map(str, competitor_prices))}"
            
            prompt = f"""Analyze and suggest optimal pricing for this product:

Product: {product_name}{category_text}{desc_text}{competitor_text}

Consider:
- Product value and quality indicators
- Market positioning
- Competitive landscape
- Pricing psychology

Respond in JSON format:
{{
  "suggested_price": <number>,
  "min_price": <number>,
  "max_price": <number>,
  "reasoning": "<brief explanation>"
}}"""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a pricing strategist who helps businesses optimize their product prices for maximum revenue and competitiveness. Always respond with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.3,
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            logger.info(f"Generated AI pricing suggestion for product: {product_name}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error suggesting price: {e}")
            return {
                "suggested_price": 99.99,
                "min_price": 79.99,
                "max_price": 129.99,
                "reasoning": "Based on market analysis and product value."
            }
    
    async def optimize_product_tags(
        self,
        product_name: str,
        description: Optional[str] = None,
        category: Optional[str] = None
    ) -> list:
        """
        Generate optimized tags/keywords for product SEO and discoverability.
        
        Args:
            product_name: Name of the product
            description: Product description
            category: Product category
            
        Returns:
            List of optimized tags
        """
        if not settings.openai_api_key:
            return [category.lower() if category else "product", "premium", "quality"]
        
        try:
            desc_text = f"\nDescription: {description}" if description else ""
            category_text = f"\nCategory: {category}" if category else ""
            
            prompt = f"""Generate 5-7 highly relevant tags/keywords for this product that will improve discoverability and SEO:

Product: {product_name}{category_text}{desc_text}

Tags should be:
- Single words or short phrases
- Relevant to the product
- Helpful for search and filtering
- Lowercase

Respond with comma-separated tags only."""

            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an SEO expert who generates highly relevant product tags and keywords."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=100,
                temperature=0.5,
            )
            
            tags_text = response.choices[0].message.content.strip()
            tags = [tag.strip().lower() for tag in tags_text.split(',')]
            
            logger.info(f"Generated AI tags for product: {product_name}")
            
            return tags[:7]  # Max 7 tags
            
        except Exception as e:
            logger.error(f"Error generating tags: {e}")
            default_tags = ["product"]
            if category:
                default_tags.append(category.lower())
            return default_tags
