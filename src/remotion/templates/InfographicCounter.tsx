import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { BarChart3, TrendingUp } from 'lucide-react';
import type {
  InfographicCounterTemplate,
  Scene,
} from '../../schema/episode.schema';
import { CharacterRig } from '../components/CharacterRig';
import { DynamicIcon } from '../components/IconBadge';
import { DynamicSubtitles } from '../components/WordTimedSubtitles';

export interface InfographicCounterProps {
  scene: Scene;
  template: InfographicCounterTemplate;
}

export const InfographicCounter: React.FC<InfographicCounterProps> = ({
  scene,
  template,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardSpring = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 115,
      mass: 0.9,
    },
  });

  // Progreso del contador numérico usando spring suave durante ~1.6 segundos
  const countProgress = spring({
    frame: Math.max(0, frame - 6),
    fps,
    durationInFrames: Math.min(
      scene.durationInFrames - 15,
      Math.round(fps * 1.8)
    ),
    config: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
  });

  const currentVal = interpolate(
    countProgress,
    [0, 1],
    [template.fromValue, template.toValue]
  );

  const formattedNumber = currentVal.toFixed(template.decimals);
  const barWidthPercent = interpolate(countProgress, [0, 1], [8, 100]);

  return (
    <AbsoluteFill
      className="flex flex-col justify-between gap-4"
      style={{
        padding: '64px 96px',
        background:
          'radial-gradient(circle at 70% 35%, rgba(245, 158, 11, 0.16), transparent 55%), radial-gradient(circle at 20% 75%, rgba(56, 189, 248, 0.14), transparent 55%), linear-gradient(135deg, #090d16 0%, #111827 100%)',
      }}
    >
      {/* Fila 1: Cabecera dentro del Safe Area */}
      <div className="relative z-10 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: `${template.accentColor}1f`,
              borderColor: `${template.accentColor}66`,
              color: template.accentColor,
            }}
          >
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: template.accentColor }}
            >
              MÉTRICA DURA · HARD STAT COUNTER
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {template.title}
            </h2>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-400">
          SFX: {scene.sfx.toUpperCase()} · CAM: {scene.cameraAction.toUpperCase()}
        </div>
      </div>

      {/* Fila 2: Contenido Principal (Contador Gigante + Personaje) */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-8 items-center">
        <div
          className="col-span-7 p-8 rounded-3xl bg-slate-900/85 border border-slate-800 shadow-2xl flex flex-col justify-between"
          style={{
            opacity: interpolate(cardSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cardSpring, [0, 1], [24, 0]).toFixed(2)}px)`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-wider text-slate-400">
              {template.label}
            </span>
            <DynamicIcon
              name={template.icon ?? 'cpu'}
              className="w-9 h-9"
              style={{ color: template.accentColor }}
            />
          </div>

          <div
            className="my-4 text-7xl font-black tracking-tighter font-mono"
            style={{ color: template.accentColor }}
          >
            {template.prefix}
            {formattedNumber}
            {template.suffix}
          </div>

          {/* Barra de progreso animada */}
          <div className="w-full h-3.5 rounded-full bg-slate-800 overflow-hidden mb-5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${barWidthPercent.toFixed(1)}%`,
                backgroundColor: template.accentColor,
              }}
            />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-950/75 border border-slate-800/90">
            <TrendingUp
              className="w-6 h-6 shrink-0"
              style={{ color: template.accentColor }}
            />
            <p className="text-lg text-slate-200 font-medium leading-snug">
              {template.comparisonText}
            </p>
          </div>
        </div>

        <div className="col-span-5 flex flex-col items-center justify-center">
          <CharacterRig
            pose={scene.characterPose}
            mouthCues={scene.mouthCues}
            speaker={scene.speaker}
            width={345}
            height={414}
          />
        </div>
      </div>

      {/* Fila 3: Subtítulos Sincronizados con z-index superior (z-30) */}
      <DynamicSubtitles
        dialogue={scene.dialogue}
        wordTimestamps={scene.wordTimestamps}
        accentColor={template.accentColor}
      />
    </AbsoluteFill>
  );
};
