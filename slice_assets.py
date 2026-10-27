import os
import cv2
import numpy as np
from PIL import Image

OUT_DIR = r'C:\aiii\金沙\public\images'
os.makedirs(OUT_DIR, exist_ok=True)
IMG_DIR = r'C:\aiii\金沙\金砂圖片'

def remove_background_floodfill(bgr_img, threshold=238, diff_thresh=18):
    """
    Flood fills from the 4 image corners/borders on light background pixels,
    preserving white highlights inside the object.
    Applies smooth anti-aliased feathering on the edges.
    """
    h, w = bgr_img.shape[:2]
    rgb_img = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2RGB)

    # 找出接近白色的背景像素 (R, G, B 都大於 threshold 且色偏小於 diff_thresh)
    r = rgb_img[:, :, 0].astype(np.int32)
    g = rgb_img[:, :, 1].astype(np.int32)
    b = rgb_img[:, :, 2].astype(np.int32)
    min_val = np.minimum(np.minimum(r, g), b)
    max_diff = np.maximum(np.maximum(np.abs(r - g), np.abs(g - b)), np.abs(r - b))

    is_light = (min_val >= threshold) & (max_diff <= diff_thresh)

    # 使用 floodFill 從圖像邊緣向內漫延背景
    mask_to_fill = np.zeros((h + 2, w + 2), np.uint8)
    mask_to_fill[1:-1, 1:-1] = (~is_light).astype(np.uint8)

    # 建立純背景標記圖
    bg_mask = np.zeros((h, w), np.uint8)

    # 從四周邊界採樣種子點進行 flood fill
    seeds = []
    for x in range(0, w, 10):
        seeds.append((x, 0))
        seeds.append((x, h - 1))
    for y in range(0, h, 10):
        seeds.append((0, y))
        seeds.append((w - 1, y))

    for sx, sy in seeds:
        if is_light[sy, sx] and mask_to_fill[sy + 1, sx + 1] == 0:
            cv2.floodFill(mask_to_fill, None, (sx + 1, sy + 1), 255)

    # 填滿 255 的區域即為背景
    bg_mask = (mask_to_fill[1:-1, 1:-1] == 255)

    # 前景 Alpha
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)

    # 邊緣羽化平滑 (去除硬邊雜色)
    alpha_float = cv2.GaussianBlur(alpha.astype(np.float32), (3, 3), 0.8)
    alpha_smooth = np.clip(alpha_float, 0, 255).astype(np.uint8)

    rgba = np.dstack([rgb_img, alpha_smooth])
    return rgba

def trim_transparent(rgba_img, padding=12):
    """裁切掉周圍全透明的空白區域，保留指定邊距"""
    alpha = rgba_img[:, :, 3]
    coords = cv2.findNonZero((alpha > 10).astype(np.uint8))
    if coords is None:
        return rgba_img
    x, y, w, h = cv2.boundingRect(coords)
    H, W = rgba_img.shape[:2]
    x1 = max(0, x - padding)
    y1 = max(0, y - padding)
    x2 = min(W, x + w + padding)
    y2 = min(H, y + h + padding)
    return rgba_img[y1:y2, x1:x2]

def save_rgba(rgba_img, filename, max_size=512):
    """縮放至最適遊戲尺寸並儲存為 PNG"""
    trimmed = trim_transparent(rgba_img)
    pil_img = Image.fromarray(trimmed, 'RGBA')

    w, h = pil_img.size
    if max(w, h) > max_size:
        ratio = max_size / max(w, h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    out_path = os.path.join(OUT_DIR, filename)
    pil_img.save(out_path, format='PNG', optimize=True)
    print(f'Saved {filename}: {pil_img.size}')

def process_treasures():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_syxx99syxx99syxx.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    # 精準避開文字標籤，僅裁切寶物本身
    boxes = {
        'gold_dust.png': (int(w*0.04), int(h*0.11), int(w*0.48), int(h*0.39)),
        'gold_coin.png': (int(w*0.62), int(h*0.09), int(w*0.95), int(h*0.40)),
        'gold_nugget.png': (int(w*0.06), int(h*0.53), int(w*0.37), int(h*0.83)),
        'ruby.png': (int(w*0.41), int(h*0.53), int(w*0.64), int(h*0.82)),
        'amber.png': (int(w*0.67), int(h*0.53), int(w*0.94), int(h*0.83))
    }

    for fname, (x1, y1, x2, y2) in boxes.items():
        crop = img[y1:y2, x1:x2]
        rgba = remove_background_floodfill(crop, threshold=235)
        save_rgba(rgba, fname, max_size=384)

def process_junk():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_p35973p35973p359.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    boxes = {
        'rusty_bolt.png': (int(w*0.03), int(h*0.06), int(w*0.32), int(h*0.46)),
        'soda_can.png': (int(w*0.36), int(h*0.09), int(w*0.64), int(h*0.46)),
        'old_boot.png': (int(w*0.66), int(h*0.05), int(w*0.96), int(h*0.47)),
        'rusty_key.png': (int(w*0.04), int(h*0.51), int(w*0.32), int(h*0.90)),
        'old_magnet.png': (int(w*0.38), int(h*0.52), int(w*0.62), int(h*0.90)),
        'fish_bone.png': (int(w*0.64), int(h*0.58), int(w*0.97), int(h*0.86))
    }

    for fname, (x1, y1, x2, y2) in boxes.items():
        crop = img[y1:y2, x1:x2]
        rgba = remove_background_floodfill(crop, threshold=235)
        save_rgba(rgba, fname, max_size=384)

def process_gold_pan():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_gqovnqgqovnqgqov.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    # 淘金盤在中心，裁切邊緣小星芒
    pan_crop = img[int(h*0.08):int(h*0.88), int(w*0.06):int(w*0.94)]
    rgba = remove_background_floodfill(pan_crop, threshold=235)
    save_rgba(rgba, 'gold_pan.png', max_size=600)

def process_water_vortex():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_t18l3et18l3et18l.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    rgba = remove_background_floodfill(img, threshold=245)
    save_rgba(rgba, 'water_vortex.png', max_size=512)

def process_mud_gravel():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_wkmnwewkmnwewkmn.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    rgba = remove_background_floodfill(img, threshold=245)
    save_rgba(rgba, 'mud_gravel.png', max_size=512)

def process_riverbed():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_ei7sh4ei7sh4ei7s.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    # 上半部是白色天空/淡白背景，去除上方純白，讓溪流底部更自然融入畫面
    rgba = remove_background_floodfill(img, threshold=248)
    save_rgba(rgba, 'river_bed.png', max_size=1280)

def process_particles():
    p = os.path.join(IMG_DIR, 'Gemini_Generated_Image_m7yd5vm7yd5vm7yd.jpg')
    data = np.fromfile(p, dtype=np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    h, w = img.shape[:2]

    parts = {
        'water_splash.png': (int(w*0.06), int(h*0.38), int(w*0.28), int(h*0.65)),
        'water_bubble.png': (int(w*0.31), int(h*0.40), int(w*0.48), int(h*0.58)),
        'mud_splash.png': (int(w*0.54), int(h*0.08), int(w*0.78), int(h*0.28)),
        'mud_rock.png': (int(w*0.53), int(h*0.38), int(w*0.70), int(h*0.55)),
    }

    for fname, (x1, y1, x2, y2) in parts.items():
        crop = img[y1:y2, x1:x2]
        rgba = remove_background_floodfill(crop, threshold=245)
        save_rgba(rgba, fname, max_size=256)

if __name__ == '__main__':
    print('Processing treasures...')
    process_treasures()
    print('Processing junk...')
    process_junk()
    print('Processing gold pan...')
    process_gold_pan()
    print('Processing water vortex...')
    process_water_vortex()
    print('Processing mud gravel...')
    process_mud_gravel()
    print('Processing riverbed...')
    process_riverbed()
    print('Processing particles...')
    process_particles()
    print('All images processed successfully!')
