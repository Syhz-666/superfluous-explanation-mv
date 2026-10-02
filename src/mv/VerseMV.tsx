import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {BEATS, SHOTS, type Shot} from '../mvData';
import {WhaleGirl, WALK_CYCLE, type PoseName} from '../WhaleGirl';
import {City} from './City';
import {Snow} from './Snow';
import {LyricText} from './LyricText';

/**
 * 《多余的解释》第一段主歌 MV。
 *
 * 时间范围 0 – 64.589 秒：前奏 17.1 秒 + 主歌 12 句，到副歌前收住。
 * 歌词时间码直接来自 assets/lyrics.lrc（用户提供的版本），未经改动。
 *
 * 核心处理（剧本定的）：**整个故事里只有她一个人**。
 * "你"、"妹妹"、"她身旁那位"全部缺席，只用手机屏幕、影子、剪影暗示。
 *
 * 一切动画都是帧号的纯函数 —— 无 useEffect、无 Math.random，
 * 保证逐帧渲染可复现。
 */

const W = 1920;
const GROUND = 940;

const ease = (p: number) => p * p * (3 - 2 * p);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** 某帧的拍点冲击 */
const beatPulse = (frame: number) => {
  let cur: (typeof BEATS)[number] | null = null;
  for (const b of BEATS) {
    if (b.frame <= frame) cur = b;
    else break;
  }
  if (!cur) return {amount: 0, down: false};
  const age = (frame - cur.frame) / 30;
  return {
    amount: Math.exp(-age / 0.13) * (0.35 + 0.65 * cur.strength),
    down: cur.down,
  };
};

const shotAt = (frame: number): {shot: Shot; idx: number} => {
  for (let i = SHOTS.length - 1; i >= 0; i--) {
    if (frame >= SHOTS[i].from) return {shot: SHOTS[i], idx: i};
  }
  return {shot: SHOTS[0], idx: 0};
};

/** 每个镜头的角色配置 */
const CHAR: Record<
  string,
  {pose: PoseName; h: number; feet: number; x: number}
> = {
  intro_far: {pose: 'front', h: 430, feet: GROUND, x: 960},
  intro_push: {pose: 'phoneDown', h: 640, feet: GROUND, x: 960},
  line1: {pose: 'front', h: 730, feet: GROUND, x: 960},
  line2: {pose: 'front', h: 790, feet: GROUND, x: 900},
  line3: {pose: 'front', h: 770, feet: GROUND, x: 900},
  line4: {pose: 'back', h: 770, feet: GROUND, x: 900},
  line5: {pose: 'front', h: 810, feet: GROUND, x: 960},
  line6: {pose: 'phoneEar', h: 830, feet: GROUND, x: 890},
  line8: {pose: 'phoneEar', h: 830, feet: GROUND, x: 890},
  line9: {pose: 'reach', h: 800, feet: GROUND, x: 1180},
  line10: {pose: 'walkA', h: 750, feet: GROUND, x: 1420},
  line11: {pose: 'smile', h: 710, feet: GROUND, x: 480},
  line12: {pose: 'walkB', h: 730, feet: GROUND, x: 900},
};

/** 角色的水平位置：走路镜头要真的横穿画面，不能原地踏步 */
const charXAt = (shot: Shot, base: number, p: number): number => {
  if (shot.id === 'line10') return 262 + 1300 * ease(p); // 由左向右走过橱窗
  if (shot.id === 'line12') return 420 + 520 * ease(Math.min(1, p / 0.46)); // 走到位停住
  return base;
};

const cameraAt = (shot: Shot, frame: number) => {
  const span = Math.max(1, shot.to - shot.from);
  const p = clamp01((frame - shot.from) / span);
  const e = ease(p);
  switch (shot.move) {
    case 'push-in':
      return {s: 0.93 + 0.21 * e, x: 0, y: 0};
    case 'pan-right':
      return {s: 1.08, x: -72 + 144 * e, y: 0};
    case 'tilt-up':
      return {s: 1.06, x: 0, y: 46 - 92 * e};
    case 'dolly':
      return {s: 1.04, x: -96 + 192 * e, y: 0};
    case 'track':
      return {s: 1.0, x: 0, y: 0};
    case 'slow-push':
      return {s: 1.0 + 0.3 * e, x: 0, y: -14 * e};
    default:
      return {s: 1.05, x: 0, y: 0};
  }
};

/** 城市存在感 —— 剧本定的"极简留白 + 关键处出现具体元素" */
const cityProminence = (id: string): number => {
  const m: Record<string, number> = {
    intro_far: 0.9,
    intro_push: 0.6,
    line1: 0.5,
    line2: 0.4,
    line3: 0.55,
    line4: 0.68,
    line5: 0.35,
    line6: 0.7,
    line8: 0.7,
    line9: 0.3,
    line10: 0.78,
    line11: 0.18,
    line12: 0.92,
  };
  return m[id] ?? 0.5;
};

/** 橱窗 + 紫围巾：全片唯一的暖色 */
const ShopWindow: React.FC<{opacity: number}> = ({opacity}) => (
  <div
    style={{
      position: 'absolute',
      // 放左侧：reach 姿势的手臂伸向左，放右边就成了背对着橱窗
      left: 232,
      top: 232,
      width: 570,
      height: 672,
      opacity,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: -190,
        background: `radial-gradient(ellipse at center,
          rgba(255,196,128,${0.6 * opacity}) 0%,
          rgba(255,176,104,${0.3 * opacity}) 34%,
          rgba(255,160,90,${0.1 * opacity}) 58%,
          transparent 76%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(158deg,
          rgba(255,214,164,${0.5 * opacity}) 0%,
          rgba(240,178,120,${0.34 * opacity}) 48%,
          rgba(180,146,132,${0.22 * opacity}) 100%)`,
        border: `2px solid rgba(255,214,164,${0.62 * opacity})`,
        borderRadius: 4,
        boxShadow: `0 0 60px rgba(255,186,116,${0.4 * opacity}),
                    inset 0 0 70px rgba(255,196,128,${0.28 * opacity})`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(122deg,
          transparent 34%, rgba(255,255,255,${0.12 * opacity}) 47%,
          transparent 58%)`,
        borderRadius: 4,
      }}
    />
    {/* 紫围巾 */}
    <svg
      viewBox="0 0 300 340"
      style={{position: 'absolute', left: 140, top: 170, width: 300, height: 340}}
    >
      <g opacity={opacity}>
        <ellipse
          cx="150"
          cy="76"
          rx="84"
          ry="46"
          fill="none"
          stroke="#8E6BC8"
          strokeWidth="34"
        />
        <ellipse
          cx="150"
          cy="70"
          rx="84"
          ry="42"
          fill="none"
          stroke="#A98BD8"
          strokeWidth="9"
          opacity="0.65"
        />
        <path
          d="M 104 108 C 98 156, 94 202, 88 246 C 85 268, 68 276, 57 264
             C 48 254, 53 236, 60 216 C 72 176, 84 142, 88 106 Z"
          fill="#8E6BC8"
        />
        <path
          d="M 198 106 C 203 142, 210 176, 216 204 C 222 232, 212 252, 196 250
             C 182 248, 180 230, 184 206 C 190 168, 188 136, 182 104 Z"
          fill="#77549F"
        />
        <g stroke="#B99BE0" strokeWidth="5" strokeLinecap="round" opacity="0.8">
          <path d="M 60 266 L 52 286" />
          <path d="M 70 270 L 64 290" />
          <path d="M 190 252 L 186 272" />
          <path d="M 200 250 L 198 270" />
        </g>
      </g>
    </svg>
  </div>
);

/** 转角处两个剪影 —— "你"和"她身旁那位"，永远看不清 */
const TwoSilhouettes: React.FC<{opacity: number}> = ({opacity}) => (
  <svg
    viewBox="0 0 400 620"
    style={{
      position: 'absolute',
      left: 1145,
      top: 300,
      width: 330,
      height: 512,
      opacity,
    }}
  >
    <g fill="#0A0F26">
      <ellipse cx="128" cy="86" rx="56" ry="62" />
      <path d="M 72 150 C 72 128, 184 128, 184 150 L 196 370 C 196 392, 60 392, 60 370 Z" />
      <ellipse cx="272" cy="104" rx="52" ry="58" />
      <path d="M 220 166 C 220 146, 324 146, 324 166 L 334 372 C 334 392, 210 392, 210 372 Z" />
    </g>
  </svg>
);

export const VerseMV: React.FC = () => {
  const frame = useCurrentFrame();
  const {shot, idx} = shotAt(frame);
  const cam = cameraAt(shot, frame);
  const beat = beatPulse(frame);

  const cfg = CHAR[shot.id] ?? CHAR.intro_far;
  const span = Math.max(1, shot.to - shot.from);
  const p = clamp01((frame - shot.from) / span);

  const beatZoom = 1 + beat.amount * 0.012;
  const cx = charXAt(shot, cfg.x, p);

  // 第 3 句：正面 → 背面
  const turning = shot.id === 'line3' ? clamp01((p - 0.45) / 0.28) : 0;
  const basePose: PoseName = turning > 0.5 ? 'back' : cfg.pose;

  // 走路镜头：四帧循环
  const walking = shot.id === 'line10' || shot.id === 'line12';
  const walkPose: PoseName = walking
    ? WALK_CYCLE[Math.floor((frame - shot.from) / 7) % WALK_CYCLE.length]
    : basePose;

  // 第 8 句：灯牌熄灭（镜头进行到 55% 时）
  const lightsOut = shot.id === 'line8' && p > 0.55;

  // 第 11 句：分屏，右边空着
  const splitting = shot.id === 'line11';

  // 第 12 句：两个剪影在她停步后浮现
  // 她停步后剪影浮现，留足时间让观众看清 —— 这是全段的情绪落点
  const silhouettesOn = shot.id === 'line12' ? clamp01((p - 0.5) / 0.14) : 0;

  // 橱窗：第 9 句完全出现，第 10 句（走过时）保留存在感
  const windowOn = shot.id === 'line9' ? clamp01(p / 0.22) : shot.id === 'line10' ? 0.62 : 0;

  const warm = shot.id === 'line9' ? 1 : shot.id === 'line10' ? 0.4 : 0;
  const vignette =
    shot.id === 'line12' ? 0.74 : shot.id === 'line11' ? 0.5 : 0.42;

  return (
    <AbsoluteFill style={{background: '#05091C'}}>
      <Audio src={staticFile('verse.wav')} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s * beatZoom})`,
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
          prominence={cityProminence(shot.id)}
          groundY={GROUND}
          lightsOut={lightsOut}
          parallax={cam.x * -0.25}
        />
        <ShopWindow opacity={windowOn} />

        {!splitting && (
          <>
            <WhaleGirl
              pose={walkPose}
              figureHeight={cfg.h}
              feetY={cfg.feet}
              centerX={cx}
              offsetY={-beat.amount * 6}
            />
            <div
              style={{
                position: 'absolute',
                left: cx - cfg.h * 0.16,
                top: cfg.feet - 14,
                width: cfg.h * 0.32,
                height: 26,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.42)',
                filter: 'blur(10px)',
              }}
            />
          </>
        )}

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
              <WhaleGirl
                pose="smile"
                figureHeight={cfg.h}
                feetY={cfg.feet}
                centerX={470}
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

        <TwoSilhouettes opacity={silhouettesOn * 0.92} />
        <Snow opacity={1} speedFactor={1} />
      </div>

      {/* 暗角 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 58% 52% at 50% 46%,
            transparent 40%, rgba(4,7,18,${vignette}) 100%)`,
        }}
      />
      {warm > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 40% 46% at 30% 44%,
              rgba(255,180,110,${0.13 * warm}) 0%, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      <LyricText />

      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 34,
          color: 'rgba(143,168,255,0.28)',
          fontFamily: 'monospace',
          fontSize: 20,
        }}
      >
        {idx + 1}/{SHOTS.length} {shot.id} · {shot.move}
      </div>
    </AbsoluteFill>
  );
};
