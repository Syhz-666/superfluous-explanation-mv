# -*- coding: utf-8 -*-
"""
把 LRC 和本地音频对齐验证。

关键：LRC 有多个流传版本，时间戳可能整体偏移（网上常见的差 0.5–1.5 秒）。
不能直接信，必须拿音频的起音点校一遍，找出最佳整体偏移量。

做法：以 LRC 时间戳为基准，在 ±3 秒范围内扫描偏移，
使「LRC 时间戳落在音频起音点上」的比例最高。那个偏移就是对的。
"""
import re
import sys
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(r"D:\AAA-MyProfile\小短片")
AUDIO = ROOT / "assets" / "许嵩 - 多余的解释.wav"
LRC = ROOT / "assets" / "lyrics.lrc"


def parse_lrc(path):
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line)
        if not m:
            continue
        t = int(m.group(1)) * 60 + float(m.group(2))
        txt = m.group(3).strip()
        if txt:
            out.append((t, txt))
    return out


def main():
    entries = parse_lrc(LRC)
    print(f"LRC 共 {len(entries)} 句，{entries[0][0]:.2f}s – {entries[-1][0]:.2f}s")

    y, sr = librosa.load(AUDIO, sr=22050, mono=True)
    dur = librosa.get_duration(y=y, sr=sr)
    print(f"音频时长 {dur:.2f}s\n")

    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    times = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=512)
    env = env / (env.max() or 1)
    peaks = librosa.util.peak_pick(
        env, pre_max=3, post_max=3, pre_avg=8, post_avg=8, delta=0.055, wait=6
    )
    peak_times = times[peaks]
    print(f"检出起音点 {len(peak_times)} 个")

    def hit_rate(offset, tol=0.30):
        hit = 0
        for t, _ in entries:
            tt = t + offset
            if tt > dur:
                continue
            if np.min(np.abs(peak_times - tt)) <= tol:
                hit += 1
        return hit / len(entries)

    best, best_r = 0.0, -1
    for off in np.arange(-3.0, 3.001, 0.01):
        r = hit_rate(off)
        if r > best_r:
            best, best_r = off, r
    print(f"\n最佳整体偏移 {best:+.2f}s   命中率 {best_r*100:.1f}%")

    print("\n对照（前 16 句）：")
    for t, txt in entries[:16]:
        tt = t + best
        near = np.min(np.abs(peak_times - tt)) if tt <= dur else 999
        flag = "OK " if near <= 0.30 else "偏差"
        print(f"  {flag} {t:7.3f}s → {tt:7.3f}s   最近起音 {near*1000:6.0f}ms   {txt[:22]}")


if __name__ == "__main__":
    sys.exit(main())
