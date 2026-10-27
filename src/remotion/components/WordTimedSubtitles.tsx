import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { WordTimestamp } from '../../schema/episode.schema';

export interface WordTimedSubtitlesProps {
  dialogue: string;
  wordTimestamps: WordTimestamp[];
  accentColor?: string;
}

export const WordTimedSubtitles: React.FC<WordTimedSubtitlesProps> = ({
  dialogue,
  wordTimestamps,
  accentColor = '#38bdf8',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeSec = frame / fps;

  if (!wordTimestamps || wordTimestamps.length === 0) {
    return (
      <div
        className="relative z-30 shrink-0 w-full px-7 py-3.5 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-md"
        style={{ zIndex: 30 }}
      >
        <p className="text-[22px] font-semibold text-slate-100 leading-snug">
          {dialogue}
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative z-30 shrink-0 w-full px-7 py-3.5 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-md"
      style={{ zIndex: 30 }}
    >
      <p className="text-[22px] font-bold leading-snug flex flex-wrap gap-x-2 gap-y-1 items-center">
        {wordTimestamps.map((wt, idx) => {
          const isActive =
            currentTimeSec >= wt.start && currentTimeSec <= wt.end;
          const isPast = currentTimeSec > wt.end;

          return (
            <span
              key={`${wt.word}-${idx}`}
              style={{
                backgroundColor: isActive ? accentColor : 'transparent',
                color: isActive
                  ? '#090d16'
                  : isPast
                    ? '#f8fafc'
                    : '#94a3b8',
                transform: isActive
                  ? 'scale(1.06) translateY(-1px)'
                  : 'scale(1)',
                display: 'inline-block',
                padding: isActive ? '1px 9px' : '1px 3px',
                borderRadius: '7px',
              }}
            >
              {wt.word}
            </span>
          );
        })}
      </p>
    </div>
  );
};

export const DynamicSubtitles = WordTimedSubtitles;
