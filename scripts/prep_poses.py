# -*- coding: utf-8 -*-
"""
把八张姿势图归一化成可切换的素材。

生成出来的图有两个问题必须修，否则切姿势时角色会跳：
  1. 身高不一致（实测极差 76px / 8.1%）
  2. 脚底基线不一致（差 37px）

做法：按角色的实际包围盒高度等比缩放，让每张的角色高度相同；
再把脚底对齐到画布同一水平线、水平居中。最后从四边泛洪抠掉白背景。

输出到 public/poses/，组件里按名字切换。
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SRC = ROOT / "assets" / "poses"   # 原始姿势图
DST = ROOT / "public" / "poses"   # 归一化后给渲染读的

TARGET_H = 900  # 归一化后角色高度（像素）
CANVAS_W, CANVAS_H = 780, 1000
BASELINE = 960  # 脚底在画布上的 y
BG_TOL = 22


def char_bbox(rgb: np.ndarray) -> tuple[int, int, int, int]:
    mask = np.abs(rgb - 250).max(axis=2) > BG_TOL
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def remove_bg(im: Image.Image) -> Image.Image:
    rgb = np.array(im.convert("RGB")).astype(int)
    h, w, _ = rgb.shape
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    base = np.median(corners, axis=0)
    close = np.abs(rgb - base).max(axis=2) <= BG_TOL

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
    return Image.fromarray(out, "RGBA")


def main():
    DST.mkdir(parents=True, exist_ok=True)
    files = sorted(SRC.glob("*.png"))
    print(f"归一化 {len(files)} 张  目标身高 {TARGET_H}px  画布 {CANVAS_W}x{CANVAS_H}\n")

    for f in files:
        im = Image.open(f).convert("RGB")
        x0, y0, x1, y1 = char_bbox(np.array(im).astype(int))
        bh = y1 - y0

        # 1. 等比缩放到统一身高
        s = TARGET_H / bh
        fig = im.crop((x0, y0, x1, y1)).resize(
            (max(1, round((x1 - x0) * s)), max(1, round(bh * s))), Image.LANCZOS
        )

        # 2. 贴到统一画布：脚底对齐基线，水平居中
        canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (250, 250, 250))
        px = (CANVAS_W - fig.size[0]) // 2
        py = BASELINE - fig.size[1]
        canvas.paste(fig, (px, py))

        # 3. 抠背景
        rgba = remove_bg(canvas)
        dst = DST / f.name
        rgba.save(dst)
        print(f"  {f.name:32s} 原高 {bh:4d} → 缩放 {s:.3f} → {TARGET_H}px")

    print(f"\n输出到 {DST}")


if __name__ == "__main__":
    main()
