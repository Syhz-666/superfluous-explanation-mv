import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';

/**
 * 歌词时间码校准片。
 *
 * 为什么需要它：网上流传的 LRC 有多个版本，时间戳会整体偏移（常见 0.5–3 秒）。
 * 我试过用起音点检测和基频跟踪自动校准 —— 都不可靠：
 *   · 起音点检在全混音上抓的是鼓点，偏移曲线是平的
 *   · 基频跟踪会把前奏的器乐旋律也算成人声乐句
 *
 * 所以交给人耳判断：把歌词按原始 LRC 时间贴上去，
 * 听「字出现得比唱得早还是晚」，就能定出偏移量。
 */

// 原始 LRC 时间（秒），未做任何偏移
const LINES: {t: number; text: string}[] = [
  {t: 17.1, text: '那阵子我们的感情出了一些问题'},
  {t: 21.2, text: '可是我也不太清楚问题出在哪里'},
  {t: 25.83, text: '你面无表情的话语不剩多少意义'},
  {t: 29.729, text: '就当我求求你 给我一些说明'},
  {t: 34.629, text: 'ok 我猜你只是暂时的压抑心情'},
  {t: 38.379, text: '不再去追问你 多给你一些关心'},
  {t: 41.249, text: '打电话请你去看最新的电影'},
];

const FPS = 30;

export const CalibTest: React.FC<{offset?: number}> = ({offset = 0}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS + offset; // 加偏移后的"歌词时间"

  const cur = LINES.filter((l) => l.t <= t).pop();
  const next = LINES.find((l) => l.t > t);

  // 拍点闪烁：让人声进来那一刻有个参考
  const sinceLine = cur ? t - cur.t : 99;
  const flash = Math.max(0, 1 - sinceLine / 0.35);

  return (
    <AbsoluteFill style={{background: '#0A1024'}}>
      <Audio src={staticFile('calib.wav')} />

      {/* 大号时间读数 */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 76,
          fontWeight: 700,
          color: '#8FA8FF',
        }}
      >
        {t.toFixed(2)}s
      </div>

      {/* 当前歌词 */}
      <div
        style={{
          position: 'absolute',
          top: 250,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: 74,
          fontWeight: 600,
          letterSpacing: 4,
          color: '#FFFFFF',
          opacity: 0.35 + 0.65 * flash,
          textShadow: `0 0 ${28 + flash * 46}px rgba(143,168,255,${0.4 + flash * 0.5})`,
        }}
      >
        {cur ? cur.text : '—— 前奏，人声还没进来 ——'}
      </div>

      {/* 下一句预告 */}
      <div
        style={{
          position: 'absolute',
          top: 360,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: 34,
          color: 'rgba(143,168,255,0.45)',
        }}
      >
        {next ? `下一句 @ ${next.t.toFixed(2)}s` : ''}
      </div>

      {/* 时间轴：把人声进来那一刻标出来 */}
      <div
        style={{
          position: 'absolute',
          bottom: 180,
          left: 200,
          right: 200,
          height: 4,
          background: 'rgba(143,168,255,0.18)',
        }}
      >
        {LINES.map((l, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(l.t / 42) * 100}%`,
              top: -9,
              width: 3,
              height: 22,
              background: l.t <= t ? '#8FA8FF' : 'rgba(143,168,255,0.35)',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${(t / 42) * 100}%`,
            top: -16,
            width: 2,
            height: 36,
            background: '#FF6B6B',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 140,
          left: 200,
          right: 200,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'monospace',
          fontSize: 22,
          color: 'rgba(143,168,255,0.5)',
        }}
      >
        <span>0s</span>
        <span>21s</span>
        <span>42s</span>
      </div>

      {/* 偏移量提示 */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: 24,
          color: 'rgba(255,180,120,0.75)',
        }}
      >
        当前偏移 {offset >= 0 ? '+' : ''}
        {offset.toFixed(2)}s
      </div>
    </AbsoluteFill>
  );
};
