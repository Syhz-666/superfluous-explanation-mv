# -*- coding: utf-8 -*-
"""
校验从网上取到的 LRC 时间戳是否对得上本地音频。

网上的 LRC 时长标注是 8:37，但本地文件只有 4:37 —— 版本可能不同。
所以不能直接信，要拿音频本身对照：如果时间戳真的落在人声起音点上，
说明版本一致，可以用；否则要整体平移或干脆自己做。

做法：算 onset 强度包络，看每个时间戳附近有没有起音峰。
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(r"D:\AAA-MyProfile\小短片")
AUDIO = ROOT / "assets" / "许嵩 - 多余的解释.wav"

# 从 lrc6.com 取到的时间戳（秒）
RAW = """
9.64 17.01 21.02 24.83 28.73 32.33 32.63 36.38 40.25 43.98 47.46 47.80 50.72
55.53 59.45 62.78 63.59 71.11 78.78 86.50 92.53 97.89 103.59 107.38 111.26
114.70 115.43 118.17 122.80 126.58 129.95 130.65 138.32 146.00 153.65 159.65
161.64 165.08 168.95 172.78 176.40 180.03 180.18 188.24 195.99 203.65 209.60
211.10 211.30 218.95 226.64 234.44 240.36 245.42 260.20
"""
TIMES = sorted(float(x) for x in RAW.split())

TOL = 0.35  # 起音点容差（秒）


def main():
    y, sr = librosa.load(AUDIO, sr=22050, mono=True)
    dur = librosa.get_duration(y=y, sr=sr)
    print(f"音频 {dur:.2f}s    LRC 时间戳 {len(TIMES)} 个，范围 {TIMES[0]:.2f}–{TIMES[-1]:.2f}s")

    # onset 强度包络，归一化
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    times = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=512)
    env = env / (env.max() or 1)

    # 峰值位置
    peaks = librosa.util.peak_pick(
        env, pre_max=3, post_max=3, pre_avg=8, post_avg=8, delta=0.06, wait=6
    )
    peak_times = times[peaks]
    print(f"检出起音点 {len(peak_times)} 个\n")

    hits, misses = [], []
    for t in TIMES:
        if t > dur:
            misses.append((t, None))
            continue
        d = np.abs(peak_times - t)
        i = int(np.argmin(d))
        if d[i] <= TOL:
            hits.append((t, float(peak_times[i]), float(d[i])))
        else:
            misses.append((t, float(d[i])))

    print(f"命中 {len(hits)}/{len(TIMES)}  = {len(hits)*100//len(TIMES)}%")
    print(f"偏差中位 {np.median([h[2] for h in hits])*1000:.0f} ms\n" if hits else "")

    if misses:
        print("没对上的（可能版本不同，或该处本来就没有明显起音）:")
        for t, d in [(m[0], m[1]) for m in misses][:15]:
            print(f"  {t:7.2f}s   最近起音距离 {d:.2f}s" if d else f"  {t:7.2f}s   超出音频长度")


if __name__ == "__main__":
    sys.exit(main())
