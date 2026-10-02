# -*- coding: utf-8 -*-
"""
准备整首歌 MV 的数据。

  · 全曲音频 → public/song.mp3（47MB wav 压成 mp3，渲染更轻）
  · 全曲拍点 → src/songData.ts
  · 九个章节的定义 → src/songData.ts

歌词时间码不在这里生成 —— 见 scripts/align_lyrics.py，
那份是「人工校对文本 + 从音频算出的时间」逐行择优的结果。
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SONG = ROOT / "assets" / "许嵩 - 多余的解释.wav"
ANALYSIS = ROOT / "analysis.json"
PUBLIC = ROOT / "public"
OUT = ROOT / "src" / "songData.ts"

FFMPEG = (
    r"C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
)

FPS = 30

# 章节：(id, 起, 止, 标题, 调色模式)
# 时间取自歌词时间码 —— 每章从"第一句歌词"到"下一章第一句歌词"
CHAPTERS = [
    ("intro",   0.0,    17.32, "前奏",   "cold"),
    ("verse1",  17.32,  64.589, "主歌一", "cold"),
    ("chorus1", 64.589, 100.889, "副歌一", "cold"),
    ("verse2",  100.889, 131.080, "主歌二", "cold"),
    ("chorus2", 131.080, 166.800, "副歌二", "cold"),
    ("bridge",  166.800, 182.300, "桥段",   "warm"),
    ("chorus3", 182.300, 211.680, "副歌三", "fading"),
    ("chorus4", 211.680, 241.360, "副歌四", "pure-cold"),
    ("outro",   241.360, 277.04, "尾奏",   "dark"),
]


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    # ── 1. 音频转 mp3 ──
    out_audio = PUBLIC / "song.mp3"
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-i", str(SONG),
         "-codec:a", "libmp3lame", "-b:a", "192k", str(out_audio)],
        check=True,
    )
    print(f"音频 → {out_audio.name}  ({out_audio.stat().st_size//1024//1024} MB)")

    # ── 2. 歌词时间码（读 align_lyrics.py 的产物）──
    ts = (ROOT / "src" / "lyricTiming.ts").read_text(encoding="utf-8")
    lyrics = [
        {"text": m.group(1), "sec": float(m.group(2))}
        for m in re.finditer(r"text: '([^']+)', sec: ([\d.]+)", ts)
    ]
    print(f"歌词 {len(lyrics)} 句")

    # ── 3. 拍点 ──
    data = json.loads(ANALYSIS.read_text(encoding="utf-8"))
    dur = data["duration"]
    beats = [
        {"sec": b["sec"], "frame": int(round(b["sec"] * FPS)),
         "strength": b["strength"], "down": b["is_downbeat_guess"]}
        for b in data["beats"]
    ]
    print(f"拍点 {len(beats)} 个   总时长 {dur}s")

    # ── 4. 出 TS ──
    L = [
        "// 由 scripts/prep_full.py 生成。",
        "// 歌词时间码来自 src/lyricTiming.ts（人工文本 + 音频对齐，逐行择优）。",
        "",
        "export type Beat = {sec: number; frame: number; strength: number; down: boolean};",
        "export type Chapter = {id: string; from: number; to: number;",
        "  title: string; mode: string};",
        "",
        f"export const FPS = {FPS};",
        f"export const SONG_DURATION = {dur};",
        f"export const SONG_FRAMES = {int(round(dur * FPS))};",
        "",
        "export const BEATS: Beat[] = [",
    ]
    L += [
        f"  {{sec: {b['sec']}, frame: {b['frame']}, strength: {b['strength']},"
        f" down: {'true' if b['down'] else 'false'}}},"
        for b in beats
    ]
    L += ["];", "", "export const CHAPTERS: Chapter[] = ["]
    for cid, a, b, title, mode in CHAPTERS:
        L.append(
            f"  {{id: '{cid}', from: {int(round(a*FPS))}, to: {int(round(b*FPS))},"
            f" title: '{title}', mode: '{mode}'}},"
        )
    L += ["];", ""]
    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"数据 → {OUT.name}   共 {int(round(dur*FPS))} 帧")

    print("\n章节：")
    for cid, a, b, title, mode in CHAPTERS:
        n = sum(1 for x in lyrics if a <= x["sec"] < b)
        print(f"  {cid:8s} {a:7.2f} – {b:7.2f}  {b-a:6.1f}s  {title:5s} [{mode}]  {n} 句")


if __name__ == "__main__":
    sys.exit(main())
