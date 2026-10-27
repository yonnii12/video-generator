import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { CameraAction } from '../../schema/episode.schema';

export interface Camera2DProps {
  cameraAction: CameraAction;
  durationInFrames?: number;
  children: React.ReactNode;
}

export const Camera2D: React.FC<Camera2DProps> = ({
  cameraAction,
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: configDuration } = useVideoConfig();
  const totalFrames = durationInFrames ?? configDuration;

  const entranceSpring = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 120,
      mass: 0.8,
    },
  });

  const fastZoomSpring = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 150,
      mass: 0.65,
    },
  });

  const shakeEnvelope = interpolate(
    frame,
    [0, 10, 35, totalFrames],
    [0.3, 1, 0.35, 0.06],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  // Factores de escala calibrados para respetar el Title/Action Safe Area de 1920x1080
  switch (cameraAction) {
    case 'static': {
      scale = interpolate(entranceSpring, [0, 1], [0.992, 1]);
      translateX = 0;
      translateY = 0;
      break;
    }
    case 'zoom_in_slow': {
      scale = interpolate(frame, [0, totalFrames], [1, 1.055], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      translateY = interpolate(frame, [0, totalFrames], [0, -6], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
      break;
    }
    case 'zoom_in_fast': {
      scale = interpolate(fastZoomSpring, [0, 1], [1, 1.085]);
      translateY = interpolate(fastZoomSpring, [0, 1], [8, -6]);
      break;
    }
    case 'shake': {
      scale = interpolate(entranceSpring, [0, 1], [1, 1.03]);
      translateX = Math.sin(frame * 1.45) * 10 * shakeEnvelope;
      translateY = Math.cos(frame * 1.95) * 6 * shakeEnvelope;
      break;
    }
    case 'pan_left': {
      const panProgress = spring({
        frame,
        fps,
        durationInFrames: totalFrames,
        config: {
          damping: 22,
          stiffness: 70,
          mass: 1,
        },
      });
      scale = 1.045;
      translateX = interpolate(panProgress, [0, 1], [28, -28]);
      translateY = 0;
      break;
    }
  }

  return (
    <AbsoluteFill
      style={{
        overflow: 'hidden',
        backgroundColor: '#090d16',
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translate3d(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
