# -*- coding: utf-8 -*-
"""
准备第一段主歌 MV 的数据。

**歌词时间码直接解析 assets/lyrics.lrc**，不再手抄 —— 手抄过一次，错了。
LRC 保持原样（含开头四行歌曲信息），由这里过滤。

范围：0 → 64.589 秒
  0 – 17.100      前奏（人声未进）
  17.100 – 64.589 第一段主歌，共 12 句
  64.589 起       副歌，不在本次范围

输出: src/mvData.ts
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SONG = ROOT / "assets" / "许嵩 - 多余的解释.wav"
LRC = ROOT / "assets" / "lyrics.lrc"
ANALYSIS = ROOT / "analysis.json"
PUBLIC = ROOT / "public"
OUT_TS = ROOT / "src" / "mvData.ts"

FFMPEG = (
    r"C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
)

START = 0.0        # 从曲首开始，前奏也是一部分
VERSE_FROM = 17.0  # 人声进来的时间（用来把开头四行歌曲信息过滤掉）
END = 64.589       # 副歌起点
FPS = 30
LINE_HOLD = 3.6    # 每句歌词显示时长

# 分镜：id、起、止、镜头运动、姿势、备注
SHOTS = [
    ("intro_far",   0.000,  8.000, "push-in",   "front",       "前奏·城市远景"),
    ("intro_push",  8.000, 17.100, "push-in",   "phoneDown",   "前奏·推近"),
    ("line1",      17.100, 21.200, "static",    "front",       "第1句"),
    ("line2",      21.200, 25.830, "push-in",   "front",       "第2句"),
    ("line3",      25.830, 29.729, "static",    "front>back",  "第3句·转身"),
    ("line4",      29.729, 34.629, "pan-right", "back",        "第4句·背面"),
    ("line5",      34.629, 38.379, "tilt-up",   "front",       "第5句·深呼吸"),
    ("line6",      38.379, 44.979, "dolly",     "phoneEar",    "第6-7句·打电话"),
    ("line8",      44.979, 48.799, "static",    "phoneEar",    "第8句·灯灭"),
    ("line9",      48.799, 53.719, "push-in",   "reach",       "第9句·橱窗"),
    ("line10",     53.719, 56.529, "track",     "walkA",       "第10句·走过橱窗"),
    ("line11",     56.529, 60.449, "static",    "smile",       "第11句·分屏"),
    ("line12",     60.449, 64.589, "slow-push", "walkB",       "第12句·转角"),
]


def parse_lrc(path: Path):
    """解析 LRC，返回 [(秒, 文本)]。歌曲信息行由调用方按时间过滤。"""
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line)
        if not m:
            continue
        t = int(m.group(1)) * 60 + float(m.group(2))
        txt = m.group(3).strip()
        if txt:
            out.append((t, txt))
    return sorted(out)


def main():
    dur = END - START

    # ── 1. 音频 ──
    out_audio = PUBLIC / "verse.wav"
    subprocess.run(
        [FFMPEG, "-v", "error", "-y", "-ss", str(START), "-t", f"{dur:.3f}",
         "-i", str(SONG), "-ac", "2", "-ar", "44100", str(out_audio)],
        check=True,
    )
    print(f"音频 → {out_audio.name}  {START}s 起 {dur:.3f}s")

    # ── 2. 歌词：直接读 LRC，滤掉开头的歌曲信息 ──
    alll = parse_lrc(LRC)
    verse = [(t, s) for t, s in alll if VERSE_FROM <= t < END]
    print(f"LRC 共 {len(alll)} 行 → 主歌区间取 {len(verse)} 句")

    # ── 3. 拍点 ──
    data = json.loads(ANALYSIS.read_text(encoding="utf-8"))
    beats = [
        {"sec": round(b["sec"] - START, 3), "frame": int(round((b["sec"] - START) * FPS)),
         "strength": b["strength"], "down": b["is_downbeat_guess"]}
        for b in data["beats"] if START <= b["sec"] < END
    ]
    print(f"拍点 {len(beats)} 个")

    # ── 4. 出 TS ──
    L = [
        "// 由 scripts/prep_mv.py 生成。歌词时间码直接来自 assets/lyrics.lrc。",
        "",
        "export type Beat = {sec: number; frame: number; strength: number; down: boolean};",
        "export type LyricLine = {text: string; sec: number; frame: number; endFrame: number};",
        "export type Shot = {id: string; from: number; to: number;"
        " move: string; pose: string; note: string};",
        "",
        f"export const MV_START = {START};",
        f"export const MV_DURATION = {round(dur, 3)};",
        f"export const MV_FPS = {FPS};",
        f"export const MV_FRAMES = {int(round(dur * FPS))};",
        f"export const VERSE_FROM = {VERSE_FROM};",
        "",
        "export const BEATS: Beat[] = [",
    ]
    L += [
        f"  {{sec: {b['sec']}, frame: {b['frame']}, strength: {b['strength']},"
        f" down: {'true' if b['down'] else 'false'}}},"
        for b in beats
    ]
    L += ["];", "", "export const LYRICS: LyricLine[] = ["]
    for i, (t, txt) in enumerate(verse):
        s = round(t - START, 3)
        nxt = (verse[i + 1][0] - START) if i + 1 < len(verse) else dur
        end = min(nxt, s + LINE_HOLD)
        L.append(
            f"  {{text: '{txt}', sec: {s}, frame: {int(round(s*FPS))},"
            f" endFrame: {int(round(end*FPS))}}},"
        )
    L += ["];", "", "export const SHOTS: Shot[] = ["]
    for sid, a, b2, mv, pose, note in SHOTS:
        L.append(
            f"  {{id: '{sid}', from: {int(round((a-START)*FPS))},"
            f" to: {int(round((b2-START)*FPS))}, move: '{mv}',"
            f" pose: '{pose}', note: '{note}'}},"
        )
    L += ["];", ""]
    OUT_TS.write_text("\n".join(L), encoding="utf-8")

    print(f"数据 → {OUT_TS.name}   总帧数 {int(round(dur*FPS))}")
    print("\n主歌歌词时间：")
    for t, s in verse:
        print(f"  {t:7.3f}s  {s}")


if __name__ == "__main__":
    sys.exit(main())
