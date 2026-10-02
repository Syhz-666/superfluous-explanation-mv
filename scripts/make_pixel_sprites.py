# -*- coding: utf-8 -*-
"""Downscale AI-generated pixel art to exact 48x48 / 96x96 sprites.

Robust method (works regardless of source grid alignment):
1. Box-filter (area average) downscale to the exact target size.
2. Median-cut palette quantization with dithering OFF -> every pixel is a
   single solid colour, giving a clean retro look.
3. Emit x8 / x4 nearest-neighbour previews for easy viewing.
"""
from PIL import Image

SRC_48 = r"D:\AAA-MyProfile\小短片\out\Tiny_48x48_style_retro_pixel_a_2026-10-01T15-51-52.png"
SRC_96 = r"D:\AAA-MyProfile\小短片\out\96x96_style_detailed_retro_pix_2026-10-01T15-51-53.png"
OUT_DIR = r"D:\AAA-MyProfile\小短片\out"


def make_sprite(src_path, target, out_path, preview_path, preview_scale, colors):
    img = Image.open(src_path).convert("RGB")
    # area-average downscale to exact target
    small = img.resize((target, target), Image.BOX)
    # quantize to a limited palette, no dithering -> solid pixel colours
    sprite = small.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.NONE)
    sprite.save(out_path)
    preview = sprite.resize((target * preview_scale,) * 2, Image.NEAREST)
    preview.save(preview_path)
    print(f"saved {out_path} and {preview_path}")


make_sprite(
    SRC_48, 48,
    OUT_DIR + r"\大肥鱼_pixel_48x48.png",
    OUT_DIR + r"\大肥鱼_pixel_48x48_预览.png",
    8, 16,
)
make_sprite(
    SRC_96, 96,
    OUT_DIR + r"\大肥鱼_pixel_96x96.png",
    OUT_DIR + r"\大肥鱼_pixel_96x96_预览.png",
    4, 32,
)
print("done")
