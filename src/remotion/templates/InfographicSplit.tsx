import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { ArrowLeftRight } from 'lucide-react';
import type {
  InfographicSplitTemplate,
  Scene,
} from '../../schema/episode.schema';
import { CharacterRig } from '../components/CharacterRig';
import { DynamicIcon } from '../components/IconBadge';
import { DynamicSubtitles } from '../components/WordTimedSubtitles';

export interface InfographicSplitProps {
  scene: Scene;
  template: InfographicSplitTemplate;
}

export const InfographicSplit: React.FC<InfographicSplitProps> = ({
  scene,
  template,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const leftSpring = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.8 },
  });

  const rightSpring = spring({
    frame: Math.max(0, frame - 14),
    fps,
    config: { damping: 14, stiffness: 130, mass: 0.8 },
  });

  const vsSpring = spring({
    frame: Math.max(0, frame - 18),
    fps,
    config: { damping: 10, stiffness: 180 },
  });

  return (
    <AbsoluteFill
      className="flex flex-col justify-between gap-4"
      style={{
        padding: '64px 96px',
        background:
          'radial-gradient(circle at 20% 25%, rgba(244, 63, 94, 0.14), transparent 50%), radial-gradient(circle at 80% 25%, rgba(16, 185, 129, 0.14), transparent 50%), linear-gradient(180deg, #090d16 0%, #0f172a 100%)',
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
          <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-sky-400">
            <ArrowLeftRight className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-sky-400">
              COMPARATIVA DIRECTA · SPLIT VIEW
            </span>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {template.title}
            </h2>
          </div>
        </div>

        <div className="px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-400">
          ESCENA: {scene.id.toUpperCase()} · CAM: {scene.cameraAction}
        </div>
      </div>

      {/* Fila 2: Cuerpo Central (Panel Izquierdo + Personaje + Panel Derecho) */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-12 gap-6 items-center">
        {/* Panel Izquierdo */}
        <div
          className="col-span-4 p-7 rounded-3xl bg-slate-900/85 border-2 shadow-2xl flex flex-col justify-between h-[360px]"
          style={{
            borderColor: template.leftPanel.highlightColor,
            opacity: interpolate(leftSpring, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(leftSpring, [0, 1], [-48, 0]).toFixed(2)}px) scale(${interpolate(leftSpring, [0, 1], [0.94, 1]).toFixed(3)})`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${template.leftPanel.highlightColor}22`,
                color: template.leftPanel.highlightColor,
              }}
            >
              {template.leftPanel.label}
            </span>
            <DynamicIcon
              name={template.leftPanel.icon ?? 'alert'}
              className="w-7 h-7"
              style={{ color: template.leftPanel.highlightColor }}
            />
          </div>

          <div className="my-auto">
            <div
              className="text-5xl font-black tracking-tight"
              style={{ color: template.leftPanel.highlightColor }}
            >
              {template.leftPanel.value}
            </div>
            <p className="mt-3 text-lg text-slate-300 leading-snug font-medium">
              {template.leftPanel.description}
            </p>
          </div>

          <div
            className="h-1.5 w-full rounded-full opacity-75"
            style={{ backgroundColor: template.leftPanel.highlightColor }}
          />
        </div>

        {/* Badge Central VS + Personaje escalado para no invadir cabecera ni subtítulos */}
        <div className="col-span-4 flex flex-col items-center justify-center relative">
          <div
            className="mb-1 px-5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-lg tracking-widest shadow-xl z-20"
            style={{
              transform: `scale(${interpolate(vsSpring, [0, 1], [0, 1]).toFixed(3)})`,
            }}
          >
            {template.versusTag}
          </div>
          <CharacterRig
            pose={scene.characterPose}
            mouthCues={scene.mouthCues}
            speaker={scene.speaker}
            width={305}
            height={366}
          />
        </div>

        {/* Panel Derecho */}
        <div
          className="col-span-4 p-7 rounded-3xl bg-slate-900/85 border-2 shadow-2xl flex flex-col justify-between h-[360px]"
          style={{
            borderColor: template.rightPanel.highlightColor,
            opacity: interpolate(rightSpring, [0, 1], [0, 1]),
            transform: `translateX(${interpolate(rightSpring, [0, 1], [48, 0]).toFixed(2)}px) scale(${interpolate(rightSpring, [0, 1], [0.94, 1]).toFixed(3)})`,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                backgroundColor: `${template.rightPanel.highlightColor}22`,
                color: template.rightPanel.highlightColor,
              }}
            >
              {template.rightPanel.label}
            </span>
            <DynamicIcon
              name={template.rightPanel.icon ?? 'zap'}
              className="w-7 h-7"
              style={{ color: template.rightPanel.highlightColor }}
            />
          </div>

          <div className="my-auto">
            <div
              className="text-5xl font-black tracking-tight"
              style={{ color: template.rightPanel.highlightColor }}
            >
              {template.rightPanel.value}
            </div>
            <p className="mt-3 text-lg text-slate-300 leading-snug font-medium">
              {template.rightPanel.description}
            </p>
          </div>

          <div
            className="h-1.5 w-full rounded-full opacity-75"
            style={{ backgroundColor: template.rightPanel.highlightColor }}
          />
        </div>
      </div>

      {/* Fila 3: Subtítulos Sincronizados con z-index superior (z-30) */}
      <DynamicSubtitles
        dialogue={scene.dialogue}
        wordTimestamps={scene.wordTimestamps}
        accentColor={template.rightPanel.highlightColor}
      />
    </AbsoluteFill>
  );
};
