import React from 'react';
import {Composition} from 'remotion';
import {Sample} from './Sample';
import {WhaleGirl} from './WhaleGirl';
import {BeatTest} from './BeatTest';
import {PoseTest} from './PoseTest';
import {VerseMV} from './mv/VerseMV';
import {CalibTest} from './CalibTest';
import {FullMV} from './mv/FullMV';
import {SONG_FRAMES, FPS} from './songData';
import {MV_FRAMES} from './mvData';
import {SEGMENT_LENGTH} from './beats';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Sample"
        component={Sample}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FullMV"
        component={FullMV}
        durationInFrames={SONG_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="CalibTest"
        component={CalibTest}
        durationInFrames={42 * 30}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="VerseMV"
        component={VerseMV}
        durationInFrames={MV_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PoseTest"
        component={PoseTest}
        durationInFrames={11 * 18}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="BeatTest"
        component={BeatTest}
        durationInFrames={Math.round(SEGMENT_LENGTH * 30)}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WhaleGirl"
        component={WhaleGirl}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{
          // 预览时才铺底；合成进 MV 时传 'transparent'
          background:
            'radial-gradient(circle at 50% 42%, #1B2A6B 0%, #0A1233 60%, #05091C 100%)',
        }}
      />
    </>
  );
};
