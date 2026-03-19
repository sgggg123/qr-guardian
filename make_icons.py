from PIL import Image, ImageDraw

img = Image.new('RGBA', (192, 192), (67, 56, 202, 255))
draw = ImageDraw.Draw(img)
draw.ellipse([20, 20, 172, 172], fill=(255, 255, 255, 200))
img.save('frontend/public/icons/icon-192x192.png', 'PNG')

img2 = Image.new('RGBA', (512, 512), (67, 56, 202, 255))
draw2 = ImageDraw.Draw(img2)
draw2.ellipse([50, 50, 462, 462], fill=(255, 255, 255, 200))
img2.save('frontend/public/icons/icon-512x512.png', 'PNG')

print('아이콘 생성 완료!')
