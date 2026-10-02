# -*- coding: utf-8 -*-
"""
从原图生成「普通表情 + 无手势」版本。

原图里角色是 wink（右眼眯）+ 张嘴笑 + 比耶手势，手正好压在右眼该在的位置上。
所以要按这个顺序改：

  1. 抹掉手 —— 用左侧同高区域镜像填过来（那个位置原本是头发）
  2. 右眼镜像 —— 把左眼整体镜像复制到右眼位置，让两只眼都睁开
  3. 换嘴 —— 填成肤色，再画一条中性小弧线
  4. 清残影 —— 原 wink 的睫毛是红棕色，会从镜像补丁的羽化边缘漏出来，
     在局部按颜色挑出来填成肤色

输出: out/neutral_src.png（改好的原图，再交给 extract_sprite.py 降采样）
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = r"D:\AAA-MyProfile\小短片\assets\大肥鱼.jpg"
OUT = r"D:\AAA-MyProfile\小短片\out\neutral_src.png"

FACE_CX = 325  # 面孔中轴（量出来的）


def feathered_paste(base, patch, pos, feather=5):
    """带羽化边缘的粘贴，避免出现硬拼接缝。"""
    w, h = patch.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rectangle((feather, feather, w - feather - 1, h - feather - 1), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather / 2))
    base.paste(patch, pos, m)


def main():
    im = Image.open(SRC).convert("RGB")

    # ── 1. 抹手：用左侧同高区域镜像填补 ──
    hx0, hx1, hy0, hy1 = 388, 460, 262, 355
    mx0 = FACE_CX - (hx1 - FACE_CX)
    mx1 = FACE_CX - (hx0 - FACE_CX)
    patch = im.crop((mx0, hy0, mx1, hy1)).transpose(Image.FLIP_LEFT_RIGHT)
    feathered_paste(im, patch, (hx0, hy0))
    print(f"1. 抹手: x{mx0}-{mx1} 镜像 → x{hx0}-{hx1}")

    # ── 2. 右眼：左眼整体镜像过去 ──
    lx0, ly0, lx1, ly1 = 241, 258, 302, 325
    ex0 = FACE_CX + (FACE_CX - lx1)
    patch = im.crop((lx0, ly0, lx1, ly1)).transpose(Image.FLIP_LEFT_RIGHT)
    feathered_paste(im, patch, (ex0, ly0))
    print(f"2. 右眼: x{lx0}-{lx1} 镜像 → x{ex0}-{ex0 + (lx1 - lx0)}")

    # ── 3. 嘴：填肤色 + 中性小弧线 ──
    cheek = np.array(im.crop((270, 330, 296, 352))).reshape(-1, 3)
    skin = tuple(int(v) for v in np.median(cheek, axis=0))
    ImageDraw.Draw(im).rectangle((300, 312, 348, 350), fill=skin)
    ImageDraw.Draw(im).arc((316, 318, 336, 334), start=15, end=165, fill=(150, 95, 95), width=3)
    print(f"3. 换嘴: 填 {skin} + 小弧线")

    # ── 4. 清 wink 睫毛残影（只在两眼中缝那一小块里找，别动整张脸）──
    #    阈值要收紧：肤色本来就 R>B，放宽了会把脸颊一起改掉
    a = np.array(im).astype(int)
    y0, y1, x0, x1 = 248, 322, 332, 372
    sub = a[y0:y1, x0:x1]
    mark = (sub[:, :, 0] - sub[:, :, 2] > 28) & (sub[:, :, 0] < 215) & (sub[:, :, 0] > 85)
    print(f"4. 残影: 区域内命中 {int(mark.sum())} 像素")
    if mark.any():
        skin_local = np.median(sub[~mark].reshape(-1, 3), axis=0)
        out = a.copy()
        for y, x in zip(*np.where(mark)):
            out[y0 + y, x0 + x] = skin_local
        im = Image.fromarray(out.astype("uint8"))

    im.save(OUT)
    print(f"已写入 {OUT}")


if __name__ == "__main__":
    main()
