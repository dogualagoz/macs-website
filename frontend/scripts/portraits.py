#!/usr/bin/env python3
"""Build the nine team portraits: face-framed 3:4 crop, then matched to one another.

Run from frontend/public/assets/images/profiles. Reads <name>.webp (the originals,
untouched) and writes <name>-portrait.webp.

Two passes:
  1. CROP   — a 3:4 window placed on the face, so every portrait shares a head size
              and eye-line. Face boxes are in SOURCE pixels; seven came from
              OpenCV's frontal cascade, nehir and yusufoyan were measured by eye
              because the cascade missed them.
  2. MATCH  — white balance, exposure and saturation pulled toward the set's median,
              measured on the face region only so a dark jacket or a bright sky
              doesn't drag the correction. Nine phone snapshots taken in nine
              different lights otherwise read as a scrapbook at this size.

Adding a tenth member: add their face box below and re-run.
"""
import numpy as np
from PIL import Image, ImageFilter

# name: (src_w, src_h, face_cx, face_cy, face_h, circle_r_or_None)
FACES = {
    "dogupp":     (800, 800, 448, 339, 468, None),
    "leylapp":    (600, 600, 248, 176, 247, None),
    "yusufefepp": (800, 800, 392, 284, 365, None),
    "ceren":      (576, 768, 273, 372,  64, None),
    "deniz":      (2304, 4096, 1144, 1326, 1625, None),
    "nehir":      (1600, 1200, 960, 320, 600, None),
    "emir":       (1254, 1254, 570, 730, 380, 627),   # photo is masked into a circle
    "yusufoyan":  (1617, 2048, 930, 1050, 540, None),
    "sema":       (1170, 1097, 689, 332, 563, None),
}

AR_W, AR_H = 3, 4
OUT_H = 1200
FACE_RATIO = 0.50       # face height as a share of the crop
FACE_Y = 0.38           # where the face centre sits vertically
MIN_FACE_RATIO = 0.26   # floor for low-res sources (ceren) — tighter turns to mush
MAX_UPSCALE = 2.6

T_RG, T_BG, T_L, T_SAT = 1.33, 0.87, 0.465, 0.36   # set medians
STRENGTH = {'wb': 0.80, 'exp': 0.75, 'sat': 0.80}
GAIN_CLAMP = (0.80, 1.45)


def crop_box(name):
    w, h, cx, cy, fh, r = FACES[name]
    ar = AR_W / AR_H
    ch = fh / FACE_RATIO
    cw = ch * ar
    if cw > w:
        cw, ch = w, w / ar
    if ch > h:
        ch, cw = h, h * ar
    if fh < 200 and fh / ch > MIN_FACE_RATIO:
        ch = min(fh / MIN_FACE_RATIO, h)
        cw = min(ch * ar, w)
        ch = cw / ar
    if r is not None:  # keep the whole crop inside the baked-in circle
        ox, oy = w / 2, h / 2
        while ch > 40:
            x0, y0 = cx - cw / 2, cy - FACE_Y * ch
            corners = [(x0, y0), (x0 + cw, y0), (x0, y0 + ch), (x0 + cw, y0 + ch)]
            if all(((px - ox) ** 2 + (py - oy) ** 2) ** .5 <= r - 2 for px, py in corners):
                break
            ch *= 0.97
            cw = ch * ar
    x0 = max(0, min(cx - cw / 2, w - cw))
    y0 = max(0, min(cy - FACE_Y * ch, h - ch))
    return round(x0), round(y0), round(x0 + cw), round(y0 + ch)


def face_region(a):
    h, w, _ = a.shape
    return a[int(h * .22):int(h * .60), int(w * .28):int(w * .72)]


def lum(x):
    return 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]


def match(a):
    f = face_region(a)
    r, g, b = f[..., 0].mean(), f[..., 1].mean(), f[..., 2].mean()
    a[..., 0] *= float(np.clip((T_RG / (r / g)) ** STRENGTH['wb'], *GAIN_CLAMP))
    a[..., 2] *= float(np.clip((T_BG / (b / g)) ** STRENGTH['wb'], *GAIN_CLAMP))
    a = np.clip(a, 0, 1)

    l = lum(face_region(a)).mean()
    gamma = np.log(max(T_L, 1e-3)) / np.log(max(l, 1e-3))
    a = np.clip(a, 1e-4, 1) ** (1 + (gamma - 1) * STRENGTH['exp'])

    f = face_region(a)
    mx, mn = f.max(2), f.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean()
    k = float(np.clip(1 + (T_SAT / max(sat, 1e-3) - 1) * STRENGTH['sat'], 0.35, 1.6))
    L = lum(a)[..., None]
    return np.clip(L + (a - L) * k, 0, 1)


for name in FACES:
    src = Image.open(f'{name}.webp').convert('RGB')
    box = crop_box(name)
    im = src.crop(box)
    target_h = min(OUT_H, round(im.height * MAX_UPSCALE))
    target_w = round(target_h * AR_W / AR_H)
    upscaled = target_w > im.width
    im = im.resize((target_w, target_h), Image.LANCZOS)
    if upscaled:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=3))

    a = match(np.asarray(im, dtype=np.float32) / 255)
    out = Image.fromarray((a * 255).round().astype(np.uint8))
    out.save(f'{name}-portrait.webp', 'WEBP', quality=86, method=6)
    print(f'{name:12s} crop={box} -> {target_w}x{target_h}{"  upscaled" if upscaled else ""}')
