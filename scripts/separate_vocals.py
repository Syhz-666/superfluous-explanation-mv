# -*- coding: utf-8 -*-
"""
人声分离。pdoom-video 流水线的第一步，我之前跳过了 —— 这是对齐失败的根因。

为什么必须先做：Whisper 是在**全混音**上识别的，鼓点和伴奏会盖住较弱的人声。
实测开头两句（17.1s、21.2s）就是这么丢的。先把人声单独抠出来再识别，
信噪比完全不同。

用 demucs 的 htdemucs 模型，只分两轨（人声 / 伴奏）就够了。

输出: analysis/vocals.wav
"""
import os
import sys
import time
from pathlib import Path

ROOT = Path(r"D:\AAA-MyProfile\小短片")
SRC = ROOT / "assets" / "许嵩 - 多余的解释.wav"
OUTDIR = ROOT / "analysis" / "stems"
MODEL = "htdemucs"

# demucs 靠 ffmpeg 读音频，而 Python 进程的 PATH 里没有它
os.environ["PATH"] = (
    r"C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-9.0.2-full_build\bin"
) + os.pathsep + os.environ.get("PATH", "")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    import torch
    from demucs.apply import apply_model
    from demucs.audio import AudioFile, save_audio
    from demucs.pretrained import get_model

    OUTDIR.mkdir(parents=True, exist_ok=True)
    t0 = time.time()

    print(f"载入 {MODEL}…")
    model = get_model(MODEL)
    model.eval()
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"设备 {dev}  模型载入 {time.time()-t0:.0f}s")

    print("读音频…")
    wav = AudioFile(SRC).read(
        streams=0, samplerate=model.samplerate, channels=model.audio_channels
    )
    ref = wav.mean(0)
    wav = (wav - ref.mean()) / (ref.std() + 1e-8)

    print("分离中（可能要一两分钟）…")
    t1 = time.time()
    with torch.no_grad():
        sources = apply_model(
            model, wav[None], device=dev, shifts=1, split=True, overlap=0.25
        )[0]
    sources = sources * ref.std() + ref.mean()
    print(f"分离完成 {time.time()-t1:.0f}s")

    names = model.sources  # ['drums','bass','other','vocals']
    print(f"轨道: {names}")
    for name, src in zip(names, sources):
        p = OUTDIR / f"{name}.wav"
        save_audio(src, p, model.samplerate)
        print(f"  {name:8s} → {p.name}  ({p.stat().st_size//1024} KB)")

    # 把 vocals 提到 analysis/ 根下，方便后续脚本引用
    import shutil

    final = ROOT / "analysis" / "vocals.wav"
    shutil.copy(OUTDIR / "vocals.wav", final)
    print(f"\n人声轨 → {final}")


if __name__ == "__main__":
    sys.exit(main())
