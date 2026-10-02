import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {LYRICS} from '../lyricTiming';

/**
 * 歌词层 —— 整行显示。
 *
 * 显示区间：**本行起点 → 下一句起点**。就这么简单。
 *
 * 试过三种算法，前两种都是错的：
 *   1. `行起点 + 固定值` —— 各句时长差很多（3～9 秒），写死会让长句唱到一半消失
 *   2. `行起点 + 末字时间 + 尾量` —— **会和下一句重叠**。
 *      第一句算到 21.24 秒，而第二句 20.85 秒就该出现，重叠 0.39 秒
 *   3. 用生成数据里的 endFrame —— 它是 `min(下一句, 本句+4.2)`，
 *      那个 4.2 秒上限把副歌的长句砍掉过 4.95 秒（30 句余量为负）
 *
 * 用「下一句起点」当结束时间，两个问题一起解决：不重叠，也不截断。
 *
 * 另外砍掉了逐字点亮（卡拉OK 式）。它是「欢快/跟唱」语境的视觉语言，
 * 放在分手的慢歌上和情绪打架；而且未唱的字要压暗才突得出"正在唱"，
 * 压暗就读不出来了。安静地整行显示更适合这首歌。
 */

const FPS = 30;

/** 淡入淡出帧数 */
const FADE = 9;
/** 整行提前多久出现（让文字先就位，歌声再进来） */
const LEAD = 0.35;
/** 最后一句唱完后再显示多久 */
const LAST_TAIL = 4.0;

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
        const startSec = l.sec - LEAD;
        const endSec =
          i + 1 < LYRICS.length ? LYRICS[i + 1].sec - LEAD : l.sec + LAST_TAIL;

        // 只渲染时间上挨得近的
        if (sec < startSec - 0.4 || sec > endSec + 0.4) return null;

        const startF = startSec * FPS;
        const endF = endSec * FPS;

        // 淡入 + 淡出；两段区间不重叠，所以不会同时出现两句
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

        // 入场轻微上浮，之后完全静止 —— 不做任何持续运动
        const rise = interpolate(frame, [startF, startF + FADE], [14, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

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
              color: '#EAF1FF',
              opacity,
              transform: `translateY(${rise}px)`,
              textShadow:
                '0 2px 24px rgba(10,18,45,0.95), 0 0 46px rgba(120,170,255,0.4)',
            }}
          >
            {l.text}
          </div>
        );
      })}
    </div>
  );
};
