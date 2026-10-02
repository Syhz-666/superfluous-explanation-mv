# -*- coding: utf-8 -*-
"""
把三视图切成三个独立角色素材，并抠掉背景。

三视图没有空列分隔（角色的头发和尾巴横向重叠），所以用连通块分析定位边界 ——
实测三块分别是：
    正面 x   74-555
    背面 x  566-1011
    侧面 x 1014-1444

抠背景用从四边泛洪，不能按颜色一刀切：头饰和围裙也是浅色的。
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SHEET = ROOT / "assets" / "reference-sheet.png"
PUBLIC = ROOT / "public"

BG_TOL = 18  # 背景是 #F8F8F8，容差


def find_figures(mask: np.ndarray) -> list[tuple[int, int, int, int]]:
    """连通块分析，返回三个角色的包围盒 (x0,y0,x1,y1)，按 x 排序。"""
    closed = ndimage.binary_closing(mask, structure=np.ones((5, 5)))
    lab, n = ndimage.label(closed, structure=np.ones((3, 3)))
    sizes = ndimage.sum(closed, lab, range(1, n + 1))
    boxes = []
    for i in np.argsort(sizes)[::-1][:3]:  # 取最大的三块
        ys, xs = np.where(lab == i + 1)
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    boxes.sort()
    return boxes


def remove_bg(im: Image.Image, tol: int = BG_TOL) -> Image.Image:
    """从四边泛洪抠背景。"""
    rgb = np.array(im.convert("RGB")).astype(int)
    h, w, _ = rgb.shape
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    base = np.median(corners, axis=0)
    close = np.abs(rgb - base).max(axis=2) <= tol

    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if close[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and close[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    out = np.dstack([rgb.astype(np.uint8), np.where(seen, 0, 255).astype(np.uint8)])
    return Image.fromarray(out, "RGBA"), int(seen.sum()), h * w


def main():
    PUBLIC.mkdir(exist_ok=True)
    im = Image.open(SHEET).convert("RGB")
    a = np.array(im).astype(int)
    mask = np.abs(a - 248).max(axis=2) > BG_TOL

    boxes = find_figures(mask)
    names = ["front", "back", "side"]
    print(f"三视图 {im.size} → 切出 {len(boxes)} 个视角\n")

    # 和 scripts/prep_poses.py 用同一套画布参数：
    # 三视图切出来的要能和八张姿势图互换，画布、身高、基线必须完全一致
    TARGET_H, CANVAS_W, CANVAS_H, BASELINE = 900, 780, 1000, 960

    for name, box in zip(names, boxes):
        piece = im.crop(box)
        # 归一化：等比缩放到统一身高，脚底贴同一基线，水平居中
        s = TARGET_H / piece.size[1]
        fig = piece.resize(
            (max(1, round(piece.size[0] * s)), TARGET_H), Image.LANCZOS
        )
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (250, 250, 250))
        canvas.paste(
            fig, ((CANVAS_W - fig.size[0]) // 2, BASELINE - fig.size[1])
        )
        rgba, n_bg, total = remove_bg(canvas)
        dst = PUBLIC / f"char-{name}.png"
        rgba.save(dst)
        print(
            f"  {name:5s}  原 {piece.size[0]}x{piece.size[1]} → 缩放 {s:.3f}"
            f" → 画布 {CANVAS_W}x{CANVAS_H}  抠背景 {n_bg * 100 // total}%"
        )


if __name__ == "__main__":
    main()
