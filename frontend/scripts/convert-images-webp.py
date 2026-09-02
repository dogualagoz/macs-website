"""Statik gorselleri webp'ye cevirir (orijinaller korunur, referanslar guncellenmez).

Kullanim:  python3 scripts/convert-images-webp.py
Hedefler:  public/assets/heroimages/*, public/assets/images/profiles/*,
           public/assets/images/{img_exclude,img_source_code}.png
"""
from PIL import Image
import os

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "assets")
TARGETS = [
    os.path.join(ROOT, "heroimages"),
    os.path.join(ROOT, "images", "profiles"),
]
SINGLE = [
    os.path.join(ROOT, "images", "img_exclude.png"),
    os.path.join(ROOT, "images", "img_source_code.png"),
]

def convert(path):
    out = os.path.splitext(path)[0] + ".webp"
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(path):
        return
    with Image.open(path) as im:
        im.save(out, "WEBP", quality=82, method=6)
    before, after = os.path.getsize(path), os.path.getsize(out)
    print(f"{os.path.relpath(out, ROOT)}: {before//1024}KB -> {after//1024}KB")

total = 0
for d in TARGETS:
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        if f.lower().endswith((".jpg", ".jpeg", ".png")):
            convert(os.path.join(d, f)); total += 1
for f in SINGLE:
    if os.path.exists(f):
        convert(f); total += 1
print("done:", total, "images")
