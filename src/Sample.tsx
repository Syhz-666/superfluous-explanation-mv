import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';

/**
 * 10 秒样片 —— 目的是验证整条管线，不是最终画面。
 *
 * 要证明四件事：
 *   1. three.js 能在 Remotion 的无头 Chrome 里正常渲染（最大风险点）
 *   2. 中文文字能正确显示
 *   3. 逐帧确定性 —— 同一帧号永远出同一画面
 *   4. 硬切（卡点切镜）能工作
 *
 * 这里的 BEAT / BAR 是硬编码的占位值。接入歌曲后会由 librosa 的
 * onset detection 结果替换，那才是真正的卡点。
 */

// ── 卡点参数（占位）──
const BEAT = 15; // 每 15 帧一拍 → 30fps 下 = 120 BPM
const BAR = BEAT * 4; // 每 4 拍一小节
const CUT_AT = 150; // 第 5 秒硬切
const TOTAL = 300; // 10 秒

type Theme = {bg: string; accent: string; base: string};

const THEMES: Theme[] = [
  {bg: '#070b1c', accent: '#4dabf7', base: '#153a63'},
  {bg: '#1c0709', accent: '#ff6b6b', base: '#5c1a1a'},
];

/** 距上一拍过去多久 → 冲击强度。指数衰减，一拍拍下去立刻弹起再迅速收回。 */
const punchAt = (frame: number, interval: number, decay: number) =>
  Math.exp(-(frame % interval) / decay);

/** 镜头轨迹。注意：不用 useFrame，直接从帧号算，保证逐帧可复现。 */
const CameraRig: React.FC<{progress: number}> = ({progress}) => {
  const {camera} = useThree();
  camera.position.set(
    Math.sin(progress * 0.8) * 2.6,
    3.6 - progress * 1.9,
    9.8 - progress * 3.0,
  );
  camera.lookAt(0, 0.4 + progress * 0.5, 0);
  return null;
};

const BoxField: React.FC<{theme: Theme; phase: number}> = ({theme, phase}) => {
  const frame = useCurrentFrame();
  const size = 14;
  const gap = 1.02;
  const half = (size - 1) / 2;

  const beat = punchAt(frame, BEAT, 4.0);
  const bar = punchAt(frame, BAR, 9.0);

  const meshes: React.ReactNode[] = [];
  for (let ix = 0; ix < size; ix++) {
    for (let iz = 0; iz < size; iz++) {
      const x = (ix - half) * gap;
      const z = (iz - half) * gap;
      const dist = Math.hypot(x, z);

      // 从中心向外扩散的正弦波，随时间平移
      const wave = Math.sin(dist * 0.85 - frame * 0.14 + phase);

      // 拍点冲击：越靠近中心抬得越高；小节线（bar）再叠一层更慢更高的
      const lift =
        beat * Math.max(0, 4.5 - dist) * 0.5 + bar * Math.max(0, 3 - dist) * 0.32;

      const y = wave * 0.55 + lift;
      const s = 0.32 + beat * 0.16 + Math.max(0, wave) * 0.1;
      const hot = dist < 3.2;

      meshes.push(
        <mesh key={`${ix}_${iz}`} position={[x, y, z]} scale={s}>
          <boxGeometry args={[0.62, 0.62, 0.62]} />
          <meshStandardMaterial
            color={hot ? theme.accent : theme.base}
            emissive={theme.accent}
            emissiveIntensity={hot ? 0.35 + beat * 1.4 : beat * 0.25}
            roughness={0.3}
            metalness={0.65}
          />
        </mesh>,
      );
    }
  }
  return <>{meshes}</>;
};

const Scene: React.FC<{theme: Theme; phase: number; progress: number}> = ({
  theme,
  phase,
  progress,
}) => (
  <>
    <color attach="background" args={[theme.bg]} />
    <fog attach="fog" args={[theme.bg, 28, 54]} />
    <ambientLight intensity={0.4} />
    <directionalLight position={[8, 16, 8]} intensity={1.6} />
    <pointLight
      position={[0, 4, 0]}
      intensity={40}
      distance={26}
      color={theme.accent}
    />
    <BoxField theme={theme} phase={phase} />
    <CameraRig progress={progress} />
  </>
);

/** 文字层。用 HTML/CSS 而不是 3D TextGeometry —— 中文支持直接靠系统字体。 */
const LyricLine: React.FC<{text: string; localFrame: number}> = ({
  text,
  localFrame,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: localFrame,
    fps,
    config: {damping: 13, stiffness: 130, mass: 0.7},
  });
  const beat = punchAt(frame, BEAT, 4.0);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 148,
      }}
    >
      <div
        style={{
          fontFamily:
            '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif',
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: 10,
          color: '#ffffff',
          whiteSpace: 'nowrap',
          opacity: enter,
          // 每一拍文字轻微鼓一下 —— 最基础的卡点反馈
          transform: `scale(${enter * (1 + beat * 0.075)}) translateY(${
            (1 - enter) * 40
          }px)`,
          textShadow: `0 0 ${34 + beat * 40}px rgba(120,180,255,0.85), 0 6px 30px rgba(0,0,0,0.8)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const Sample: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  const after = frame >= CUT_AT;
  const theme = THEMES[after ? 1 : 0];

  return (
    <AbsoluteFill style={{backgroundColor: theme.bg}}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{antialias: true}}
        camera={{fov: 45, near: 0.1, far: 200}}
      >
        <Scene
          theme={theme}
          phase={after ? Math.PI : 0}
          progress={frame / TOTAL}
        />
      </ThreeCanvas>
      <LyricLine
        text={after ? '卡点切镜 · 通过' : '样片 · 管线验证'}
        localFrame={after ? frame - CUT_AT : frame}
      />
    </AbsoluteFill>
  );
};
