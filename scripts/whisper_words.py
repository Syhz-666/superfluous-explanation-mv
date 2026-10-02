# -*- coding: utf-8 -*-
"""
用 Whisper 从音频里算出**词级时间码**。

参考 pdoom-video 的思路：不依赖网上流传的 LRC（版本混乱、偏移未知），
而是直接从音频自己算。他们做的是 CTC 强制对齐 + Whisper 交叉验证，
这里先跑第一步：Whisper 词级转写。

为什么要词级而不是行级：行级只能整句高亮，词级才能做卡拉OK式的逐字点亮，
而且**时间码错没错一眼就能看出来**（哪个字提前了很明显）。

输出: analysis/whisper_words.json
"""
import json
import os
import sys
import time
from pathlib import Path

# 走国内镜像，直连 huggingface.co 只有 11 KB/s
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

ROOT = Path(r"D:\AAA-MyProfile\小短片")
AUDIO = ROOT / "assets" / "许嵩 - 多余的解释.wav"
OUT = ROOT / "analysis" / "whisper_words.json"
MODEL = "openai/whisper-large-v3-turbo"

import librosa
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

# transformers 的音频管线默认调 ffmpeg 读文件，但 Python 进程的 PATH 里没有它。
# 直接用 librosa 读成数组传进去，绕开这个依赖。
FFMPEG_BIN = (
    r"C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.2-full_build\bin"
)
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
# 6GB 显存容易碎片化，开这个能把零散块拼起来用
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

SR = 16000  # Whisper 固定要 16k


def main():
    OUT.parent.mkdir(exist_ok=True)
    print(f"模型 {MODEL}（镜像 {os.environ['HF_ENDPOINT']}）")
    t0 = time.time()

    print("读音频…")
    audio, _ = librosa.load(str(AUDIO), sr=SR, mono=True)
    print(f"  {len(audio)/SR:.2f}s @ {SR}Hz")

    processor = AutoProcessor.from_pretrained(MODEL)
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        MODEL, torch_dtype=torch.float16, low_cpu_mem_usage=True
    ).to("cuda")
    print(f"模型加载完成 {time.time()-t0:.0f}s")

    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        torch_dtype=torch.float16,
        device=0,
        chunk_length_s=30,
        # 6GB 显存扛不住批量：8 路并行直接把显存打爆，一次一块就够
        batch_size=1,
        return_timestamps="word",   # 关键：要词级时间
    )

    print("开始转写…")
    t1 = time.time()
    result = pipe(
        {"array": audio, "sampling_rate": SR},
        generate_kwargs={"language": "zh", "task": "transcribe"},
    )
    print(f"转写完成 {time.time()-t1:.0f}s")

    chunks = result.get("chunks", [])
    print(f"得到 {len(chunks)} 个词块")
    words = [
        {"text": c["text"], "start": c["timestamp"][0], "end": c["timestamp"][1]}
        for c in chunks
        if c.get("timestamp") and c["timestamp"][0] is not None
    ]
    OUT.write_text(
        json.dumps({"text": result["text"], "words": words},
                   ensure_ascii=False, indent=1),
        encoding="utf-8",
    )
    print(f"→ {OUT}")
    print("\n前 40 个词：")
    for w in words[:40]:
        print(f"  {w['start']:7.2f} – {w['end']:7.2f}  {w['text']}")


if __name__ == "__main__":
    sys.exit(main())
