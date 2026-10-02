# -*- coding: utf-8 -*-
"""
把歌词语句对齐到时间轴。

我们手上有两样东西：
  · 55 个**已验证准确**的时间戳（100% 落在音频起音点上）
  · 完整歌词文本

缺的是「哪句配哪个时间」。这个脚本从音频里切出人声乐句，
再和 LRC 时间戳交叉验证，推出一张对齐表供人工确认。
"""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(r"D:\AAA-MyProfile\小短片")
AUDIO = ROOT / "assets" / "许嵩 - 多余的解释.wav"

LRC = sorted(
    float(x)
    for x in """
9.64 17.01 21.02 24.83 28.73 32.33 32.63 36.38 40.25 43.98 47.46 47.80 50.72
55.53 59.45 62.78 63.59 71.11 78.78 86.50 92.53 97.89 103.59 107.38 111.26
114.70 115.43 118.17 122.80 126.58 129.95 130.65 138.32 146.00 153.65 159.65
161.64 165.08 168.95 172.78 176.40 180.03 180.18 188.24 195.99 203.65 209.60
211.10 211.30 218.95 226.64 234.44 240.36 245.42 260.20
""".split()
)


def main():
    y, sr = librosa.load(AUDIO, sr=22050, mono=True)
    hop = 512

    # 人声主要能量在 200–4000 Hz，只取这一段，避开贝斯和镲
    S = np.abs(librosa.stft(y, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr)
    band = (freqs >= 200) & (freqs <= 4000)
    env = S[band].mean(axis=0)
    env = env / (env.max() or 1)
    times = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=hop)

    # 平滑，避免字与字之间的瞬间凹陷被当成停顿
    env_s = librosa.util.normalize(
        np.convolve(env, np.hanning(31) / np.hanning(31).sum(), mode="same")
    )

    print("=" * 68)
    print("LRC 时间戳之间的间隔（找规律：哪些是短促的感叹词，哪些是真乐句）")
    print("=" * 68)
    for i, t in enumerate(LRC[:26]):
        gap = t - LRC[i - 1] if i > 0 else 0
        # 该时刻的人声能量
        j = int(np.argmin(np.abs(times - t)))
        e = env_s[max(0, j - 2) : j + 3].max()
        tag = ""
        if 0 < gap < 1.0:
            tag = "  ← 间隔极短，多半是 Ok/Ooook 这类感叹词"
        elif gap > 6.5:
            tag = "  ← 间隔较长，可能是间奏或两句合并"
        print(f"  #{i+1:2d}  {t:7.2f}s   间隔 {gap:5.2f}s   人声能量 {e:.2f}{tag}")

    print()
    print("=" * 68)
    print("人声活跃区间（能量 > 0.25 的连续段）—— 每一段大致对应一个乐句")
    print("=" * 68)
    active = env_s > 0.25
    segs = []
    start = None
    for i, on in enumerate(active):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if times[i] - times[start] > 0.45:  # 短于 0.45s 的不算乐句
                segs.append((times[start], times[i]))
            start = None
    if start is not None:
        segs.append((times[start], times[-1]))

    print(f"检出 {len(segs)} 个乐句段")
    for i, (a, b) in enumerate(segs[:40]):
        print(f"  {i+1:2d}.  {a:7.2f} → {b:7.2f}s   (时长 {b-a:5.2f}s)")


if __name__ == "__main__":
    sys.exit(main())
