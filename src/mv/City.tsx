import React from 'react';

/**
 * 程序化冬夜城市背景。
 *
 * 风格定位是「极简留白 + 关键处出现具体元素」（剧本里定的 C 方案），
 * 所以城市是**低对比的剪影**，靠 prominence 控制存在感。
 *
 * 布局用固定种子的伪随机生成 —— 不能用 Math.random()，
 * 否则每一帧的城市都会变，渲染出来是一片闪烁的噪声。
 *
 * 性能备注：城市的几何确实是静态的，试过把 ~110 个矩形合并成几条 path
 * 来"预渲染"，**实测反而慢 25%**（18.4s → 23.1s）。已还原。
 * 瓶颈不在节点数，合并后的大 path 光栅化反而更贵。
 */

const W = 1920;
const H = 1080;

/** 线性同余伪随机，固定种子 → 每次渲染布局一致 */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

type Building = {
  x: number;
  w: number;
  h: number;
  windows: {x: number; y: number; lit: boolean; warm: boolean}[];
};

const BUILDINGS: Building[] = (() => {
  const rnd = seeded(20261002);
  const out: Building[] = [];
  let x = -60;
  while (x < W + 60) {
    const w = 70 + rnd() * 130;
    const h = 140 + rnd() * 400;
    const windows: Building['windows'] = [];
    const cols = Math.max(1, Math.floor(w / 34));
    const rows = Math.max(1, Math.floor(h / 46));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if (rnd() > 0.62) continue; // 大部分窗是暗的
        windows.push({
          x: 10 + c * 34,
          y: 16 + r * 46,
          lit: rnd() > 0.35,
          warm: rnd() > 0.55,
        });
      }
    }
    out.push({x, w, h, windows});
    x += w + 6 + rnd() * 26;
  }
  return out;
})();

export const City: React.FC<{
  /** 0 = 完全隐入夜色，1 = 完全显现 */
  prominence?: number;
  /** 整体水平偏移，做视差 */
  parallax?: number;
  /** 地面高度（画面 y） */
  groundY?: number;
  /** 关掉大部分灯（第 8 句用） */
  lightsOut?: boolean;
}> = ({prominence = 1, parallax = 0, groundY = 940, lightsOut = false}) => {
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{position: 'absolute', inset: 0}}
    >
      <g transform={`translate(${parallax}, 0)`}>
        {BUILDINGS.map((b, i) => {
          const y = groundY - b.h;
          // 越远的楼越暗（用索引粗略模拟层次）
          const depth = (i % 3) * 0.12;
          const base = 0.1 + depth;
          return (
            <g key={i} opacity={prominence}>
              <rect
                x={b.x}
                y={y}
                width={b.w}
                height={b.h}
                fill={`rgba(14,20,46,${Math.min(1, base + 0.5)})`}
              />
              {!lightsOut &&
                b.windows.map((wd, j) =>
                  wd.lit ? (
                    <rect
                      key={j}
                      x={b.x + wd.x}
                      y={y + wd.y}
                      width={9}
                      height={13}
                      fill={
                        wd.warm
                          ? `rgba(255,196,120,${0.5 * prominence})`
                          : `rgba(150,190,255,${0.4 * prominence})`
                      }
                    />
                  ) : null
                )}
            </g>
          );
        })}
      </g>

      {/* 地面：一条比楼群略亮的带子，把角色"放"在实地上 */}
      <rect
        x={0}
        y={groundY}
        width={W}
        height={H - groundY}
        fill={`rgba(10,16,38,${0.6 + 0.3 * prominence})`}
      />
      <rect
        x={0}
        y={groundY}
        width={W}
        height={2}
        fill={`rgba(143,168,255,${0.18 * prominence})`}
      />
    </svg>
  );
};
