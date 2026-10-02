import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';

/**
 * DeepSeek 鲸鱼娘女仆 —— 立绘版，支持姿势切换。
 *
 * 素材由 scripts/prep_poses.py 和 prep_views.py 归一化过：
 *   · 全部 11 张画布统一 780×1000，角色高 900px
 *   · 脚底统一落在画布 y=960，水平居中于 x=389
 *   · 实测身高极差 1px、脚底极差 1px
 * 所以**任何姿势之间可以硬切，角色不会跳动**。
 */

const CANVAS_W = 780;
const CANVAS_H = 1000;
const FIGURE_H = 900; // 归一化时用的角色高度
const BASELINE = 960; // 脚底在画布上的 y

/** 姿势注册表。键名用英文，值对应 public/ 下的文件。 */
export const POSES = {
  // 三视图切分
  front: 'char-front.png',
  back: 'char-back.png',
  side: 'char-side.png',
  // 走路循环四帧（迈步 → 过步右支撑 → 换步 → 过步左支撑）
  walkA: 'poses/01_侧面行走_迈步.png',
  walkPassR: 'poses/01b_侧面行走_过步_右支撑.png',
  walkB: 'poses/02_侧面行走_换步.png',
  walkPassL: 'poses/02b_侧面行走_过步_左支撑.png',
  phoneEar: 'poses/03_举手机贴耳.png',
  smile: 'poses/04_微笑.png',
  threeQuarter: 'poses/05_四十五度站立.png',
  phoneDown: 'poses/06_低头看手机.png',
  backLook: 'poses/07_背面回头.png',
  reach: 'poses/08_伸手.png',
} as const;

export type PoseName = keyof typeof POSES;

/** 走路循环的帧序。四帧比两帧自然得多 —— 两帧只是来回摆腿 */
export const WALK_CYCLE: PoseName[] = [
  'walkA',
  'walkPassR',
  'walkB',
  'walkPassL',
];

export type WhaleGirlProps = {
  pose?: PoseName;
  /** 角色显示高度（px） */
  figureHeight?: number;
  /**
   * 脚底落在画面上的 y 坐标。不传则整块垂直居中。
   * 排镜头时用这个把角色「站」在地平线上，比手算偏移可靠。
   */
  feetY?: number;
  /** 水平中心在画面上的 x 坐标，默认画面正中 */
  centerX?: number;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  /** 横竖分离缩放，做拍点挤压 */
  scaleX?: number;
  scaleY?: number;
  /** 旋转角度（度），做倾斜/转身过渡 */
  rotate?: number;
  transformOrigin?: string;
  background?: string;
};

export const WhaleGirl: React.FC<WhaleGirlProps> = ({
  pose = 'front',
  figureHeight = 700,
  feetY,
  centerX,
  opacity = 1,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1,
  rotate = 0,
  transformOrigin = 'center bottom',
  background = 'transparent',
}) => {
  const s = figureHeight / FIGURE_H;
  const w = CANVAS_W * s;
  const h = CANVAS_H * s;

  // 画布内的脚底位置 → 换算到画面坐标
  const top =
    feetY === undefined
      ? (1080 - h) / 2 + offsetY // 没指定就垂直居中
      : feetY - BASELINE * s + offsetY;
  const left = (centerX === undefined ? 960 : centerX) - w / 2 + offsetX;

  return (
    <AbsoluteFill style={{background, opacity}}>
      <Img
        src={staticFile(POSES[pose])}
        style={{
          position: 'absolute',
          left,
          top,
          width: w,
          height: h,
          transformOrigin,
          transform: `scale(${scaleX}, ${scaleY}) rotate(${rotate}deg)`,
        }}
      />
    </AbsoluteFill>
  );
};
