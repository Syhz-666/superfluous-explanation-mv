# -*- coding: utf-8 -*-
"""
音频结构分析 —— 产出驱动 MV 动画的时间码表。

我看不到也听不到音频，所以卡点不能靠"听"，只能靠 DSP 算出来。
这个脚本的输出就是后续所有动画的时间基准。

输出:
  analysis.json   给 Remotion 代码读的机器可读时间码
  控制台          给人校对的可读表格
"""
import json
import os
import sys

import numpy as np
import librosa

SR = 22050          # 分析用采样率，够用且快
FPS = 30            # 成片帧率，时间码要换算成帧号
HOP = 512

ASSETS = r"D:\AAA-MyProfile\小短片\assets"
AUDIO = os.path.join(ASSETS, "许嵩 - 多余的解释.wav")
OUT = r"D:\AAA-MyProfile\小短片\analysis.json"


def main():
    print(f"读取 {os.path.basename(AUDIO)} ...")
    y, sr = librosa.load(AUDIO, sr=SR, mono=True)
    duration = librosa.get_duration(y=y, sr=sr)
    print(f"时长 {duration:.3f} 秒\n")

    # ── 1. 节拍 ──────────────────────────────────────────
    tempo, beat_times = librosa.beat.beat_track(y=y, sr=sr, units="time", hop_length=HOP)
    bpm = float(np.atleast_1d(tempo)[0])

    # ── 2. 起音（每一次鼓点/音符attack）──────────────────
    onset_frames = librosa.onset.onset_detect(
        y=y, sr=sr, hop_length=HOP, units="frames", backtrack=True
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=HOP)

    # ── 3. 每拍强度（用 onset 包络在拍点上的取值）────────
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP)
    beat_frames = librosa.time_to_frames(beat_times, sr=sr, hop_length=HOP)
    beat_frames = np.clip(beat_frames, 0, len(onset_env) - 1)
    beat_strength = onset_env[beat_frames]
    # 归一化到 0..1，方便直接当动画强度用
    if beat_strength.max() > 0:
        beat_strength_norm = beat_strength / beat_strength.max()
    else:
        beat_strength_norm = beat_strength

    # ── 4. 结构分段（按音色变化切）───────────────────────
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=HOP)
    k = 8
    bound_frames = librosa.segment.agglomerative(chroma, k=k)
    bound_times = librosa.frames_to_time(bound_frames, sr=sr, hop_length=HOP)

    # ── 5. 能量曲线（每 0.5 秒一格，看段落强弱）──────────
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=HOP)
    step = 0.5
    grid = np.arange(0, duration, step)
    rms_grid = np.interp(grid, rms_times, rms)
    if rms_grid.max() > 0:
        rms_grid = rms_grid / rms_grid.max()

    # ── 输出 JSON ────────────────────────────────────────
    data = {
        "source": os.path.basename(AUDIO),
        "duration": round(duration, 3),
        "fps": FPS,
        "bpm": round(bpm, 2),
        "beat_count": len(beat_times),
        "beats": [
            {
                "sec": round(float(t), 3),
                "frame": int(round(float(t) * FPS)),
                "strength": round(float(s), 3),
                # 4/4 假设下的粗略小节推断 —— 需要人工校对
                "is_downbeat_guess": bool(i % 4 == 0),
            }
            for i, (t, s) in enumerate(zip(beat_times, beat_strength_norm))
        ],
        "onsets_sec": [round(float(t), 3) for t in onset_times],
        "sections": [
            {"sec": round(float(t), 3), "frame": int(round(float(t) * FPS))}
            for t in bound_times
        ],
        "energy_curve": {
            "step_sec": step,
            "values": [round(float(v), 3) for v in rms_grid],
        },
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── 控制台可读输出 ───────────────────────────────────
    bar_sec = 4 * 60.0 / bpm
    print("=" * 62)
    print(f"  BPM            {bpm:.2f}")
    print(f"  一拍           {60.0 / bpm:.3f} 秒 = {60.0 / bpm * FPS:.2f} 帧")
    print(f"  一小节(4/4)    {bar_sec:.3f} 秒 = {bar_sec * FPS:.2f} 帧")
    print(f"  总拍数         {len(beat_times)}")
    print(f"  起音数         {len(onset_times)}")
    print(f"  总时长         {duration:.3f} 秒 = {int(duration * FPS)} 帧")
    print("=" * 62)

    print("\n结构分段（按音色变化自动切，需人工确认是否对应主歌/副歌）:")
    for i, t in enumerate(bound_times):
        end = bound_times[i + 1] if i + 1 < len(bound_times) else duration
        print(f"  段{i+1}  {t:7.2f}s → {end:7.2f}s   帧 {int(t*FPS):>5} → {int(end*FPS):>5}"
              f"   时长 {end - t:6.2f}s")

    print("\n前 16 拍（校对用）:")
    for i, (t, s) in enumerate(zip(beat_times[:16], beat_strength_norm[:16])):
        mark = "●" if i % 4 == 0 else "·"
        print(f"  {mark} 拍{i+1:>3}  {t:7.3f}s  帧{int(round(t*FPS)):>5}  强度 {'█' * int(s * 20)}")

    print(f"\n完整数据已写入 {OUT}")


if __name__ == "__main__":
    sys.exit(main())
