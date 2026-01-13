# Fix: Favicon Must Be Square

## The Problem
Your current favicon is **1024 × 1536 pixels** (portrait/vertical format).
Favicons **MUST be square** (equal width and height) to display properly.

## The Solution
You need to crop/resize your favicon to a **square format**.

### Recommended Sizes:
- **512 × 512 pixels** (optimal)
- **1024 × 1024 pixels** (if you want maximum quality)

### How to Fix:

#### Option 1: Online Tool (Easiest)
1. Go to **https://www.iloveimg.com/resize-image** or **https://www.freeconvert.com/image-resizer**
2. Upload your current `favicon.png`
3. Set dimensions to **512 × 512** (or 1024 × 1024)
4. Choose "Crop to fit" or "Maintain aspect ratio" - but make sure it's SQUARE
5. Download the square version
6. Replace `frontend/public/favicon.png` with the new square file

#### Option 2: Image Editor (Photoshop, GIMP, Canva)
1. Open your favicon image
2. Create a new square canvas: **512 × 512 pixels**
3. Place your logo/image in the center
4. Crop to fit the square (you may need to crop the top/bottom to make it square)
5. Export as PNG
6. Replace `frontend/public/favicon.png`

#### Option 3: Use Canva (Free)
1. Go to **https://www.canva.com/**
2. Create custom size: **512 × 512 pixels**
3. Upload your logo
4. Center it and adjust to fit the square
5. Download as PNG
6. Replace `frontend/public/favicon.png`

### Important:
- ✅ **Must be square** (512×512, 1024×1024, etc.)
- ✅ **PNG format** with transparent background
- ✅ **Centered** in the square canvas
- ❌ **NOT portrait** (1024×1536)
- ❌ **NOT landscape** (1536×1024)

### After Fixing:
1. Replace `frontend/public/favicon.png` with the square version
2. Commit and push:
   ```bash
   git add frontend/public/favicon.png
   git commit -m "Fix favicon: crop to square format (512x512)"
   git push origin main
   ```
3. Clear browser cache and hard refresh

The favicon should now display at the correct size!


