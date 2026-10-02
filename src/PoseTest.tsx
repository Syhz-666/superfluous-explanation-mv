import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {WhaleGirl, POSES, type PoseName} from './WhaleGirl';

/**
 * 姿势切换测试。
 *
 * 目的：验证 11 张素材之间硬切时角色**不会跳动**。
 * 判断标准：脚底始终贴着地平线、头顶高度不变、水平位置不左右晃。
 *
 * 如果看到角色在某次切换后突然变大/变小/升高/降低，
 * 说明归一化出了问题，要回头查 prep_poses.py。
 */

const ORDER: PoseName[] = [
  'front',
  'walkA',
  'walkB',
  'phoneEar',
  'smile',
  'threeQuarter',
  'phoneDown',
  'backLook',
  'reach',
  'back',
  'side',
];

const HOLD = 18; // 每个姿势停留的帧数（0.6 秒）
const FEET_Y = 880; // 地平线
const GROUND_Y = 882;

export const PoseTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const idx = Math.min(Math.floor(frame / HOLD), ORDER.length - 1);
  const pose = ORDER[idx];

  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 75% 60% at 50% 42%, #1B2A6B 0%, #0A1233 58%, #05091C 100%)',
      }}
    >
      {/* 地平线参考：脚底应该始终压在这条线上 */}
      <div
        style={{
          position: 'absolute',
          left: 360,
          right: 360,
          top: GROUND_Y,
          height: 2,
          background: 'rgba(143,168,255,0.35)',
        }}
      />

      <WhaleGirl pose={pose} figureHeight={760} feetY={FEET_Y} />

      {/* 当前姿势名 */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          top: 48,
          color: '#C9D6FF',
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: 30,
        }}
      >
        {idx + 1}/{ORDER.length} · {pose}
      </div>

      {/* 计时，方便定位 */}
      <div
        style={{
          position: 'absolute',
          right: 60,
          top: 52,
          color: 'rgba(143,168,255,0.6)',
          fontFamily: 'monospace',
          fontSize: 24,
        }}
      >
        {(frame / fps).toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};
