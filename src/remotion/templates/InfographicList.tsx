import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Layers } from 'lucide-react';
import type {
  InfographicListTemplate,
  Scene,
} from '../../schema/episode.schema';
import { CharacterRig } from '../components/CharacterRig';
import { DynamicIcon } from '../components/IconBadge';
import { DynamicSubtitles } from '../components/WordTimedSubtitles';

export interface InfographicListProps {
  scene: Scene;
  template: InfographicListTemplate;
}

export const InfographicList: React.FC<InfographicListProps> = ({
  scene,
  template,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  return (
    <AbsoluteFill
      className="flex flex-col justify-between gap-4"
      style={{
        padding: '64px 96px',
        background:
          'radial-gradient(circle at 25% 30%, rgba(168, 85, 247, 0.16), transparent 55%), radial-gradient(circle at 80% 70%, rgba(34, 211, 238, 0.14), transparent 55%), linear-gradient(135deg, #090d16 0%, #0f172a 100%)',
      }}
    >
      {/* Fila 1: Cabecera dentro del Safe Area */}
      <div
        className="relative z-10 shrink-0 flex items-center justify-between"
        style={{
          opacity: interpolate(headerSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(headerSpring, [0, 1], [-20, 0]).toFixed(2)}px)`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="p-3 rounded-2xl border"
            style={{
              backgroundColor: `${template.accentColor}22`,
              borderColor: `${template.accentColor}66`,
              color: template.accentColor,
            }}
          >
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <span
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: template.accentColor }}
            >
              DESGLOSE ESTRUCTURADO · INFOGRAPHIC LIST
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {template.title}
            </h2>
            {template.subtitle && (
              <p className="text-sm text-slate-400 mt-0.5">
                {template.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-400">
          ITEMS: {template.items.length} · POSE: {scene.characterPose.toUpperCase()}
        </div>
      </div>

      {/* Fila 2: Lista escalonada + Personaje */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-8 items-center">
        <div className="col-span-7 flex flex-col gap-3.5">
          {template.items.map((item, index) => {
            const itemSpring = spring({
              frame: Math.max(0, frame - 8 - index * 9),
              fps,
              config: {
                damping: 14,
                stiffness: 135,
                mass: 0.75,
              },
            });

            const translateX = interpolate(itemSpring, [0, 1], [-40, 0]);
            const opacity = interpolate(itemSpring, [0, 1], [0, 1]);

            return (
              <div
                key={`${item.title}-${index}`}
                className="p-4 rounded-2xl bg-slate-900/85 border border-slate-800/90 shadow-xl flex items-center justify-between gap-4"
                style={{
                  opacity,
                  transform: `translateX(${translateX.toFixed(2)}px)`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-base shrink-0"
                    style={{
                      backgroundColor: `${template.accentColor}22`,
                      color: template.accentColor,
                      border: `1px solid ${template.accentColor}55`,
                    }}
                  >
                    <DynamicIcon
                      name={item.icon ?? 'check'}
                      className="w-5 h-5"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-300 mt-0.5 leading-snug">
                      {item.detail}
                    </p>
                  </div>
                </div>

                {item.tag && (
                  <span
                    className="px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider shrink-0"
                    style={{
                      backgroundColor: `${template.accentColor}20`,
                      color: template.accentColor,
                    }}
                  >
                    {item.tag}
                  </span>
                )}
              </div>
            );
          })}
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
