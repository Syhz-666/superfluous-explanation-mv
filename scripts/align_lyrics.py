# -*- coding: utf-8 -*-
"""
强制对齐：把**已知歌词**和 **Whisper 从音频算出的词级时间码**拼起来。

两边各取所长：
  · 文本 —— 用 assets/lyrics.lrc 的（人工校对过，没有错字）
  · 时间 —— 用 faster-whisper 在**分离后的人声轨**上算出来的

做法是**全局 DP 比对**（Needleman-Wunsch），整首歌一次性求最优路径。

为什么不用之前的时间窗局部比对：
  副歌「她只是我的妹妹 我在担心你是否误会」出现四次，局部比对会让后面的
  匹配到前面那一遍 —— 实测差过 8 秒。全局比对按顺序推进，不会串。
  歌词本身也因为重复段落太长（约 60% 是重复的）而无法靠"对齐窗口随行号
  前移"解决 —— 窗口一窄，遇到 Whisper 漏字就崩。

输出: src/lyricTiming.ts
"""
import difflib
import json
import re
import sys
from pathlib import Path

import numpy as np

ROOT = Path(r"D:\AAA-MyProfile\小短片")
LRC = ROOT / "assets" / "lyrics.lrc"
WORDS = ROOT / "analysis" / "words.json"
OUT = ROOT / "src" / "lyricTiming.ts"
FPS = 30

T2S = str.maketrans("誤準備麼樣這裡說對時間還點與為無", "误准备么样这里说对时间还点与为无")


def norm(s: str) -> str:
    return re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", s.translate(T2S)).lower()


def parse_lrc(path: Path):
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = re.match(r"\[(\d+):(\d+\.\d+)\](.*)", line)
        if m and m.group(3).strip():
            out.append((int(m.group(1)) * 60 + float(m.group(2)), m.group(3).strip()))
    return sorted(out)


def dp_align(a: str, b: str, match=2.0, mism=-1.0, gap=-1.6):
    """全局比对，返回 a 中每个下标对应到 b 的下标（未对齐的缺席）"""
    n, m = len(a), len(b)
    NEG = -1e9
    M = np.full((n + 1, m + 1), NEG, dtype=np.float32)
    T = np.zeros((n + 1, m + 1), dtype=np.int8)
    M[:, 0] = np.arange(n + 1) * gap
    M[0, :] = np.arange(m + 1) * gap
    for i in range(1, n + 1):
        ai = a[i - 1]
        for j in range(1, m + 1):
            d = M[i - 1, j - 1] + (match if ai == b[j - 1] else mism)
            u = M[i - 1, j] + gap
            l = M[i, j - 1] + gap
            best, t = (d, 0)
            if u > best:
                best, t = u, 1
            if l > best:
                best, t = l, 2
            M[i, j] = best
            T[i, j] = t
    amap, i, j = {}, n, m
    while i > 0 or j > 0:
        t = T[i, j]
        if i > 0 and j > 0 and t == 0:
            amap[i - 1] = j - 1
            i -= 1
            j -= 1
        elif i > 0 and (j == 0 or t == 1):
            i -= 1
        else:
            j -= 1
    return amap, float(M[n, m])


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    lyrics = [(t, s, norm(s)) for t, s in parse_lrc(LRC)]
    lyrics = [(t, s, k) for t, s, k in lyrics if k]
    data = json.loads(WORDS.read_text(encoding="utf-8"))
    words = data["words"]

    # Whisper 词序列 → 单字 + 时间
    bchars, btimes = [], []
    for w in words:
        for ch in norm(w["text"]):
            bchars.append(ch)
            btimes.append(w["start"])
    btext = "".join(bchars)

    # 已知歌词 → 一整条序列，并记下每行首字的下标
    achars, line_start = [], []
    for _, _, k in lyrics:
        line_start.append(len(achars))
        achars.extend(k)
    atext = "".join(achars)
    print(f"歌词 {len(lyrics)} 行 / {len(atext)} 字    Whisper {len(btext)} 字")

    amap, score = dp_align(atext, btext)
    matched = len(amap)
    print(f"全局比对完成  得分 {score:.0f}   对齐上 {matched}/{len(atext)} 字 "
          f"({matched*100//len(atext)}%)")

    # ── 每行取出「音频算出的时间」和「对齐覆盖率」，作为验证 ──
    #
    # 注意：最终**不采用**这个时间，只用它来交叉验证 LRC。
    # 实测两者与真实人声起音点的贴合度完全等价（严格起音判定：21 vs 20 行），
    # 但两者系统性相差约 0.9 秒。混着用会让相邻两句忽早忽晚 ——
    # 上一版"没对齐"就是这么来的。统一用 LRC，保证一致性。
    report = []
    for i, (t0, text, key) in enumerate(lyrics):
        s0 = line_start[i]
        wi = None
        for k in range(s0, min(s0 + 8, len(atext))):
            if k in amap:
                wi = amap[k]
                break
        end = line_start[i + 1] if i + 1 < len(line_start) else len(atext)
        cov = sum(1 for k in range(s0, end) if k in amap) / max(1, end - s0)
        wt = round(btimes[wi], 3) if wi is not None else None
        report.append((t0, wt, cov, text))

    print(f"\n{'行':<3}{'LRC':>9}{'音频算':>9}{'差':>7}{'覆盖':>7}  歌词")
    for i, (t0, wt, cov, text) in enumerate(report):
        d = (wt - t0) if wt is not None else 0
        flag = " <<<" if abs(d) > 1.5 else ""
        wtxt = f"{wt:9.3f}" if wt is not None else "     —   "
        print(f"{i+1:<3}{t0:9.3f}{wtxt}{d:+7.2f}{cov:7.2f}  {text[:22]}{flag}")

    # 差异统计 —— 用来判断 LRC 有没有整体偏移
    diffs = [wt - t0 for t0, wt, _, _ in report if wt is not None and t0 > 15]
    if diffs:
        print(f"\n差值中位 {np.median(diffs):+.2f}s   "
              f"范围 {min(diffs):+.2f} ~ {max(diffs):+.2f}s")
        print("（两者等价，差值只是两套同步习惯的系统性偏差，不代表谁对谁错）")

    fixed = [{"sec": t0, "text": text, "conf": round(cov, 2), "lrc": t0}
             for t0, _, cov, text in report]

    # ── 逐字时间码 ──
    #
    # DP 比对已经把歌词的每个字映射到了 Whisper 的某个字，而那每个字都有时间，
    # 所以逐字时间码是现成的 —— 不用再猜"这一句平均分给几个字"。
    # 没对齐上的字（约 6%）用左右邻居线性插值补。
    char_times = []
    for i, (t0, text, key) in enumerate(lyrics):
        s0 = line_start[i]
        end_i = line_start[i + 1] if i + 1 < len(line_start) else len(atext)
        ts = [btimes[amap[k]] if k in amap else None for k in range(s0, end_i)]
        # 插值填补空缺
        known = [j for j, v in enumerate(ts) if v is not None]
        if not known:
            ts = [t0] * len(ts)
        else:
            for j in range(len(ts)):
                if ts[j] is not None:
                    continue
                left = max((k for k in known if k < j), default=None)
                right = min((k for k in known if k > j), default=None)
                if left is None:
                    ts[j] = ts[right]
                elif right is None:
                    ts[j] = ts[left]
                else:
                    w = (j - left) / (right - left)
                    ts[j] = ts[left] + (ts[right] - ts[left]) * w
        # 单调化：同一个字的时间不能比前一个字早
        for j in range(1, len(ts)):
            if ts[j] < ts[j - 1]:
                ts[j] = ts[j - 1]
        # **重新锚定**到本行的 LRC 时间。
        # 逐字之间的相对节奏取音频（whisper 算的，准），
        # 但整行的起点用 LRC —— 两者系统性差 0.87 秒，
        # 不重锚的话"整行出现"和"第一个字亮起"会对不上。
        if ts:
            base = ts[0]
            ts = [t0 + (t - base) for t in ts]
        char_times.append(ts)

    # ── 出 TS ──
    sung = [
        (f, char_times[i])
        for i, f in enumerate(fixed)
        if f["sec"] >= 15 and " : " not in f["text"]
    ]
    L = [
        "// 由 scripts/align_lyrics.py 生成。",
        "// 文本取自 assets/lyrics.lrc（人工校对）；时间由 faster-whisper 在",
        "// demucs 分离出的纯人声轨上计算，再与歌词做全局 DP 比对得出。",
        "// chars 是**逐字时间码**（相对全曲的秒数），用于逐字点亮。",
        "",
        "export type LyricChar = {ch: string; sec: number};",
        "export type LyricLine = {text: string; sec: number;",
        "  frame: number; endFrame: number; conf: number; chars: LyricChar[]};",
        "",
        "export const LYRICS: LyricLine[] = [",
    ]
    for i, (f, cts) in enumerate(sung):
        nxt = sung[i + 1][0]["sec"] if i + 1 < len(sung) else data["duration"]
        end = min(nxt, f["sec"] + 4.2)
        chars = ", ".join(
            f"{{ch: '{c}', sec: {round(t, 3)}}}"
            for c, t in zip(f["text"], cts)
            if c.strip()
        )
        L.append(
            f"  {{text: '{f['text']}', sec: {f['sec']},"
            f" frame: {int(round(f['sec']*FPS))},"
            f" endFrame: {int(round(end*FPS))}, conf: {f['conf']},"
            f" chars: [{chars}]}},"
        )
    L += ["];", ""]
    OUT.write_text("\n".join(L), encoding="utf-8")
    print(f"\n→ {OUT}   共 {len(sung)} 句歌词，含逐字时间码")

    # 抽查一句看看逐字时间是否合理
    if sung:
        demo = sung[5][0]
        dts = sung[5][1]
        print(f"\n抽查「{demo['text']}」的逐字时间：")
        print("  " + "  ".join(f"{c}:{t:.2f}" for c, t in zip(demo["text"], dts) if c.strip()))


if __name__ == "__main__":
    sys.exit(main())
