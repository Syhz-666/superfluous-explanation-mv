import {Config} from '@remotion/cli/config';

// WebGL 走 ANGLE / D3D11 后端 —— 在 Windows 上会用到 NVIDIA 显卡做硬件加速。
// 可选值: swangle | angle | egl | swiftshader | vulkan | angle-egl
// 如果 angle 在无头环境下报错，退回 'swangle'（软件渲染，慢但一定能跑）。
Config.setChromiumOpenGlRenderer('angle');

Config.setOverwriteOutput(true);
