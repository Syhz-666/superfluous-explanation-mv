# -*- coding: utf-8 -*-
"""
准备卡点验证片要用的素材。

  1. 从整首歌里切一段音频到 public/（验证卡点不用整首，20 秒够看）
  2. 把这一段范围内的拍点时间码导成 src/beats.ts，供组件直接 import

拍点来自 analysis.json，是 librosa 算出来的，不是我"听"出来的。
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SONG = ROOT / "assets" / "许嵩 - 多余的解释.wav"
ANALYSIS = ROOT / "analysis.json"
PUBLIC = ROOT / "public"
BEATS_TS = ROOT / "src" / "beats.ts"

FFMPEG = (
    r"C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
)

# 验证片段：从第 15 秒起取 20 秒
SEG_START = 15.0
SEG_LEN = 20.0
FPS = 30


def main():
    data = json.loads(ANALYSIS.read_text(encoding="utf-8"))
    print(f"总时长 {data['duration']}s  BPM {data['bpm']}  总拍数 {data['beat_count']}")

    seg_end = SEG_START + SEG_LEN

    # ── 1. 切音频 ──
    out_audio = PUBLIC / "segment.wav"
    cmd = [
        FFMPEG, "-v", "error", "-y",
        "-ss", str(SEG_START), "-t", str(SEG_LEN),
        "-i", str(SONG),
        "-ac", "2", "-ar", "44100",
        str(out_audio),
    ]
    subprocess.run(cmd, check=True)
    print(f"音频片段 → {out_audio}  ({SEG_START}s 起 {SEG_LEN}s)")

    # ── 2. 挑出落在片段里的拍点，时间轴平移到 0 ──
    beats = []
    for b in data["beats"]:
        if SEG_START <= b["sec"] < seg_end:
            t = b["sec"] - SEG_START
            beats.append(
                {
                    "sec": round(t, 3),
                    "frame": int(round(t * FPS)),
                    "strength": b["strength"],
                    "down": b["is_downbeat_guess"],
                }
            )
    print(f"片段内 {len(beats)} 拍（其中 {sum(1 for b in beats if b['down'])} 个推测为小节线）")

    # ── 3. 导出 TS ──
    lines = [
        "// 由 scripts/prep_beat_test.py 生成 —— 拍点时间码，源自 librosa 分析。",
        "// 时间是相对验证片段起点的秒数。",
        "",
        "export type Beat = {",
        "  sec: number;",
        "  frame: number;",
        "  strength: number;",
        "  down: boolean;",
        "};",
        "",
        f"export const SEGMENT_START = {SEG_START};",
        f"export const SEGMENT_LENGTH = {SEG_LEN};",
        f"export const BEAT_FPS = {FPS};",
        "",
        "export const BEATS: Beat[] = [",
    ]
    for b in beats:
        lines.append(
            f"  {{sec: {b['sec']}, frame: {b['frame']}, "
            f"strength: {b['strength']}, down: {'true' if b['down'] else 'false'}}},"
        )
    lines += ["];", ""]
    BEATS_TS.write_text("\n".join(lines), encoding="utf-8")
    print(f"拍点数据 → {BEATS_TS}")


if __name__ == "__main__":
    sys.exit(main())
