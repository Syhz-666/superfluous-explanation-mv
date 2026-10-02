import React from 'react';
import {WhaleGirl, type PoseName} from '../WhaleGirl';

/**
 * 「你」—— 单个剪影。
 *
 * **沿用画面里既有的剪影语言**（TwoSilhouettes 里那套：椭圆头 + 梯形长袍），
 * 而不是另画一个精细人形 —— 那样和周围的剪影不是一套视觉语言，很突兀。
 *
 * 两个组件共用同一组形状常量，改一处两边一起变。
 */

/** 剪影图形。TwoSilhouettes 和 SingleSilhouette 共用，保证是同一套语言 */
const SIL_FIGURE = (
  <>
    <ellipse cx="128" cy="86" rx="56" ry="62" />
    <path d="M 72 150 C 72 128, 184 128, 184 150 L 196 370 C 196 392, 60 392, 60 370 Z" />
  </>
);

export const SingleSilhouette: React.FC<{
  height: number;
  centerX: number;
  feetY: number;
  opacity?: number;
  offsetY?: number;
  flip?: boolean;
  /** 0 = 模糊难辨，1 = 清晰 */
  clarity?: number;
}> = ({height, centerX, feetY, opacity = 1, offsetY = 0, flip, clarity = 1}) => {
  const w = height * 0.37; // 图形包围盒 136×368
  return (
    <svg
      viewBox="60 24 136 368"
      style={{
        position: 'absolute',
        left: centerX - w / 2,
        top: feetY - height + offsetY,
        width: w,
        height,
        opacity,
        transform: flip ? 'scaleX(-1)' : undefined,
        filter: clarity < 1 ? `blur(${(1 - clarity) * 7}px)` : undefined,
      }}
    >
      <g fill="#0A0F26">{SIL_FIGURE}</g>
    </svg>
  );
};

/**
 * 「妹妹」—— 缩小版鲸鱼娘。
 * 用同一个角色的缩小版，读作"同辈/同伴"，比凭空造一个新角色省事也更统一。
 */
export const Companion: React.FC<{
  kind: 'sister' | 'other';
  pose?: PoseName;
  /** 显示高度（主角色一般 700–900，这里给 400–560） */
  height: number;
  centerX: number;
  feetY: number;
  opacity?: number;
  offsetY?: number;
  flip?: boolean;
  clarity?: number;
}> = ({
  kind,
  pose = 'front',
  height,
  centerX,
  feetY,
  opacity = 1,
  offsetY = 0,
  flip,
  clarity,
}) => {
  if (kind === 'other') {
    return (
      <SingleSilhouette
        height={height}
        centerX={centerX}
        feetY={feetY}
        opacity={opacity}
        offsetY={offsetY}
        flip={flip}
        clarity={clarity ?? 1}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        filter: 'brightness(0.72) saturate(0.8)',
        opacity,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: flip ? 'scaleX(-1)' : undefined,
          transformOrigin: '50% 50%',
        }}
      >
        <WhaleGirl
          pose={pose}
          figureHeight={height}
          feetY={feetY}
          centerX={centerX}
          offsetY={offsetY}
        />
      </div>
    </div>
  );
};

/**
 * 剧本里所有「第二个人」的暗示元素。
 * 全片不出现第二张脸，只靠这些东西让对方"在场"。
 */

/** 紫围巾。全片唯一暖色，色号见 docs/TREATMENT.md */
export const SCARF = '#8E6BC8';
export const SCARF_DARK = '#77549F';
export const SCARF_LIGHT = '#B99BE0';

/** 橱窗 + 紫围巾。第 9 句第一次出现，主歌二里是空的 */
export const ShopWindow: React.FC<{
  opacity: number;
  /** 里面有没有围巾。主歌二里已经被她买走了 */
  hasScarf?: boolean;
  left?: number;
  top?: number;
}> = ({opacity, hasScarf = true, left = 232, top = 232}) => (
  <div style={{position: 'absolute', left, top, width: 570, height: 672, opacity}}>
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
        background: `linear-gradient(122deg, transparent 34%,
          rgba(255,255,255,${0.12 * opacity}) 47%, transparent 58%)`,
        borderRadius: 4,
      }}
    />
    {hasScarf && (
      <svg
        viewBox="0 0 300 340"
        style={{position: 'absolute', left: 140, top: 170, width: 300, height: 340}}
      >
        <g opacity={opacity}>
          <ellipse cx="150" cy="76" rx="84" ry="46" fill="none"
            stroke={SCARF} strokeWidth="34" />
          <ellipse cx="150" cy="70" rx="84" ry="42" fill="none"
            stroke={SCARF_LIGHT} strokeWidth="9" opacity="0.65" />
          <path d="M 104 108 C 98 156, 94 202, 88 246 C 85 268, 68 276, 57 264
                   C 48 254, 53 236, 60 216 C 72 176, 84 142, 88 106 Z" fill={SCARF} />
          <path d="M 198 106 C 203 142, 210 176, 216 204 C 222 232, 212 252, 196 250
                   C 182 248, 180 230, 184 206 C 190 168, 188 136, 182 104 Z" fill={SCARF_DARK} />
          <g stroke={SCARF_LIGHT} strokeWidth="5" strokeLinecap="round" opacity="0.8">
            <path d="M 60 266 L 52 286" />
            <path d="M 70 270 L 64 290" />
            <path d="M 190 252 L 186 272" />
            <path d="M 200 250 L 198 270" />
          </g>
        </g>
      </svg>
    )}
  </div>
);

/**
 * 两个剪影 —— 「你」和「你身旁那位」。
 * 全片只出现两次：主歌一结尾（模糊）、桥段（清晰）。
 */
export const TwoSilhouettes: React.FC<{
  opacity: number;
  /** 0 = 模糊难辨，1 = 清晰 */
  clarity?: number;
  left?: number;
  top?: number;
  /** 走掉时的右移 */
  shiftX?: number;
}> = ({opacity, clarity = 1, left = 1145, top = 300, shiftX = 0}) => (
  <svg
    viewBox="0 0 400 620"
    style={{
      position: 'absolute',
      left: left + shiftX,
      top,
      width: 330,
      height: 512,
      opacity,
      filter: clarity < 1 ? `blur(${(1 - clarity) * 7}px)` : undefined,
    }}
  >
    <g fill="#0A0F26">
      {SIL_FIGURE}
      <g transform="translate(144, 18) scale(0.93)">{SIL_FIGURE}</g>
    </g>
  </svg>
);

/** 雪地脚印 —— 副歌四"她已经走远"那几镜 */
export const Footprints: React.FC<{
  opacity: number;
  groundY: number;
  centerX: number;
}> = ({opacity, groundY, centerX}) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', inset: 0, opacity}}
  >
    {Array.from({length: 11}, (_, i) => {
      const t = i / 10;
      const x = centerX - 150 - t * 620;
      const y = groundY + 8 + Math.sin(i * 1.7) * 14;
      const flip = i % 2 === 0;
      return (
        <ellipse
          key={i}
          cx={x + (flip ? -13 : 13)}
          cy={y}
          rx={13}
          ry={7}
          fill="rgba(6,10,26,0.5)"
          transform={`rotate(${flip ? -16 : 16} ${x} ${y})`}
        />
      );
    })}
  </svg>
);

