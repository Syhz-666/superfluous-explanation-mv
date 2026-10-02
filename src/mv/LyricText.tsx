import React from 'react';
import {interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {LYRICS, type LyricChar} from '../lyricTiming';

/**
 * 歌词层 —— 逐字点亮。
 *
 * 参考 pdoom-video 的排版规则：**每个词单独同步**、**已唱/未唱要有区别**、
 * 动的是字本身而不是整块文字。
 *
 * 具体做法（为慢歌调的，克制优先）：
 *   未唱到 —— 暗冷蓝，透明度 0.26
 *   正在唱 —— 白色 + 光晕，上浮 3px、放大 6%，0.22 秒软收回
 *   已唱过 —— 保持在亮过一档的冷蓝
 *
 * 光会**沿着句子走**：不是整行一起亮，是一道缓慢扫过的亮。
 * 不做弹跳、不做彩色、不做快速位移 —— 那些和伤感是冲突的。
 */

const FPS = 30;

/** 行级别的淡入淡出帧数 */
const FADE = 10;
/** 整行提前多久出现（让暗着的字先就位，歌声再点亮它） */
const LEAD = 0.45;
/** 唱到之后保留多久 */
const TAIL = 1.4;

const LyricCharSpan: React.FC<{c: LyricChar}> = ({c}) => {
  const frame = useCurrentFrame();
  const tf = c.sec * FPS;
  const d = (frame - tf) / FPS; // 秒。负 = 还没唱到

  // 亮起：稍微提前一点，让字"迎着"歌声亮起来，而不是等唱完才反应
  const lit = interpolate(d, [-0.1, 0.06], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 弹起：唱到的瞬间最大，之后软收回
  const pop = d < 0 ? 0 : Math.exp(-d / 0.22);

  const color = interpolateColors(lit, [0, 1], ['#6E86C8', '#FFFFFF']);

  return (
    <span
      style={{
        display: 'inline-block',
        color,
        // 上浮 + 放大都走 transform，不触发布局，字距不会被挤动
        transform: `translateY(${-pop * 3}px) scale(${1 + pop * 0.06})`,
        textShadow: pop > 0.05
          ? `0 0 ${10 + pop * 26}px rgba(150,190,255,${0.25 + pop * 0.6})`
          : 'none',
        whiteSpace: 'pre',
      }}
    >
      {c.ch}
    </span>
  );
};

export const LyricText: React.FC<{bottom?: number; fontSize?: number}> = ({
  bottom = 150,
  fontSize = 54,
}) => {
  const frame = useCurrentFrame();
  const sec = frame / FPS;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {LYRICS.map((l, i) => {
        // 只渲染时间上挨得近的两句，避免 44 句 × 每句十几个 span 全挂着
        if (sec < l.sec - LEAD - 0.5 || sec > l.sec + TAIL + 0.8) return null;

        const startF = (l.sec - LEAD) * FPS;
        const endF = (l.sec + TAIL) * FPS;
        const opacity = Math.min(
          interpolate(frame, [startF, startF + FADE], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          interpolate(frame, [endF - FADE, endF], [1, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })
        );
        if (opacity <= 0.001) return null;

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
              fontSize,
              fontWeight: 500,
              letterSpacing: 6,
              whiteSpace: 'nowrap',
              opacity,
            }}
          >
            {l.chars.map((c, j) => (
              <LyricCharSpan key={j} c={c} />
            ))}
          </div>
        );
      })}
    </div>
  );
};
