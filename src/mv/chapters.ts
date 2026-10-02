import type {PoseName} from '../WhaleGirl';

/**
 * 全曲分镜配置。对应 docs/STORYBOARD.md 里的一章一张表。
 *
 * 写成数据而不是九个硬编码文件：章节之间要互相对照（副歌一重复三次、
 * 主歌二复用主歌一的机位），数据化才好整体调。
 */

export type CamMove =
  | 'static'
  | 'push-in'
  | 'push-out'
  | 'pan-right'
  | 'pan-left'
  | 'tilt-up'
  | 'dolly'
  | 'track'
  | 'orbit'
  | 'slow-push'
  | 'slow-pull'
  | 'hold';

/** 特殊元素。剧本里所有"第二个人"的暗示都在这 */
export type Elem = 'none' | 'window' | 'silhouettes' | 'split' | 'footprints';

/**
 * 第二个人。
 *   other  —— 暗剪影，在场但看不清脸
 *   sister —— 缩小版鲸鱼娘，略压暗
 */
export type CompanionCfg = {
  kind: 'sister' | 'other';
  pose?: PoseName;
  /** 相对主角色高度的比例 */
  ratio: number;
  /** 相对主角色的水平偏移（px） */
  dx: number;
  flip?: boolean;
  /** 副歌里她会微微靠近 —— 辩解越急，两人越近 */
  approach?: number;
  /** 0 = 模糊难辨，1 = 清晰。剪影压低这个值就不会抢戏 */
  clarity?: number;
  /** 剪影的整体透明度 */
  opacity?: number;
};

export type ShotCfg = {
  /** 相对全曲的秒数 */
  a: number;
  b: number;
  pose: PoseName | 'walk';
  /** 角色显示高度 */
  h: number;
  /** 水平位置；'walk' = 自动横穿 */
  x: number | 'walk';
  cam: CamMove;
  elem?: Elem;
  companion?: CompanionCfg;
  /** 城市存在感 0–1 */
  city?: number;
  /** 这一镜是否熄灯 */
  lightsOut?: boolean;
  label?: string;
};

export type ChapterCfg = {
  id: string;
  a: number;
  b: number;
  title: string;
  /** 调色模式，对应 TREATMENT.md 的暖色曲线 */
  mode: 'cold' | 'warm' | 'fading' | 'pure-cold' | 'dark';
  shots: ShotCfg[];
};

const GROUND = 940;

/**
 * 「你」——暗剪影，站在她侧后方。
 *
 * 关键在于**退远**。画面角落那两个剪影之所以不突兀，是因为它们又小又虚；
 * 剪影做成和她一样大、一样实、贴着她站，就是一块抢戏的黑斑（实测过）。
 * 所以：压到 0.76 高（= 更远）、明显虚化、降透明度。
 */
const OTHER = (dx: number, ratio = 0.76, approach = 0): CompanionCfg => ({
  kind: 'other',
  pose: 'front',
  ratio,
  dx,
  approach,
  clarity: 0.42,
  opacity: 0.8,
});

/** 「妹妹」——缩小版鲸鱼娘 */
const SISTER = (dx: number, ratio = 0.62, flip = false): CompanionCfg => ({
  kind: 'sister',
  pose: 'front',
  ratio,
  dx,
  flip,
});

export const CHAPTERS: ChapterCfg[] = [
  // ── Ch.0 前奏 · 画面里没有人 ──
  {
    id: 'intro',
    a: 0,
    b: 17.32,
    title: '前奏',
    mode: 'cold',
    shots: [
      {a: 0, b: 6, pose: 'front', h: 0, x: 960, cam: 'push-in', city: 1, label: '空镜'},
      {a: 6, b: 12, pose: 'back', h: 340, x: 960, cam: 'push-in', city: 0.85, label: '远处出现'},
      {a: 12, b: 17.32, pose: 'back', h: 620, x: 960, cam: 'push-in', city: 0.7, label: '转身'},
    ],
  },

  // ── Ch.1 主歌一 · 12 句 ──
  // "我们的感情"→"你面无表情"→"求求你"：这一段讲的是**两个人**，所以「你」在场
  {
    id: 'verse1',
    a: 17.32,
    b: 64.589,
    title: '主歌一',
    mode: 'cold',
    shots: [
      {a: 17.32, b: 21.04, pose: 'front', h: 720, x: 1020, cam: 'static',
       companion: OTHER(-380, 0.95), city: 0.5, label: '两人'},
      {a: 21.04, b: 25.83, pose: 'phoneDown', h: 660, x: 1020, cam: 'push-in',
       companion: OTHER(-380, 0.95), city: 0.55},
      {a: 25.83, b: 29.66, pose: 'front', h: 760, x: 1060, cam: 'static',
       companion: OTHER(-400, 0.95), city: 0.55, label: '你面无表情'},
      {a: 29.66, b: 32.68, pose: 'back', h: 760, x: 1060, cam: 'pan-right',
       companion: {...OTHER(-400, 0.95), pose: 'back'}, city: 0.68, label: '求求你'},
      {a: 32.68, b: 38.379, pose: 'front', h: 800, x: 1040, cam: 'tilt-up',
       companion: OTHER(-390, 0.93, 40), city: 0.35},
      {a: 38.379, b: 40.94, pose: 'smile', h: 790, x: 1040, cam: 'static',
       companion: {...OTHER(-390, 0.93, 70), pose: 'smile'}, city: 0.4, label: '勉强笑'},
      // 打电话起，「你」不在场了 —— 只有通话姿态
      {a: 40.94, b: 44.02, pose: 'phoneEar', h: 830, x: 890, cam: 'dolly', city: 0.7},
      {a: 44.02, b: 48.799, pose: 'phoneEar', h: 830, x: 890, cam: 'static',
       city: 0.7, lightsOut: true, label: '灯灭'},
      {a: 48.799, b: 51.06, pose: 'reach', h: 800, x: 1180, cam: 'push-in',
       elem: 'window', city: 0.3, label: '橱窗'},
      // 「妹妹」登场
      {a: 51.06, b: 56.529, pose: 'walk', h: 740, x: 'walk', cam: 'track',
       elem: 'window', companion: SISTER(-330, 0.66, true), city: 0.78, label: '妹妹同行'},
      {a: 56.529, b: 60.449, pose: 'smile', h: 700, x: 620, cam: 'static',
       elem: 'split', companion: SISTER(340, 0.7), city: 0.18, label: '说说笑笑'},
      {a: 60.449, b: 64.589, pose: 'walk', h: 720, x: 'walk', cam: 'slow-push',
       elem: 'silhouettes', city: 0.92, label: '转角'},
    ],
  },

  // ── Ch.2 副歌一 · 辩解变成重复 ──
  // 她嘴上说「她只是我的妹妹」——**妹妹就站在旁边**。画面本身构成反讽：
  // 越是解释，越显得此地无银。
  {
    id: 'chorus1',
    a: 64.589,
    b: 100.889,
    title: '副歌一',
    mode: 'cold',
    shots: [
      {a: 64.589, b: 71.109, pose: 'front', h: 780, x: 1060, cam: 'static',
       companion: SISTER(-330, 0.66), city: 0.35, label: '妹妹在旁边'},
      {a: 71.109, b: 79.779, pose: 'front', h: 810, x: 1070, cam: 'static',
       companion: SISTER(-320, 0.66), city: 0.3, label: '机位A·近'},
      {a: 79.779, b: 86.62, pose: 'front', h: 840, x: 1080, cam: 'static',
       companion: SISTER(-310, 0.66), city: 0.26, label: '机位A·更近'},
      {a: 86.62, b: 92.48, pose: 'side', h: 800, x: 900, cam: 'slow-push', city: 0.6},
      // 「不知道他是谁」：她刚看见两个剪影。背对镜头、回头望 ——
      // 动作本身就是这句歌词的情绪，比"攥紧围巾"更贴。
      // （原来是 elem:'hands' 用代码画的双手特写，画砸了且把角色藏了 7 秒）
      {a: 92.48, b: 100.889, pose: 'backLook', h: 780, x: 960, cam: 'slow-push',
       city: 0.25, label: '回头'},
    ],
  },

  // ── Ch.3 主歌二 · 重蹈覆辙 ──
  {
    id: 'verse2',
    a: 100.889,
    b: 131.08,
    title: '主歌二',
    mode: 'cold',
    shots: [
      {a: 100.889, b: 104.589, pose: 'front', h: 700, x: 1020, cam: 'static',
       companion: OTHER(-380, 0.94), city: 0.5},
      {a: 104.589, b: 107.3, pose: 'phoneDown', h: 640, x: 1020, cam: 'push-in',
       companion: OTHER(-380, 0.94), city: 0.55},
      {a: 107.3, b: 111.1, pose: 'back', h: 750, x: 1060, cam: 'static',
       companion: {...OTHER(-400, 0.94), pose: 'back'}, city: 0.68},
      {a: 111.1, b: 116.429, pose: 'front', h: 790, x: 1040, cam: 'tilt-up',
       companion: OTHER(-390, 0.92, 50), city: 0.35, label: '张嘴没声'},
      {a: 116.429, b: 119.169, pose: 'reach', h: 780, x: 1180, cam: 'push-in',
       elem: 'window', city: 0.3, label: '橱窗'},
      {a: 119.169, b: 124.799, pose: 'walk', h: 730, x: 'walk', cam: 'track',
       companion: SISTER(-330, 0.66, true), city: 0.78},
      {a: 124.799, b: 127.58, pose: 'smile', h: 700, x: 620, cam: 'static',
       elem: 'split', companion: SISTER(340, 0.7), city: 0.18, label: '笑得更用力'},
      {a: 127.58, b: 131.08, pose: 'walk', h: 720, x: 'walk', cam: 'static',
       elem: 'silhouettes', city: 0.92},
    ],
  },

  // ── Ch.4 副歌二 · 绕着不肯走的人转圈 ──
  {
    id: 'chorus2',
    a: 131.08,
    b: 166.8,
    title: '副歌二',
    mode: 'cold',
    shots: [
      {a: 131.08, b: 139.32, pose: 'front', h: 820, x: 1060, cam: 'orbit',
       companion: SISTER(-340, 0.66), city: 0.32, label: '妹妹还在'},
      {a: 139.32, b: 145.92, pose: 'front', h: 820, x: 1060, cam: 'orbit',
       companion: SISTER(-340, 0.64), city: 0.3},
      {a: 145.92, b: 153.65, pose: 'front', h: 820, x: 1060, cam: 'orbit',
       companion: SISTER(-340, 0.62), city: 0.28},
      {a: 153.65, b: 160.65, pose: 'front', h: 860, x: 1020, cam: 'static',
       companion: OTHER(-380, 0.94, 20), city: 0.35, label: '表情垮掉'},
      {a: 160.65, b: 166.8, pose: 'front', h: 940, x: 960, cam: 'hold',
       city: 0.2, label: '极近·眼睛'},
    ],
  },

  // ── Ch.5 桥段 · 全片唯一暖色 · 转折点 ──
  {
    id: 'bridge',
    a: 166.8,
    b: 182.3,
    title: '桥段',
    mode: 'warm',
    shots: [
      {a: 166.8, b: 169.04, pose: 'reach', h: 850, x: 860, cam: 'slow-push',
       elem: 'window', city: 0.15, label: '递围巾'},
      {a: 169.04, b: 173.68, pose: 'reach', h: 880, x: 860, cam: 'static',
       city: 0.2, label: '没人接'},
      {a: 173.68, b: 177.4, pose: 'threeQuarter', h: 820, x: 700, cam: 'pan-right',
       elem: 'silhouettes', city: 0.7, label: '剪影清晰'},
      {a: 177.4, b: 182.3, pose: 'side', h: 800, x: 900, cam: 'static',
       city: 0.5, label: '围巾滑落'},
    ],
  },

  // ── Ch.6 副歌三 · 暖色褪去 ──
  {
    id: 'chorus3',
    a: 182.3,
    b: 211.68,
    title: '副歌三',
    mode: 'fading',
    shots: [
      {a: 182.3, b: 188.24, pose: 'phoneDown', h: 800, x: 960, cam: 'slow-push',
       city: 0.4, label: '围巾落地'},
      {a: 188.24, b: 196.99, pose: 'phoneDown', h: 720, x: 960, cam: 'static',
       city: 0.45, label: '蹲下捡'},
      {a: 196.99, b: 203.98, pose: 'front', h: 780, x: 1020, cam: 'static',
       companion: OTHER(-380, 0.92), city: 0.5, label: '颜色不对了'},
      {a: 203.98, b: 210.6, pose: 'back', h: 800, x: 900, cam: 'static',
       city: 0.55, label: '收进怀里'},
      {a: 210.6, b: 211.68, pose: 'back', h: 800, x: 900, cam: 'static',
       elem: 'silhouettes', city: 0.8, label: '剪影走掉'},
    ],
  },

  // ── Ch.7 副歌四 · 纯冷 · 单镜头内连续拉远 ──
  // 之前靠拼接多个不同大小的镜头做"远去"，看着是跳的。
  // 改成每镜都用 slow-pull：起点比上一镜更远，镜内还在继续拉。
  {
    id: 'chorus4',
    a: 211.68,
    b: 241.36,
    title: '副歌四',
    mode: 'pure-cold',
    shots: [
      {a: 211.68, b: 219.95, pose: 'walk', h: 620, x: 940, cam: 'slow-pull',
       elem: 'footprints', city: 0.8, label: '雪地脚印'},
      {a: 219.95, b: 226.64, pose: 'front', h: 500, x: 960, cam: 'slow-pull',
       city: 0.85},
      {a: 226.64, b: 234.72, pose: 'front', h: 380, x: 960, cam: 'slow-pull',
       city: 0.9},
      {a: 234.72, b: 241.36, pose: 'front', h: 260, x: 960, cam: 'slow-pull',
       city: 0.95, label: '只剩一个点'},
    ],
  },

  // ── Ch.8 尾奏 · 灯一盏盏灭 ──
  {
    id: 'outro',
    a: 241.36,
    b: 277.04,
    title: '尾奏',
    mode: 'dark',
    shots: [
      {a: 241.36, b: 250, pose: 'front', h: 0, x: 960, cam: 'static', city: 0.9, label: '空镜'},
      {a: 250, b: 262, pose: 'front', h: 0, x: 960, cam: 'slow-pull',
       city: 0.5, lightsOut: true},
      {a: 262, b: 277.04, pose: 'front', h: 0, x: 960, cam: 'slow-pull',
       city: 0.15, lightsOut: true, label: '全黑'},
    ],
  },
];

/** 暖色强度曲线：只在桥段达到峰值，之后单调褪去 */
export const warmAt = (sec: number): number => {
  if (sec < 48.799) return 0;
  if (sec < 64.589) return 0.45;
  if (sec < 166.8) return 0.3;
  if (sec < 182.3) return 1.0;
  if (sec < 211.68) return 0.55;
  if (sec < 241.36) return 0.18;
  return 0;
};

export {GROUND};
