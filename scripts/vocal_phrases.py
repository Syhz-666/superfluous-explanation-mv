# -*- coding: utf-8 -*-
"""
用基频跟踪切出真正被唱出来的乐句。

之前用能量包络失败：人声是连续的、乐器也在响，阈值一松就并成一片。
基频跟踪不一样 —— 唱的时候有稳定音高，句与句之间会断（换气）。
所以「有音高的连续段」就是乐句。

输出每个乐句的起止时间，用来和 LRC 时间戳对照，
判断主歌到底有多少句、每句从哪开始。
"""
import sys
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(r"D:\AAA-MyProfile\小短片")
AUDIO = ROOT / "assets" / "许嵩 - 多余的解释.wav"

START, DUR = 9.64, 90.0
HOP = 512
MIN_GAP = 0.32   # 小于这个长度的断开不算换气
MIN_LEN = 0.45   # 短于这个的乐句丢弃


def main():
    y, sr = librosa.load(AUDIO, sr=16000, mono=True, offset=START, duration=DUR)
    print(f"分析 {START}s 起 {DUR}s   采样率 {sr}")

    # pyin 基频跟踪：返回每帧的基频、是否浊音、置信度
    f0, voiced, prob = librosa.pyin(
        y, fmin=90, fmax=520, sr=sr, hop_length=HOP, fill_na=np.nan
    )
    times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=HOP)
    print(f"共 {len(f0)} 帧，浊音帧占比 {np.mean(voiced)*100:.1f}%")

    # 找到浊音段
    segs = []
    cur = None
    for i, v in enumerate(voiced):
        if v and cur is None:
            cur = i
        elif not v and cur is not None:
            segs.append((times[cur], times[i]))
            cur = None
    if cur is not None:
        segs.append((times[cur], times[-1]))

    # 合并间隔很小的段（同一个字里的音高抖动）
    merged = []
    for a, b in segs:
        if merged and a - merged[-1][1] < MIN_GAP:
            merged[-1] = (merged[-1][0], b)
        else:
            merged.append((a, b))
    merged = [(a, b) for a, b in merged if b - a >= MIN_LEN]

    print(f"\n检出乐句 {len(merged)} 个：")
    for i, (a, b) in enumerate(merged):
        gap = a - merged[i - 1][1] if i > 0 else 0
        print(f"  {i+1:2d}.  {a:6.2f} → {b:6.2f}s   时长 {b-a:5.2f}s   距上句 {gap:5.2f}s")

    print(f"\n总句数 {len(merged)}")


if __name__ == "__main__":
    sys.exit(main())
