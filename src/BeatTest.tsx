import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {BEATS, BEAT_FPS, type Beat} from './beats';
import {WhaleGirl} from './WhaleGirl';

/**
 * 卡点验证片 —— 用真实的音频时间码驱动角色。
 *
 * 目的不是好看，是**让拍点肉眼可辨**，好判断动画和听到的鼓点对不对得上：
 *   · 每次拍点角色挤压一下（压扁 + 上顶），力度随拍点强度
 *   · 同时从脚底扩散一圈光环 —— 光环是"动画认为的拍点"，
 *     你听到的鼓点是"实际的拍点"，两者重合才算卡准
 *
 * 拍点数据来自 src/beats.ts（librosa 算的），不是我听出来的。
 */

const DECAY = 0.11; // 拍点冲击的衰减时间常数（秒），越小越干脆

/** 找到当前帧之前最近的一个拍点，算出衰减后的冲击强度 */
const beatPulse = (frame: number): {amount: number; down: boolean; age: number} => {
  let cur: Beat | null = null;
  for (const b of BEATS) {
    if (b.frame <= frame) cur = b;
    else break;
  }
  if (!cur) return {amount: 0, down: false, age: 99};

  const age = (frame - cur.frame) / BEAT_FPS;
  // 加个下限：弱拍也要看得出在动，否则验证时容易以为是没卡上
  const amount = Math.exp(-age / DECAY) * (0.4 + 0.6 * cur.strength);
  return {amount, down: cur.down, age};
};

export const BeatTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pulse = beatPulse(frame);

  // 呼吸：拍点之外的慢速起伏，避免静止时像一张贴图
  const breath = Math.sin((frame / fps) * Math.PI * 1.1) * 0.014;

  // 拍点挤压
  const squash = pulse.amount * 0.17;
  const scaleX = 1 + breath + squash * 0.6;
  const scaleY = 1 + breath - squash;
  const bob = -pulse.amount * 32;

  // 地面阴影：角色压下去时阴影变大变淡
  const shadowScale = 1 + squash * 0.8;
  const shadowOpacity = 0.4 - squash * 0.5;

  // 拍点光环：从脚底扩散
  const ringT = Math.min(pulse.age / 0.45, 1);
  const ringScale = interpolate(ringT, [0, 1], [0.5, 1.9]);
  const ringOpacity = interpolate(ringT, [0, 1], [0.55, 0]);
  const ringWidth = pulse.down ? 7 : 4;

  // 背景随拍点提亮
  const glow = 0.1 + pulse.amount * 0.42;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 55% at 50% 46%,
          rgba(77,107,254,${glow}) 0%,
          #101A3D 45%,
          #070B1C 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Audio src={staticFile('segment.wav')} />

      {/* 拍点光环（画在角色下面） */}
      <div
        style={{
          position: 'absolute',
          bottom: 96,
          width: 500,
          height: 140,
          borderRadius: '50%',
          border: `${ringWidth}px solid rgba(143,168,255,${ringOpacity})`,
          transform: `scale(${ringScale})`,
        }}
      />

      {/* 地面阴影 */}
      <div
        style={{
          position: 'absolute',
          bottom: 118,
          width: 380,
          height: 64,
          borderRadius: '50%',
          background: `rgba(0,0,0,${Math.max(0, shadowOpacity)})`,
          filter: 'blur(14px)',
          transform: `scale(${shadowScale})`,
        }}
      />

      {/* 角色：立绘正面，显示高度 760px */}
      <WhaleGirl
        view="front"
        height={760}
        offsetY={bob}
        scaleX={scaleX}
        scaleY={scaleY}
      />

      {/* 帧号，方便定位到具体时刻去核对 */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          bottom: 32,
          color: 'rgba(143,168,255,0.55)',
          fontFamily: 'monospace',
          fontSize: 22,
        }}
      >
        frame {frame} · {(frame / fps).toFixed(2)}s
      </div>
    </AbsoluteFill>
  );
};
