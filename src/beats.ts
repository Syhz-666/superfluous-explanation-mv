// 由 scripts/prep_beat_test.py 生成 —— 拍点时间码，源自 librosa 分析。
// 时间是相对验证片段起点的秒数。

export type Beat = {
  sec: number;
  frame: number;
  strength: number;
  down: boolean;
};

export const SEGMENT_START = 15.0;
export const SEGMENT_LENGTH = 20.0;
export const BEAT_FPS = 30;

export const BEATS: Beat[] = [
  {sec: 0.65, frame: 20, strength: 0.638, down: true},
  {sec: 1.254, frame: 38, strength: 0.014, down: false},
  {sec: 1.858, frame: 56, strength: 0.486, down: false},
  {sec: 2.578, frame: 77, strength: 0.453, down: false},
  {sec: 3.297, frame: 99, strength: 0.159, down: true},
  {sec: 3.994, frame: 120, strength: 0.225, down: false},
  {sec: 4.714, frame: 141, strength: 0.228, down: false},
  {sec: 5.457, frame: 164, strength: 0.374, down: false},
  {sec: 6.06, frame: 182, strength: 0.013, down: true},
  {sec: 6.687, frame: 201, strength: 0.207, down: false},
  {sec: 7.384, frame: 222, strength: 0.256, down: false},
  {sec: 8.081, frame: 242, strength: 0.198, down: false},
  {sec: 8.8, frame: 264, strength: 0.302, down: true},
  {sec: 9.543, frame: 286, strength: 0.16, down: false},
  {sec: 10.263, frame: 308, strength: 0.378, down: false},
  {sec: 11.006, frame: 330, strength: 0.132, down: false},
  {sec: 11.726, frame: 352, strength: 0.1, down: true},
  {sec: 12.423, frame: 373, strength: 0.376, down: false},
  {sec: 13.143, frame: 394, strength: 0.384, down: false},
  {sec: 13.862, frame: 416, strength: 0.159, down: false},
  {sec: 14.582, frame: 437, strength: 0.553, down: true},
  {sec: 15.418, frame: 463, strength: 0.015, down: false},
  {sec: 16.277, frame: 488, strength: 0.316, down: false},
  {sec: 16.997, frame: 510, strength: 0.168, down: false},
  {sec: 17.694, frame: 531, strength: 0.11, down: true},
  {sec: 18.39, frame: 552, strength: 0.566, down: false},
  {sec: 19.133, frame: 574, strength: 0.063, down: false},
  {sec: 19.83, frame: 595, strength: 0.318, down: false},
];
