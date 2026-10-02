# -*- coding: utf-8 -*-
"""
把参考图转成像素精灵数据。

用法:
    python extract_sprite.py [像素尺寸] [去噪轮数]
    python extract_sprite.py 96 0

要点：
  · 调色板**从原图自动取**（中位切分），不手工挑 —— 手工 12 色在 96×96 上会有断层，
    自动取 20 色能保住发丝和荷叶边的层次
  · 背景从四条边泛洪抠（头饰围裙也是白的，不能一刀切）
  · 只保留最大连通块，去掉原图的星星等零散装饰
  · 去噪默认关掉。它会把细节一起抹平 —— 48×48 那版脸被毁就是这个原因

输出: src/spriteData.ts
"""
import sys
from collections import Counter, deque

import numpy as np
from PIL import Image
from scipy import ndimage

SIZE = int(sys.argv[1]) if len(sys.argv) > 1 else 96
PASSES = int(sys.argv[2]) if len(sys.argv) > 2 else 0
NCOLORS = 20
CROP_Y = 470  # 见 main() 里的说明
TRIM_BOTTOM = 3  # 裁到 470 会带进 Ciallo 文字的顶边，底部这几行直接清掉

# 源图可用第 3 个参数覆盖（改过表情的版本就是从这来的）
SRC = sys.argv[3] if len(sys.argv) > 3 else r"D:\AAA-MyProfile\小短片\assets\大肥鱼.jpg"
OUT = r"D:\AAA-MyProfile\小短片\src\spriteData.ts"

# 调色板索引 -> 字符（最多 36 色）
CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def flood_background(rgb: np.ndarray) -> np.ndarray:
    """
    从**上边和左右两边**泛洪，返回「属于外部背景」的掩码。

    刻意不从下边缘泛洪：角色的白围裙会被裁切线切断，切口正好贴在下边缘上，
    从下面灌水就会顺着切口把围裙整片吃掉（第一版中间那个大洞就是这么来的）。
    """
    near_white = rgb.min(axis=2) > 222
    visited = np.zeros((SIZE, SIZE), dtype=bool)
    q = deque()
    for x in range(SIZE):
        if near_white[0, x] and not visited[0, x]:
            visited[0, x] = True
            q.append((0, x))
    for y in range(SIZE):
        for x in (0, SIZE - 1):
            if near_white[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < SIZE and 0 <= nx < SIZE and not visited[ny, nx] and near_white[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))
    return visited


def keep_largest_blob(grid: np.ndarray) -> np.ndarray:
    mask = grid != "."
    labeled, n = ndimage.label(mask, structure=np.ones((3, 3)))
    if n <= 1:
        return grid
    sizes = ndimage.sum(mask, labeled, range(1, n + 1))
    biggest = int(np.argmax(sizes)) + 1
    out = grid.copy()
    out[labeled != biggest] = "."
    print(f"  连通块 {n} 个，丢掉 {n - 1} 个零散块")
    return out


def despeckle(grid: np.ndarray, passes: int) -> np.ndarray:
    for p in range(passes):
        new = grid.copy()
        changed = 0
        for y in range(SIZE):
            for x in range(SIZE):
                me = grid[y, x]
                neigh = [
                    grid[ny, nx]
                    for ny in range(max(0, y - 1), min(SIZE, y + 2))
                    for nx in range(max(0, x - 1), min(SIZE, x + 2))
                    if (ny, nx) != (y, x)
                ]
                if sum(1 for c in neigh if c == me) < 3:
                    common = Counter(neigh).most_common(1)[0][0]
                    if common != me:
                        new[y, x] = common
                        changed += 1
        grid = new
        print(f"  去噪第 {p+1} 轮：改了 {changed} 格")
    return grid


def main():
    src = Image.open(SRC).convert("RGB")
    w, h = src.size

    # 裁到 y=470：再往上会把围裙拦腰切断，再往下就开始混进 Ciallo 文字
    # （实测文字的左边缘在 y=469，角色的裙摆底边在 y=460 上下）
    top = src.crop((0, 0, w, CROP_Y))
    a = np.array(top)
    ys, xs = np.where(a.min(axis=2) < 232)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    print(f"原图 {src.size} → 裁到 y={CROP_Y} → 包围盒 {box}")

    char = src.crop(box)
    small_img = char.resize((SIZE, SIZE), Image.LANCZOS)
    rgb = np.array(small_img).astype(float)

    # 自动取色：中位切分，不抖动
    q = small_img.quantize(colors=NCOLORS, method=Image.MEDIANCUT, dither=Image.NONE)
    idx_grid = np.array(q)
    pal = np.array(q.getpalette()[: NCOLORS * 3]).reshape(-1, 3)
    print(f"自动取色 {len(pal)} 个")

    grid = np.array(list(CHARS))[idx_grid]

    bg = flood_background(rgb)
    grid[bg] = "."
    print(f"  背景抠掉 {int(bg.sum())} 格")

    grid = keep_largest_blob(grid)
    if TRIM_BOTTOM > 0:
        grid[SIZE - TRIM_BOTTOM :, :] = "."
        print(f"  清掉底部 {TRIM_BOTTOM} 行（文字残留）")
    if PASSES > 0:
        grid = despeckle(grid, PASSES)

    rows = ["".join(r) for r in grid]
    used = sorted({c for r in rows for c in r if c != "."}, key=CHARS.index)

    lines = [
        "// 由 scripts/extract_sprite.py 从参考图自动生成，可逐格手工微调。",
        "// 一个字符 = 一个像素，'.' 为透明。",
        "",
        "export const SPRITE_PALETTE: Record<string, string> = {",
    ]
    for c in used:
        r, g, b = pal[CHARS.index(c)]
        lines.append(f"  '{c}': '#{int(r):02X}{int(g):02X}{int(b):02X}',")
    lines += ["};", "", f"export const SPRITE_SIZE = {SIZE};", "", "export const SPRITE: string[] = ["]
    lines += [f"  '{r}'," for r in rows]
    lines += ["];", ""]

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  用色 {len(used)} 个，已写入 {OUT}")


if __name__ == "__main__":
    main()
