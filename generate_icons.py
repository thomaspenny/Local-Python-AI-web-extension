"""
Generate extension icons with 'pyAI' text
Requires: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, text="pyAI"):
    # Create a new image with a gradient background
    img = Image.new('RGB', (size, size), color='#1a1a1a')
    draw = ImageDraw.Draw(img)
    
    # Draw a rounded rectangle background
    margin = size // 8
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size // 6,
        fill='#2563eb',
        outline='#1d4ed8',
        width=max(1, size // 32)
    )
    
    # Try to use a nice font, fall back to default if not available
    try:
        # Try common Windows fonts
        font_size = size // 3
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        try:
            font = ImageFont.truetype("C:\\Windows\\Fonts\\arial.ttf", size // 3)
        except:
            font = ImageFont.load_default()
    
    # Draw the text in the center
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, fill='white', font=font)
    
    return img

# Create icons directory if it doesn't exist
os.makedirs('icons', exist_ok=True)

# Generate icons in different sizes
sizes = [16, 48, 128]

print("Generating icons with 'pyAI' text...")
for size in sizes:
    icon = create_icon(size)
    filename = f'icons/icon{size}.png'
    icon.save(filename, 'PNG')
    print(f"Created {filename}")

print("\nDone! Icons generated successfully.")
