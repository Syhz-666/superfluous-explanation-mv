# -*- coding: utf-8 -*-
"""
用 faster-whisper 算词级时间码。

为什么换掉 transformers 版：
  transformers 的 chunk_length_s 分块转写，时间码是按块给的 ——
  实测有一块跨了 140 秒，等于没有时间码。
  faster-whisper 用 DTW 对齐交叉注意力，词级精度高得多。

为什么开 VAD：
  前奏 17 秒和结尾 30 多秒是纯器乐。不开 VAD 时 Whisper 会在这两段
  疯狂幻觉 —— 实测输出过「作曲 李宗盛」×16 和「请不吝点赞 订阅 转发」。

输出: analysis/words.json
"""
import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

ROOT = Path(r"D:\AAA-MyProfile\小短片")
# 用 demucs 分离出的**纯人声轨**，不是原始混音。
# 混音里鼓和伴奏会盖住弱唱 —— 实测开头两句就是这么丢的。
# 分离后前 16 秒能量 0.0003（纯器乐），17 秒起到 0.15，人声干干净净。
AUDIO = ROOT / "analysis" / "vocals.wav"
OUT = ROOT / "analysis" / "words.json"
MODEL = "large-v3-turbo"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    from faster_whisper import WhisperModel

    OUT.parent.mkdir(exist_ok=True)
    t0 = time.time()
    try:
        model = WhisperModel(MODEL, device="cuda", compute_type="float16")
        print(f"模型 {MODEL} 载入 GPU  {time.time()-t0:.0f}s")
    except Exception as e:
        print(f"GPU 失败（{e}），退回 CPU")
        model = WhisperModel(MODEL, device="cpu", compute_type="int8")

    print("转写中…")
    t1 = time.time()
    # VAD 开关。实测两种模式各有代价：
    #   开  → 开头两句弱唱被当静音切掉（转写从 23s 才开始，而人声 17.1s 就进了）
    #   关  → 前奏和尾奏会产生幻觉，但那两段在歌词区间之外，过滤掉即可
    # 主歌需要开头的准确性，所以默认关掉 VAD。
    use_vad = os.environ.get("WHISPER_VAD", "0") == "1"
    print(f"VAD: {'开' if use_vad else '关'}")

    segments, info = model.transcribe(
        str(AUDIO),
        language="zh",
        task="transcribe",
        word_timestamps=True,
        vad_filter=use_vad,
        condition_on_previous_text=False,      # 防止幻觉在段间传染
        beam_size=5,
    )
    print(f"语言 {info.language}  时长 {info.duration:.1f}s  转写耗时 {time.time()-t1:.0f}s")

    segs, words = [], []
    for s in segments:
        segs.append({"start": round(s.start, 3), "end": round(s.end, 3),
                     "text": s.text.strip()})
        for w in (s.words or []):
            words.append({"text": w.word.strip(),
                          "start": round(w.start, 3), "end": round(w.end, 3)})
    print(f"得到 {len(segs)} 段 / {len(words)} 个词")

    OUT.write_text(
        json.dumps({"language": info.language, "duration": info.duration,
                    "segments": segs, "words": words},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"→ {OUT}\n")

    print("前 20 段（带时间码）：")
    for s in segs[:20]:
        print(f"  {s['start']:7.2f} – {s['end']:7.2f}  {s['text'][:34]}")

    durs = [w["end"] - w["start"] for w in words] or [0]
    print(f"\n词块时长: 中位 {sorted(durs)[len(durs)//2]:.2f}s  最大 {max(durs):.2f}s")


if __name__ == "__main__":
    sys.exit(main())
