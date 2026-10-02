import React from 'react';
import {Composition} from 'remotion';
import {FullMV} from './mv/FullMV';
import {SONG_FRAMES, FPS} from './songData';

/**
 * 合成注册。
 *
 * 只留整曲 MV —— 早期那些验证用的合成（3D 样片、卡点测试、姿势测试、
 * 歌词校准、只做主歌那版）都已经完成使命，代码在 git 历史里。
 */
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="FullMV"
      component={FullMV}
      durationInFrames={SONG_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
