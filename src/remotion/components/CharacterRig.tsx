import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {
  CharacterPose,
  MouthCue,
  MouthViseme,
  Speaker,
} from '../../schema/episode.schema';

export interface CharacterRigProps {
  pose: CharacterPose;
  mouthCues: MouthCue[];
  speaker?: Speaker;
  width?: number;
  height?: number;
  className?: string;
}

export const CharacterRig: React.FC<CharacterRigProps> = ({
  pose,
  mouthCues,
  speaker = 'narrator',
  width = 410,
  height = 492,
  className = '',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Tiempo actual en segundos para resolver el visema activo
  const currentTimeInSeconds = frame / fps;
  const activeCue = mouthCues.find(
    (cue) =>
      currentTimeInSeconds >= cue.start && currentTimeInSeconds < cue.end
  );
  const activeViseme: MouthViseme = activeCue ? activeCue.value : 'X';

  // Secondary Motion 1: Head Bobbing procedimental sin estado cuando el personaje habla (visema !== 'X')
  const isSpeaking = activeViseme !== 'X';
  const speakingBobY = isSpeaking ? Math.sin(frame / 10) * 4.5 : 0;

  // Secondary Motion 2: Parpadeo orgánico automático cada 90 frames (duración: 4 frames)
  const isBlinking = frame % 90 < 4;

  // Entrada elástica suave al inicio de la escena
  const popIn = spring({
    frame,
    fps,
    config: {
      damping: 16,
      stiffness: 130,
      mass: 0.8,
    },
  });

  const entranceScale = interpolate(popIn, [0, 1], [0.92, 1]);
  const entranceY = interpolate(popIn, [0, 1], [20, 0]);
  const totalTranslateY = entranceY + speakingBobY;

  const characterFolder = speaker === 'character_b' ? 'narrator' : 'narrator';
  const poseSrc = staticFile(
    `assets/characters/${characterFolder}/${pose}.svg`
  );
  const mouthSrc = staticFile(
    `assets/characters/${characterFolder}/mouths/${activeViseme}.svg`
  );

  return (
    <div
      className={`relative select-none shrink-0 ${className}`}
      style={{
        width,
        height,
        transform: `translateY(${totalTranslateY.toFixed(2)}px) scale(${entranceScale.toFixed(4)})`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
    >
      {/* Capa 1: Pose Vectorial Base (viewBox="0 0 500 600", zona 250,245 despejada) */}
      <Img
        src={poseSrc}
        alt={`Pose ${pose}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />

      {/* Capa 2: Parpadeo Automático Procedimental ((frame % 90) < 4) en coordenadas exactas (202,175) y (298,175) */}
      {isBlinking && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 500 600"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {/* Párpados cerrados dentro del marco de las gafas */}
          <rect
            x="166"
            y="150"
            width="70"
            height="48"
            rx="10"
            fill="#FDBA74"
          />
          <rect
            x="264"
            y="150"
            width="70"
            height="48"
            rx="10"
            fill="#FDBA74"
          />
          {/* Dos líneas horizontales de pestañas cerradas con escala Y comprimida (0.1) */}
          <g
            style={{
              transform: 'scaleY(0.1)',
              transformOrigin: '250px 175px',
            }}
          >
            <ellipse cx="202" cy="175" rx="22" ry="16" fill="#0B0F19" />
            <ellipse cx="298" cy="175" rx="22" ry="16" fill="#0B0F19" />
          </g>
          <line
            x1="176"
            y1="175"
            x2="228"
            y2="175"
            stroke="#0B0F19"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <line
            x1="272"
            y1="175"
            x2="324"
            y2="175"
            stroke="#0B0F19"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* Capa 3: Visema de Boca Superpuesto 1:1 (viewBox="0 0 500 600", anclado en cx: 250, cy: 245) */}
      <Img
        src={mouthSrc}
        alt={`Mouth viseme ${activeViseme}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
