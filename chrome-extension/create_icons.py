#!/usr/bin/env python3
"""
Simple script to create basic PNG icons for the Chrome extension.
Creates 16x16, 48x48, and 128x128 pixel icons with a lock symbol.
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a gradient background circle
    center = size // 2
    radius = size // 2 - 2
    
    # Draw background circle with gradient effect
    for i in range(radius):
        alpha = int(255 * (1 - i / radius))
        color = (102, 126, 234, alpha)  # Blue gradient
        draw.ellipse([center - radius + i, center - radius + i, 
                     center + radius - i, center + radius - i], 
                    fill=color)
    
    # Draw lock symbol
    lock_size = size // 3
    lock_x = center - lock_size // 2
    lock_y = center - lock_size // 2
    
    # Lock body (rectangle)
    body_height = lock_size // 2
    body_y = lock_y + lock_size // 4
    draw.rectangle([lock_x, body_y, lock_x + lock_size, body_y + body_height], 
                  fill=(255, 255, 255, 255))
    
    # Lock shackle (arc)
    shackle_width = lock_size // 2
    shackle_height = lock_size // 3
    shackle_x = lock_x + lock_size // 4
    shackle_y = lock_y
    
    # Draw shackle as a thick arc
    draw.arc([shackle_x, shackle_y, shackle_x + shackle_width, shackle_y + shackle_height], 
             start=0, end=180, fill=(255, 255, 255), width=2)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created {filename} ({size}x{size})")

def main():
    # Create icons directory if it doesn't exist
    os.makedirs('icons', exist_ok=True)
    
    # Create icons in different sizes
    create_icon(16, 'icons/icon16.png')
    create_icon(48, 'icons/icon48.png')
    create_icon(128, 'icons/icon128.png')
    
    print("All icons created successfully!")

if __name__ == '__main__':
    main()
