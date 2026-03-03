# SEO Setup Guide for Automify

## What We've Done

### 1. robots.txt
Location: `frontend/public/robots.txt`
- Allows all search engines to crawl public pages
- Blocks dashboard pages (require authentication)
- Includes sitemap reference

### 2. Dynamic Sitemap
Location: `frontend/app/sitemap.ts`
- Automatically generates XML sitemap
- Available at: https://automifyyai.com/sitemap.xml
- Updates automatically when pages change

### 3. Enhanced Meta Tags
Location: `frontend/app/layout.tsx`
- Complete Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- Robot directives for Google
- Keywords and description
- Canonical URLs

### 4. Structured Data (JSON-LD)
Location: `frontend/components/StructuredData.tsx`
- Schema.org markup for better search results
- Helps Google understand your app
- Shows rich snippets in search results

## Next Steps - Action Required

### Step 1: Google Search Console
1. Go to https://search.google.com/search-console
2. Add property: `https://automifyyai.com`
3. Verify ownership using one of these methods:
   - **HTML file upload**: Download verification file and upload to `frontend/public/`
   - **HTML meta tag**: Copy the verification code and update `frontend/app/layout.tsx` (line with `verification: { google: '...' }`)
   - **DNS TXT record**: Add to your domain DNS settings

### Step 2: Submit Sitemap
After verification:
1. In Google Search Console, go to "Sitemaps"
2. Add sitemap URL: `https://automifyyai.com/sitemap.xml`
3. Click "Submit"

### Step 3: Request Indexing
1. In Google Search Console, use "URL Inspection" tool
2. Enter: `https://automifyyai.com`
3. Click "Request Indexing"

### Step 4: Google Analytics (Optional but Recommended)
1. Create account at https://analytics.google.com
2. Get tracking ID (G-XXXXXXXXXX)
3. Add to `frontend/app/layout.tsx`:

```typescript
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX`}
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  `}
</Script>
```

## Files to Update After Getting Verification Code

### Update Google Verification
Edit `frontend/app/layout.tsx` line ~40:
```typescript
verification: {
  google: 'YOUR-ACTUAL-VERIFICATION-CODE-HERE',
},
```

## Testing

### Test robots.txt
Visit: https://automifyyai.com/robots.txt

### Test Sitemap
Visit: https://automifyyai.com/sitemap.xml

### Test Meta Tags
1. Visit: https://automifyyai.com
2. Right-click → View Page Source
3. Check `<head>` section for all meta tags

### Test Structured Data
Use Google's Rich Results Test: https://search.google.com/test/rich-results
Enter: https://automifyyai.com

## Indexing Timeline

- **Initial crawl**: 1-2 days after submission
- **Full indexing**: 1-2 weeks
- **First rankings**: 2-4 weeks
- **Established rankings**: 2-6 months

## Monitoring

### Check Indexing Status
Google Search: `site:automifyyai.com`

### Check Specific Pages
Google Search: `site:automifyyai.com/maintenance`

## Additional Optimizations (Already Included)

✅ Mobile-responsive design
✅ Fast loading (Next.js optimization)
✅ Semantic HTML
✅ Alt tags for images (recommended to add)
✅ Clean URLs
✅ HTTPS enabled
✅ Proper heading hierarchy

## Need Help?

If Google Search Console shows any errors after deployment, check:
1. Sitemap is accessible
2. robots.txt allows crawling
3. Meta tags are rendering correctly
4. No JavaScript errors blocking content
