import React from 'react';
import {
  Composition,
  staticFile,
  type CalculateMetadataFunction,
} from 'remotion';
import rawSampleEpisode from '../mocks/sample_episode.json';
import { EpisodeSchema, type Episode } from '../schema/episode.schema';
import {
  EpisodeComposition,
  type EpisodeCompositionProps,
} from './EpisodeComposition';
import '../style.css';

const fallbackEpisode: Episode = EpisodeSchema.parse(rawSampleEpisode);

const fallbackDurationInFrames = fallbackEpisode.scenes.reduce(
  (sum, scene) => sum + scene.durationInFrames,
  0
);

/**
 * Carga asíncronamente `/src/generated/current_episode.json` (o recibe las props desde la CLI)
 * y calcula dinámicamente `durationInFrames` sumando todas las escenas del episodio.
 */
const calculateEpisodeMetadata: CalculateMetadataFunction<
  EpisodeCompositionProps
> = async ({ props, defaultProps, abortSignal }) => {
  let activeEpisode: Episode | null = null;

  // 1. Si se inyectaron props explícitas desde la CLI (--props), priorizarlas
  if (props?.episode && props.episode !== defaultProps?.episode) {
    activeEpisode = EpisodeSchema.parse(props.episode);
  }

  // 2. Intentar leer de forma asíncrona la copia sincronizada en public/generated/current_episode.json
  if (!activeEpisode) {
    try {
      const response = await fetch(
        staticFile('generated/current_episode.json'),
        { signal: abortSignal }
      );
      if (response.ok) {
        const json = await response.json();
        activeEpisode = EpisodeSchema.parse(json);
      }
    } catch {
      // Continuar al import dinámico de src/generated/current_episode.json
    }
  }

  // 3. Cargar de forma asíncrona /src/generated/current_episode.json desde el árbol de código
  // (Si public/generated/ no existe tras un git clone limpio, omitimos audioUrl para evitar 404 en <Audio>)
  if (!activeEpisode) {
    try {
      const importedModule = await import('../generated/current_episode.json');
      const rawCurrent = importedModule.default ?? importedModule;
      const parsed = EpisodeSchema.parse(rawCurrent);
      activeEpisode = {
        ...parsed,
        scenes: parsed.scenes.map((scene) => ({
          ...scene,
          audioUrl: undefined,
        })),
      };
    } catch {
      activeEpisode = props?.episode
        ? EpisodeSchema.parse(props.episode)
        : fallbackEpisode;
    }
  }

  const totalDurationInFrames = activeEpisode.scenes.reduce(
    (sum, scene) => sum + scene.durationInFrames,
    0
  );

  return {
    durationInFrames: Math.max(1, totalDurationInFrames),
    fps: activeEpisode.fps,
    width: activeEpisode.width,
    height: activeEpisode.height,
    props: {
      episode: activeEpisode,
    },
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Episode"
        component={EpisodeComposition}
        durationInFrames={fallbackDurationInFrames}
        fps={fallbackEpisode.fps}
        width={fallbackEpisode.width}
        height={fallbackEpisode.height}
        defaultProps={{
          episode: fallbackEpisode,
        }}
        calculateMetadata={calculateEpisodeMetadata}
      />
    </>
  );
};
