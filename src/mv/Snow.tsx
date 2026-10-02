import React from 'react';
import {useCurrentFrame} from 'remotion';

/**
 * 雪。
 *
 * 每片雪的参数由固定种子生成，位置是**帧号的纯函数** ——
 * 同一帧重复渲染结果完全一致，这是逐帧渲染不出错的前提。
 * 用 Math.random() 的话每帧雪花都会跳到新位置，渲染出来是一片闪烁。
 *
 * 性能备注：试过把 left/top 换成 transform + willChange 来"优化"，
 * **实测反而慢 25%**（18.4s → 23.1s）。给 130 个元素提升为独立合成层，
 * 建层的开销超过省下的布局开销。已还原。
 */

const W = 1920;
const H = 1080;

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const FLAKES = (() => {
  const rnd = seeded(424242);
  return Array.from({length: 130}, () => ({
    x: rnd() * W,
    y0: rnd() * (H + 60),
    size: 1.6 + rnd() * 3.4,
    speed: 20 + rnd() * 44, // 像素/秒
    sway: 8 + rnd() * 22,
    phase: rnd() * Math.PI * 2,
    near: rnd() > 0.7, // 近处的雪更大更亮
  }));
})();

export const Snow: React.FC<{
  opacity?: number;
  /** 整体下落速度倍率，做情绪变化 */
  speedFactor?: number;
}> = ({opacity = 1, speedFactor = 1}) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  return (
    <div style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      {FLAKES.map((f, i) => {
        const y = ((f.y0 + f.speed * speedFactor * t) % (H + 60)) - 30;
        const x = f.x + Math.sin(t * 0.6 + f.phase) * f.sway;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: f.size,
              height: f.size,
              borderRadius: '50%',
              background: f.near
                ? 'rgba(226,238,255,0.85)'
                : 'rgba(180,205,240,0.5)',
              filter: f.near ? 'blur(0.4px)' : 'blur(1px)',
            }}
          />
        );
      })}
    </div>
  );
};
