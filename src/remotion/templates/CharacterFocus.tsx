import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import type {
  CharacterFocusTemplate,
  Scene,
} from '../../schema/episode.schema';
import { CharacterRig } from '../components/CharacterRig';
import { DynamicSubtitles } from '../components/WordTimedSubtitles';

export interface CharacterFocusProps {
  scene: Scene;
  template: CharacterFocusTemplate;
}

export const CharacterFocus: React.FC<CharacterFocusProps> = ({
  scene,
  template,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame: Math.max(0, frame - 4),
    fps,
    config: {
      damping: 15,
      stiffness: 120,
      mass: 0.85,
    },
  });

  const badgeSpring = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });

  const headlineTranslateY = interpolate(cardSpring, [0, 1], [28, 0]);
  const headlineOpacity = interpolate(cardSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      className="flex flex-row items-center justify-between"
      style={{
        padding: '68px 96px',
        background:
          'radial-gradient(circle at 25% 40%, rgba(56, 189, 248, 0.16), transparent 55%), radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.14), transparent 55%), linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
      }}
    >
      {/* Columna Izquierda: Personaje Principal (~82% altura dentro del Safe Area 1080p) */}
      <div className="relative z-10 flex flex-col items-center justify-center w-[42%] h-full py-4">
        <div
          className="absolute w-[360px] h-[360px] rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: template.accentColor }}
        />
        <CharacterRig
          pose={scene.characterPose}
          mouthCues={scene.mouthCues}
          speaker={scene.speaker}
          width={410}
          height={492}
        />
      </div>

      {/* Columna Derecha: Badge + Tarjeta Principal (z-10) + DynamicSubtitles (z-30) sin solapamiento */}
      <div
        className="relative z-20 flex flex-col justify-center w-[55%] max-h-full gap-5"
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineTranslateY.toFixed(2)}px)`,
        }}
      >
        {template.badge && (
          <div
            className="inline-flex items-center gap-2.5 self-start px-5 py-2 rounded-full border text-sm font-bold uppercase tracking-widest shadow-lg shrink-0"
            style={{
              borderColor: template.accentColor,
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              color: template.accentColor,
              transform: `scale(${interpolate(badgeSpring, [0, 1], [0.75, 1]).toFixed(3)})`,
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>{template.badge}</span>
          </div>
        )}

        <div className="relative z-10 p-8 rounded-3xl bg-slate-900/85 border border-slate-800/90 shadow-2xl backdrop-blur-xl">
          <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.14]">
            {template.headline}
          </h1>

          {template.subtitle && (
            <p
              className="mt-4 text-xl font-medium leading-relaxed"
              style={{ color: '#cbd5e1' }}
            >
              {template.subtitle}
            </p>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-sky-400" />
              LOCUTOR: {scene.speaker.toUpperCase()}
            </span>
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              SFX: {scene.sfx.toUpperCase()} · CAM: {scene.cameraAction.toUpperCase()}
            </span>
          </div>
        </div>

        <DynamicSubtitles
          dialogue={scene.dialogue}
          wordTimestamps={scene.wordTimestamps}
          accentColor={template.accentColor}
        />
      </div>
    </AbsoluteFill>
  );
};
