import React from 'react';
import { AbsoluteFill, Audio, Series, staticFile } from 'remotion';
import type { Episode, Scene } from '../schema/episode.schema';
import { Camera2D } from './components/Camera2D';
import { CharacterFocus } from './templates/CharacterFocus';
import { InfographicCounter } from './templates/InfographicCounter';
import { InfographicList } from './templates/InfographicList';
import { InfographicSplit } from './templates/InfographicSplit';

export type EpisodeCompositionProps = {
  episode: Episode;
};

const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const { visualTemplate } = scene;

  switch (visualTemplate.type) {
    case 'character_focus':
      return <CharacterFocus scene={scene} template={visualTemplate} />;
    case 'infographic_split':
      return <InfographicSplit scene={scene} template={visualTemplate} />;
    case 'infographic_counter':
      return <InfographicCounter scene={scene} template={visualTemplate} />;
    case 'infographic_list':
      return <InfographicList scene={scene} template={visualTemplate} />;
  }
};

export const EpisodeComposition: React.FC<EpisodeCompositionProps> = ({
  episode,
}) => {
  return (
    <AbsoluteFill className="bg-slate-950 text-white overflow-hidden">
      {/* Cama de audio ambiental sutil generada por generate-sfx.ts */}
      <Audio src={staticFile('assets/sfx/bg_loop.wav')} loop volume={0.12} />

      <Series>
        {episode.scenes.map((scene) => (
          <Series.Sequence
            key={scene.id}
            durationInFrames={scene.durationInFrames}
            name={`${scene.id} (${scene.visualTemplate.type})`}
          >
            {/* Audio de locución TTS sincronizado con la escena */}
            {scene.audioUrl && (
              <Audio src={staticFile(scene.audioUrl)} volume={1.0} />
            )}

            {/* Efecto de sonido puntual de la escena */}
            {scene.sfx !== 'none' && (
              <Audio
                src={staticFile(`assets/sfx/${scene.sfx}.wav`)}
                volume={0.35}
              />
            )}

            <Camera2D
              cameraAction={scene.cameraAction}
              durationInFrames={scene.durationInFrames}
            >
              <SceneRenderer scene={scene} />
            </Camera2D>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
