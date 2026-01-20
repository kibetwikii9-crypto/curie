# Favicon Size Fix

## Issue
The favicon appears very tiny because the `favicon.png` file is likely too small (16x16 or 32x32 pixels).

## Solution
You need to replace `frontend/public/favicon.png` with a larger version:

### Recommended Sizes:
- **Minimum**: 256x256 pixels
- **Optimal**: 512x512 pixels
- **Format**: PNG with transparent background

### Steps:
1. Create or export your favicon at **512x512 pixels**
2. Save it as `favicon.png`
3. Replace the file in `frontend/public/favicon.png`
4. The browser will automatically scale it down for the tab icon but use the full size for bookmarks and home screen icons

### Why This Matters:
- Small favicons (16x16, 32x32) look pixelated when scaled
- Larger favicons (512x512) provide crisp display at all sizes
- Browsers automatically optimize the size for different contexts

The metadata configuration is already set up correctly - you just need a larger source file!




