from PIL import Image
import os

# Configuration
INPUT_IMAGE = "frontend/public/logo-main-no-tagline.png"
OUTPUT_DIR = "frontend/public/favicon"

# Create output directory
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Load image
print(f"Loading image: {INPUT_IMAGE}")
img = Image.open(INPUT_IMAGE).convert("RGBA")

# Remove near-black background (transparent)
print("Removing background...")
clean_pixels = []
for r, g, b, a in img.getdata():
    if r < 12 and g < 12 and b < 12:
        clean_pixels.append((0, 0, 0, 0))
    else:
        clean_pixels.append((r, g, b, a))

img.putdata(clean_pixels)

# Crop to visible logo bounds
print("Cropping to visible bounds...")
bbox = img.getbbox()
if bbox:
    img = img.crop(bbox)

# Create master 512x512 transparent canvas
MASTER_SIZE = 512
canvas = Image.new("RGBA", (MASTER_SIZE, MASTER_SIZE), (0, 0, 0, 0))

# Resize logo proportionally with padding
print("Resizing and centering logo...")
img.thumbnail((MASTER_SIZE - 80, MASTER_SIZE - 80), Image.LANCZOS)  # Add padding

# Center logo
x = (MASTER_SIZE - img.width) // 2
y = (MASTER_SIZE - img.height) // 2
canvas.paste(img, (x, y), img)

# Save master PNG
print("Saving master favicon...")
canvas.save(f"{OUTPUT_DIR}/favicon-512.png", "PNG")

# Standard PNG favicon sizes
sizes = [16, 32, 180, 192, 256, 384]
print("Generating multiple sizes...")
for size in sizes:
    resized = canvas.resize((size, size), Image.LANCZOS)
    resized.save(f"{OUTPUT_DIR}/favicon-{size}.png", "PNG")
    print(f"  ✓ Generated favicon-{size}.png")

# Generate favicon.ico (multi-resolution)
print("Generating favicon.ico...")
canvas.save(
    f"{OUTPUT_DIR}/favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)

# Also save to public root for Next.js auto-detection
canvas_32 = canvas.resize((32, 32), Image.LANCZOS)
canvas_32.save("frontend/public/favicon.ico", "ICO", sizes=[(16, 16), (32, 32), (48, 48)])

# Create apple-icon.png (180x180)
apple_icon = canvas.resize((180, 180), Image.LANCZOS)
apple_icon.save("frontend/app/apple-icon.png", "PNG")

print("\n✔ Favicon set generated successfully!")
print(f"  Output directory: {OUTPUT_DIR}")
print("  Files created:")
print("    - favicon.ico (multi-resolution)")
print("    - favicon-16.png through favicon-512.png")
print("    - frontend/public/favicon.ico")
print("    - frontend/app/apple-icon.png")





