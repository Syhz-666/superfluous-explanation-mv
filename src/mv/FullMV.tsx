import React from 'react';
import {AbsoluteFill, Audio, Freeze, staticFile, useCurrentFrame} from 'remotion';
import {BEATS, SONG_DURATION} from '../songData';
import {WhaleGirl, WALK_CYCLE, type PoseName} from '../WhaleGirl';
import {City} from './City';
import {Snow} from './Snow';
import {LyricText} from './LyricText';
import {ShopWindow, TwoSilhouettes, Companion, Footprints} from './Elements';
import {CHAPTERS, GROUND, warmAt, type ChapterCfg, type ShotCfg} from './chapters';

/**
 * 《多余的解释》全曲 MV。
 *
 * 结构见 docs/STORYBOARD.md，风格约定见 docs/TREATMENT.md。
 * 分镜写成数据配置（src/mv/chapters.ts），这里只负责按配置渲染。
 *
 * 一切动画都是帧号的纯函数 —— 无 useEffect、无 Math.random，
 * 保证逐帧渲染可复现。
 */

const W = 1920;
const FPS = 30;

/**
 * 运动模糊的子帧数。1 = 关。
 *
 * 只作用于**场景层**（城市/角色/雪），不作用于歌词 ——
 * 就像真实摄影机：运动模糊是拍出来的，字幕是后期叠上去的。
 *
 * 实测开销约 1.8 倍（不是 3 倍）：截图和编码只做一次，多出来的只是
 * 场景的重复渲染。整曲从 ~7 分钟涨到 ~10 分钟。
 *
 * 注意不能用 `process.env.X` 读 —— Remotion 的浏览器包里拿不到自定义
 * 环境变量（试过，三个值跑出来耗时一样，说明全都取了默认值）。
 */
const SUB_FRAMES = 3;

const ease = (p: number) => p * p * (3 - 2 * p);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * 时间超采样运动模糊。
 *
 * 把场景在最近 N 帧各渲染一次、叠在一起。透明度取 1/(k+1) 而不是 1/N ——
 * 在 source-over 合成下，从旧到新依次用 1, 1/2, 1/3… 叠加，
 * 结果**数学上等价于等权平均**：
 *   两层 → c₁·½ + c₀·½
 *   三层 → c₂·⅓ + (c₁·½ + c₀·½)·⅔ = c₂·⅓ + c₁·⅓ + c₀·⅓
 * 用 1/N 的话后面的帧权重会压倒前面的，糊不出均匀的拖影。
 */
const MotionBlur: React.FC<{samples: number; children: React.ReactNode}> = ({
  samples,
  children,
}) => {
  const frame = useCurrentFrame();
  if (samples <= 1) return <>{children}</>;
  return (
    <>
      {Array.from({length: samples}, (_, k) => (
        <AbsoluteFill key={k} style={{opacity: 1 / (k + 1)}}>
          <Freeze frame={Math.max(0, frame - (samples - 1 - k))}>{children}</Freeze>
        </AbsoluteFill>
      ))}
    </>
  );
};

/**
 * 拍点相位：0 = 正好落在拍上，1 = 即将到下一拍。
 *
 * 用相位而不是「冲击 + 指数衰减」—— 后者每拍硬跳一次再迅速收回，
 * 在 83 BPM 下就是每秒 1.4 次痉挛，看着像抽搐。
 */
const beatPhaseAt = (frame: number) => {
  let prev: (typeof BEATS)[number] | null = null;
  let next: (typeof BEATS)[number] | null = null;
  for (const b of BEATS) {
    if (b.frame <= frame) prev = b;
    else {
      next = b;
      break;
    }
  }
  if (!prev) return {phase: 0, strength: 0.5, down: false};
  const span = next ? Math.max(1, next.frame - prev.frame) : 22;
  return {
    phase: clamp01((frame - prev.frame) / span),
    strength: prev.strength,
    down: prev.down,
  };
};

/**
 * 律动。三层叠加，全部连续可导，没有任何跳变：
 *   1. 升余弦脉冲 —— 拍点上为 1、两拍中间为 0，峰正好落在拍上
 *   2. 慢速呼吸 —— 和拍点频率错开，避免机械感
 *   3. 重心微摆 —— 极缓慢的左右倾，像站着的人不会完全静止
 */
const grooveAt = (frame: number, sec: number) => {
  const {phase, strength} = beatPhaseAt(frame);
  const pulse = 0.5 * (1 + Math.cos(phase * Math.PI * 2)); // 1 → 0 → 1，处处平滑
  const breath = 0.5 + 0.5 * Math.sin(sec * 1.15);
  const sway = Math.sin(sec * 0.62);
  return {
    pulse,
    groove: pulse * (0.35 + 0.65 * strength),
    breath,
    sway,
  };
};

/** 定位当前镜头 */
const shotAt = (sec: number): {ch: ChapterCfg; shot: ShotCfg; p: number} => {
  for (let i = CHAPTERS.length - 1; i >= 0; i--) {
    const ch = CHAPTERS[i];
    if (sec >= ch.a) {
      let cur = ch.shots[0];
      for (const s of ch.shots) if (sec >= s.a) cur = s;
      const p = clamp01((sec - cur.a) / Math.max(0.001, cur.b - cur.a));
      return {ch, shot: cur, p};
    }
  }
  const ch = CHAPTERS[0];
  return {ch, shot: ch.shots[0], p: 0};
};

/** 镜头运动 */
const cameraAt = (move: string, p: number) => {
  const e = ease(p);
  switch (move) {
    case 'push-in':
      return {s: 0.93 + 0.22 * e, x: 0, y: 0};
    case 'push-out':
      return {s: 1.15 - 0.2 * e, x: 0, y: 0};
    case 'pan-right':
      return {s: 1.08, x: -72 + 144 * e, y: 0};
    case 'pan-left':
      return {s: 1.08, x: 72 - 144 * e, y: 0};
    case 'tilt-up':
      return {s: 1.06, x: 0, y: 46 - 92 * e};
    case 'dolly':
      return {s: 1.04, x: -96 + 192 * e, y: 0};
    case 'orbit':
      // 绕着一个不肯走的人转圈：横向来回 + 轻微缩放呼吸
      return {s: 1.06 + 0.05 * Math.sin(e * Math.PI * 2), x: Math.sin(e * Math.PI * 2) * 110, y: 0};
    case 'slow-push':
      return {s: 1.0 + 0.3 * e, x: 0, y: -14 * e};
    // 单镜头内连续拉远。之前"渐远"是靠拼接几个不同大小的镜头做的，
    // 看着是跳的 —— 用户指出应该每镜之内就在往后退。
    case 'slow-pull':
      return {s: 1.34 - 0.36 * e, x: 0, y: 8 * e};
    case 'hold':
      return {s: 1.32, x: 0, y: -14};
    case 'track':
      return {s: 1.0, x: 0, y: 0};
    default:
      return {s: 1.05, x: 0, y: 0};
  }
};

/** 角色的水平位置：走路镜头要真的横穿画面 */
const charXAt = (shot: ShotCfg, p: number): number => {
  if (shot.x !== 'walk') return shot.x;
  if (shot.label === '转角') return 420 + 520 * ease(Math.min(1, p / 0.46));
  return 262 + 1300 * ease(p);
};

/** 调色模式对画面的影响 */
const modeStyle = (mode: string) => {
  switch (mode) {
    case 'warm':
      return {vignette: 0.3, desat: 0, snow: 0.7};
    case 'fading':
      return {vignette: 0.5, desat: 0.25, snow: 0.8};
    case 'pure-cold':
      return {vignette: 0.66, desat: 0.45, snow: 1};
    case 'dark':
      return {vignette: 0.82, desat: 0.3, snow: 0.4};
    default:
      return {vignette: 0.42, desat: 0, snow: 1};
  }
};

export const FullMV: React.FC = () => {
  const frame = useCurrentFrame();
  const sec = frame / FPS;
  const {ch, shot, p} = shotAt(sec);
  const cam = cameraAt(shot.cam, p);
  const g = grooveAt(frame, sec);
  const ms = modeStyle(ch.mode);

  const warm = warmAt(sec);
  // 镜头也用呼吸但频率不同 —— 角色和镜头同步起伏会显得机械
  const camBreath = 1 + g.breath * 0.009;

  // 转身：Ch.1 第 3 镜里正面转背面
  const turning = shot.label === '转身' ? clamp01((p - 0.45) / 0.28) : 0;
  const basePose: PoseName = turning > 0.5 ? 'back' : (shot.pose as PoseName);

  // 走路四帧循环
  const walking = shot.pose === 'walk';
  const pose: PoseName = walking
    ? WALK_CYCLE[Math.floor((sec - shot.a) / 0.233) % WALK_CYCLE.length]
    : basePose;

  const cx = charXAt(shot, p);
  const splitting = shot.elem === 'split';
  // 主歌一结尾（模糊、淡淡的）→ 桥段（清晰、坐实）—— 两次出现要有层次差
  const silhouettesOn =
    shot.elem === 'silhouettes'
      ? clamp01((p - (shot.label === '转角' ? 0.32 : 0.15)) / 0.2)
      : 0;
  const windowOn = shot.elem === 'window' ? clamp01(p / 0.22) : 0;

  // 桥段：剪影在这一章才清晰；副歌三里走掉
  const inBridge = ch.id === 'bridge';
  const clarity = inBridge ? 1 : 0.35;
  const silShift = shot.label === '剪影走掉' ? 260 * clamp01(p / 0.8) : 0;

  const showChar = shot.h > 0 && !splitting;

  return (
    <AbsoluteFill style={{background: '#05091C'}}>
      <Audio src={staticFile('song.mp3')} />

      {/* ── 场景层（跟随镜头）+ 时间超采样运动模糊 ── */}
      <MotionBlur samples={SUB_FRAMES}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s * camBreath})`,
          transformOrigin: '50% 46%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -220,
            background: `radial-gradient(ellipse 62% 48% at 50% 38%,
              #1E2C63 0%, #111A3E 42%, #070C22 78%, #04060F 100%)`,
          }}
        />
        <City
          prominence={shot.city ?? 0.5}
          groundY={GROUND}
          lightsOut={shot.lightsOut}
          parallax={cam.x * -0.25}
        />
        {/* 围巾一直在橱窗里 —— 这两句歌词都是「想给你买一条围巾」，
            她正想去买，橱窗当然是满的。
            （之前主歌二里我把它做成空的，说是"已经被买走"，逻辑反了） */}
        <ShopWindow
          opacity={windowOn}
          hasScarf
          left={ch.id === 'bridge' ? 620 : 232}
          top={ch.id === 'bridge' ? 180 : 232}
        />

        {/* 第二个人。「你」是暗剪影，「妹妹」是缩小版鲸鱼娘 */}
        {showChar && shot.companion && !splitting && (
          <Companion
            kind={shot.companion.kind}
            pose={
              walking
                ? WALK_CYCLE[Math.floor((sec - shot.a) / 0.233) % WALK_CYCLE.length]
                : (shot.companion.pose ?? 'front')
            }
            height={shot.h * shot.companion.ratio}
            centerX={cx + shot.companion.dx + (shot.companion.approach ?? 0) * p}
            feetY={GROUND}
            flip={shot.companion.flip}
            clarity={shot.companion.clarity}
            opacity={shot.companion.opacity ?? 1}
            offsetY={-g.groove * 6}
          />
        )}

        {shot.elem === 'footprints' && (
          <Footprints opacity={1} groundY={GROUND} centerX={cx} />
        )}

        {/* 角色 */}
        {showChar && (
          <>
            <WhaleGirl
              pose={pose}
              figureHeight={shot.h}
              feetY={GROUND}
              centerX={cx}
              /* 律动走缩放和微旋，不走位移 —— 位移一快就像抽搐 */
              offsetY={-g.groove * 7}
              scaleY={1 + g.groove * 0.02 + g.breath * 0.007}
              scaleX={1 - g.groove * 0.011}
              rotate={g.sway * 0.7}
            />
            <div
              style={{
                position: 'absolute',
                left: cx - shot.h * 0.16,
                top: GROUND - 14,
                width: shot.h * 0.32,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.42)',
                filter: 'blur(10px)',
                transform: `scale(${1 + g.groove * 0.07}, ${1 - g.groove * 0.05})`,
                transformOrigin: 'center',
              }}
            />
          </>
        )}

        {/* 分屏：右边空着 —— "妹妹"的缺席 */}
        {splitting && (
          <>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: W / 2,
                overflow: 'hidden',
              }}
            >
              <WhaleGirl pose="smile" figureHeight={shot.h} feetY={GROUND} centerX={470} />
            </div>
            {/* 右半边：妹妹。之前是纯空白，用户指出不该完全没人 */}
            <div
              style={{
                position: 'absolute',
                left: W / 2,
                top: 0,
                bottom: 0,
                width: W / 2,
                overflow: 'hidden',
              }}
            >
              {/* 容器从画面中线开始，所以这里的坐标是**相对右半屏**的，
                  传 W/2+480 会把她推出容器右边缘（overflow:hidden 裁掉） */}
              <Companion
                kind="sister"
                pose="smile"
                height={shot.h * 0.72}
                centerX={470}
                feetY={GROUND}
                offsetY={-g.groove * 5}
              />
            </div>
            <div
              style={{
                position: 'absolute',
                left: W / 2 - 1,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'rgba(143,168,255,0.5)',
                boxShadow: '0 0 22px rgba(143,168,255,0.45)',
              }}
            />
          </>
        )}

        <TwoSilhouettes
          opacity={silhouettesOn * (inBridge ? 0.95 : 0.8)}
          clarity={clarity}
          shiftX={silShift}
          left={ch.id === 'bridge' ? 1180 : 1145}
        />
        <Snow opacity={ms.snow} speedFactor={ch.mode === 'dark' ? 0.45 : 1} />
      </div>
      </MotionBlur>

      {/* ── 覆盖层 ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 58% 52% at 50% 46%,
            transparent 40%, rgba(4,7,18,${ms.vignette}) 100%)`,
        }}
      />
      {/* 暖色染色：全片唯一的暖，只在桥段达到峰值 */}
      {warm > 0 && (
        <>
          {/* 局部暖光晕 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 46% 54% at ${
                ch.id === 'bridge' ? 50 : 30
              }% 44%, rgba(255,184,116,${0.4 * warm}) 0%, transparent 72%)`,
              mixBlendMode: 'screen',
            }}
          />
          {/* 整幅暖色调 —— 桥段要一眼看出"这是全片最暖的一刻" */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(255,168,92,1) 0%, rgba(255,140,90,1) 100%)',
              opacity: 0.17 * warm,
              mixBlendMode: 'soft-light',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,150,80,1)',
              opacity: 0.07 * warm,
              mixBlendMode: 'screen',
            }}
          />
        </>
      )}
      {/* 降饱和：副歌三之后冷到失去颜色 */}
      {ms.desat > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(30,42,80,1)',
            opacity: ms.desat * 0.35,
            mixBlendMode: 'saturation',
          }}
        />
      )}

      <LyricText />

      {/* 调试信息，成片删除 */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 34,
          color: 'rgba(143,168,255,0.26)',
          fontFamily: 'monospace',
          fontSize: 19,
        }}
      >
        {ch.title} · {shot.label ?? shot.pose} · {shot.cam} · {sec.toFixed(1)}s /{' '}
        {SONG_DURATION.toFixed(0)}s
      </div>
    </AbsoluteFill>
  );
};
