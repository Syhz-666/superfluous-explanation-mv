# -*- coding: utf-8 -*-
"""
把别人生成的像素画处理成 Remotion 能直接用的素材。

两件事：
  1. 抠背景 —— 两张图的背景都是烘焙进去的，不是透明的
  2. 放进 public/ —— Remotion 通过 staticFile() 读这里的文件

抠背景必须用**从四边泛洪 + 容差**，不能按颜色一刀切：
角色的头饰和围裙也是白的/浅色的，按颜色切会把它们一起挖空。
96×96 那张的背景还不是单一色（有四个几乎一样的近似灰），所以要给容差。
"""
import shutil
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\AAA-MyProfile\小短片")
OUT = ROOT / "assets" / "pixel"   # 原始像素图
PUBLIC = ROOT / "public"

# 源文件 -> 输出名
JOBS = [
    ("大肥鱼_pixel_48x48.png", "whale-48.png", 14),  # 纯白背景，容差小一点
    ("大肥鱼_pixel_96x96.png", "whale-96.png", 22),  # 近似灰背景，容差给大些
]


def remove_bg(im: Image.Image, tol: int) -> Image.Image:
    """从四边泛洪抠背景，返回带透明通道的图。"""
    rgb = np.array(im.convert("RGB")).astype(int)
    h, w, _ = rgb.shape
    # 以四角的中位色作为背景基准
    corners = np.array([rgb[0, 0], rgb[0, w - 1], rgb[h - 1, 0], rgb[h - 1, w - 1]])
    base = np.median(corners, axis=0)

    close = (np.abs(rgb - base).max(axis=2) <= tol)

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
    for src_name, dst_name, tol in JOBS:
        src = OUT / src_name
        if not src.exists():
            print(f"跳过（找不到 {src}）")
            continue
        im = Image.open(src)
        res = remove_bg(im, tol)
        rgba, n_bg, total = res
        dst = PUBLIC / dst_name
        rgba.save(dst)
        print(f"{src_name} ({im.size[0]}x{im.size[1]})  容差 {tol}")
        print(f"   抠掉 {n_bg}/{total} 格背景（{n_bg * 100 // total}%）")
        print(f"   → {dst}")


if __name__ == "__main__":
    main()
