# 《多余的解释》MV · 纯代码渲染

用 **Remotion + React + 程序化图形** 做的整曲 MV。不依赖任何视频剪辑软件，
每一帧都是代码算出来的。

> **想看成品？自己渲染。** 成片 157MB，不适合进版本库。
> 见下方[怎么渲染](#怎么渲染)。

---

## 它长什么样

九章结构，对着一首 4 分 37 秒的歌：

| 章 | 时间 | 内容 |
|---|---|---|
| 前奏 | 0 – 17.3 | 冬夜城市，她背对出现 |
| 主歌一 | 17.3 – 64.6 | 问题 → 猜测 → 努力 → 橱窗 → 妹妹 → 转角 |
| 副歌一 | 64.6 – 100.9 | 「她只是我的妹妹」——妹妹就站在旁边 |
| 主歌二 | 100.9 – 131.1 | 重蹈覆辙，复用主歌一的机位 |
| 副歌二 | 131.1 – 166.8 | 环绕横移，两人越站越近 |
| 桥段 | 166.8 – 182.3 | **全片唯一暖色**：递围巾没人接 |
| 副歌三 | 182.3 – 211.7 | 围巾落地，颜色褪掉 |
| 副歌四 | 211.7 – 241.4 | 她越走越远，单镜头内连续拉远 |
| 尾奏 | 241.4 – 277.0 | 城市空镜，灯一盏盏灭 |

设计文档在 [`docs/`](docs/)：
- [`TREATMENT.md`](docs/TREATMENT.md) —— 概念、风格圣经、调色板、禁用清单、母题
- [`STORYBOARD.md`](docs/STORYBOARD.md) —— 逐镜头分镜表

---

## 怎么渲染

### 先准备音频

**歌曲不在仓库里** —— 它是有版权的商业录音，进仓库等于再分发。
请自备音频文件，放到：

```
assets/许嵩 - 多余的解释.wav
```

（文件名要和脚本里的一致。想换歌就改 `scripts/prep_full.py` 顶部的 `SONG` 常量。）

只要渲染的话，其实放一个 `public/song.mp3` 就够了 —— 那是 Remotion 实际读的文件。
`assets/*.wav` 只有跑数据管线（重新算时间码）时才需要。

### 渲染

需要 **Node 18+**、**ffmpeg**（Remotion 也自带一份）。

```bash
npm install
npx remotion render FullMV out/full-mv.mp4 --concurrency=12
```

约 10 分钟出片（1920×1080 / 30fps / 277 秒，含 3 子帧运动模糊）。

关掉运动模糊能快一倍：把 `src/mv/FullMV.tsx` 里的 `SUB_FRAMES` 改成 `1`。

预览（可拖时间轴、逐帧看）：

```bash
npx remotion studio
```

---

## 目录结构

```
assets/            原始素材（人工提供，不重新生成）
  song.wav         原始音频
  reference.jpg    角色参考图
  reference-sheet.png  三视图（正面/背面/侧面）
  lyrics.lrc       歌词，带时间戳
  poses/           十个姿势图（走路四帧、举手机、微笑…）
  pixel/           像素风变体（本项目未使用）

public/            Remotion 渲染时读的素材（由 scripts/ 从 assets/ 加工而来）
  song.mp3         压缩后的音轨
  poses/           归一化后的姿势图
  char-*.png       从三视图切出的三个视角

src/
  Root.tsx         合成注册
  WhaleGirl.tsx    角色组件 + 姿势注册表
  lyricTiming.ts   歌词逐字时间码（生成的，见下）
  songData.ts      拍点 + 章节（生成的）
  mv/
    FullMV.tsx     主合成
    chapters.ts    分镜数据（一章一段配置）
    City.tsx       程序化冬夜城市
    Snow.tsx       雪
    Elements.tsx   橱窗 / 剪影 / 脚印 / 第二个人
    LyricText.tsx  逐字点亮的歌词层

scripts/           数据管线（见下）
docs/              设计文档
out/               渲染产物（gitignore）
analysis/          分析中间产物和模型缓存（gitignore）
```

---

## 数据管线

从「一首歌 + 一份歌词」到「逐字时间码」，全部脚本化：

```
assets/song.wav
      │
      ├─ scripts/separate_vocals.py    demucs 分离出纯人声轨
      │                                必须做：混音里鼓和伴奏会盖住弱唱
      │
      ├─ scripts/whisper_align.py      faster-whisper 在人声轨上算词级时间码
      │                                用 VAD 会切掉开头，所以关掉
      │
      └─ scripts/align_lyrics.py       歌词文本（人工校对）与音频时间做
                                       全局 DP 比对 → 逐字时间码
                                       → src/lyricTiming.ts
```

素材加工的脚本：

```
scripts/prep_poses.py   姿势图统一身高、对齐脚底基线、抠背景 → public/poses/
scripts/prep_views.py   三视图切分并归一化 → public/char-*.png
scripts/prep_full.py    压缩音轨、汇总拍点和章节 → src/songData.ts
```

**为什么要做人声分离**：一开始直接在混音上识别，开头两句（17.1s、21.2s）
被整段丢掉。分离之后人声轨在前 16 秒能量是 0.0003（纯器乐），
17 秒起跳到 0.15 —— 起点清清楚楚。

---

## 两个刻意的技术选择

**时间码统一用 LRC，不用模型算的。**

Whisper 算出来的时间和 LRC 与真实人声起音点的贴合度**完全等价**
（严格起音判定：21 vs 20 行，中位偏差都是 167ms），但两者系统性相差 0.87 秒。
混着用会让相邻两句忽早忽晚 —— 早期版本"歌词没对齐"就是这么来的。
所以统一用 LRC（人工同步、天然一致），模型的输出只用来**交叉验证**。

**一切动画都是帧号的纯函数。**

没有 `useEffect`、没有 `Math.random()`。同一帧重复渲染结果完全一致 ——
这是逐帧渲染的前提，也是卡点能对上的基础。

---

## 已知限制

- **运动模糊是 3 子帧的时间超采样**，不是真快门。快速横移仍会有轻微台阶
- **歌词时间码取自网上流传的 LRC**（人工校对过），已用音频做过交叉验证，
  但仍可能有 ±0.3 秒级别的偏差
- **角色是静态姿势切换**，不是骨骼动画。走路是 4 帧循环，其余是硬切
- 渲染开销集中在 CPU（实测 GPU 占用 0%、CPU 84%），
  `city` 和 `snow` 是主要热点

---

## 授权范围

**代码 —— MIT**，见 [LICENSE](LICENSE)。随便用。

**不在 MIT 覆盖范围内的内容：**

| 内容 | 位置 | 说明 |
|---|---|---|
| **歌词** | `assets/lyrics.lrc`、`src/lyricTiming.ts` | 词曲版权归**许嵩**所有。仅为技术演示保留，请勿再分发 |
| **角色形象** | `assets/`、`public/` 下的图片 | **社区共同创作、AI 生成**，基于 DeepSeek 品牌形象。非本项目作者原创 |
| **歌曲** | 未收录（见[先准备音频](#先准备音频)） | 商业录音 |

> 这是一个**技术演示**：展示如何用代码把一首歌渲染成 MV。
> 代码可以随便拿去用、改、商用；**素材请自行处理授权**。

### 参考

同类项目的处理方式（`pdoom-video`）：

> Code is MIT; fonts retain their own licenses, and the song/lyrics files
> are excluded from the MIT coverage.
