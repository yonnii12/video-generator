import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import {
  CURRENT_EPISODE_PATH,
  generateEpisodeScript,
} from '../pipeline/director';
import {
  generateIdeasBatch,
  readIdeasBacklog,
  writeIdeasBacklog,
} from '../pipeline/ideator';
import { generateMouthCues } from '../pipeline/lipsync';
import { TTSFactory, type TTSAudioResult } from '../pipeline/tts';
import {
  EpisodeSchema,
  type Episode,
  type MouthCue,
  type Scene,
} from '../schema/episode.schema';
import type { IdeaBrief } from '../schema/idea.schema';
import { renderEpisodeToMp4 } from './render';

const PUBLIC_GENERATED_DIR = path.resolve(process.cwd(), 'public/generated');
const PUBLIC_EPISODE_MIRROR = path.join(
  PUBLIC_GENERATED_DIR,
  'current_episode.json'
);

interface ProduceOptions {
  fromJson?: string;
  niche?: string;
  output?: string;
  concurrency?: number;
  skipRender?: boolean;
}

/**
 *Verifica que los assets SVG base (poses y bocas) y SFX WAV existan antes del render.
 */
function verifyRequiredAssets(scenes: Scene[]): void {
  const narratorDir = path.resolve(
    process.cwd(),
    'public/assets/characters/narrator'
  );
  const sfxDir = path.resolve(process.cwd(), 'public/assets/sfx');

  for (const scene of scenes) {
    const poseSvg = path.join(narratorDir, `${scene.characterPose}.svg`);
    if (!fs.existsSync(poseSvg)) {
      throw new Error(`Asset SVG de pose faltante: ${poseSvg}`);
    }

    if (scene.sfx !== 'none') {
      const sfxWav = path.join(sfxDir, `${scene.sfx}.wav`);
      if (!fs.existsSync(sfxWav)) {
        throw new Error(
          `Asset SFX faltante: ${sfxWav}. Ejecuta: npm run generate:sfx`
        );
      }
    }
  }
}

async function runMasterPipeline(options: ProduceOptions): Promise<void> {
  const startTime = Date.now();
  fs.mkdirSync(PUBLIC_GENERATED_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(CURRENT_EPISODE_PATH), { recursive: true });

  let episodeDraft: Episode;
  let producedIdeaId: string | null = null;

  // ============================================================================
  // PASO 1: Generación o Carga de Guion JSON
  // ============================================================================
  console.log('\n⏳ 1. Generando Guion JSON...');
  if (options.fromJson) {
    const customPath = path.resolve(options.fromJson);
    if (!fs.existsSync(customPath)) {
      throw new Error(`No existe el archivo indicado en --from-json: ${customPath}`);
    }
    console.log(`   📄 Cargando guion manual desde: ${customPath}`);
    const raw = JSON.parse(fs.readFileSync(customPath, 'utf-8'));
    episodeDraft = EpisodeSchema.parse(raw);
  } else {
    let backlog = readIdeasBacklog();
    let pendingIdeas = backlog
      .filter((i) => i.status === 'pending')
      .sort((a, b) => b.viralScore - a.viralScore);

    if (pendingIdeas.length === 0) {
      const defaultNiche = options.niche ?? 'Arquitectura de Software e IA';
      console.log(
        `   💡 Sin ideas pendientes en backlog. Generando lote automático para "${defaultNiche}"...`
      );
      await generateIdeasBatch(defaultNiche, 3);
      backlog = readIdeasBacklog();
      pendingIdeas = backlog
        .filter((i) => i.status === 'pending')
        .sort((a, b) => b.viralScore - a.viralScore);
    }

    const selectedIdea: IdeaBrief = pendingIdeas[0];
    producedIdeaId = selectedIdea.id;
    console.log(
      `   🎯 Idea seleccionada: "${selectedIdea.title}" (ID: ${selectedIdea.id} | ViralScore: ${selectedIdea.viralScore})`
    );
    episodeDraft = await generateEpisodeScript(selectedIdea);
  }

  // ============================================================================
  // PASO 2: Procesamiento Secuencial de TTS (Sin paralelismo masivo por 16GB RAM)
  // ============================================================================
  console.log('\n⏳ 2. Procesando TTS...');
  const ttsProvider = TTSFactory.create();
  const ttsResultsByScene = new Map<string, TTSAudioResult>();

  for (let i = 0; i < episodeDraft.scenes.length; i++) {
    const scene = episodeDraft.scenes[i];
    const targetWavPath = path.join(PUBLIC_GENERATED_DIR, `${scene.id}.wav`);
    console.log(
      `   🎙️  [${i + 1}/${episodeDraft.scenes.length}] Sintetizando voz para "${scene.id}"...`
    );
    const ttsResult = await ttsProvider.generateAudio(
      scene.dialogue,
      targetWavPath
    );
    ttsResultsByScene.set(scene.id, ttsResult);
  }

  // ============================================================================
  // PASO 3: Extracción Secuencial de Lip-Sync con Rhubarb / Fallback Silábico
  // ============================================================================
  console.log('\n⏳ 3. Extrayendo Lip-Sync con Rhubarb...');
  const mouthCuesByScene = new Map<string, MouthCue[]>();

  for (let i = 0; i < episodeDraft.scenes.length; i++) {
    const scene = episodeDraft.scenes[i];
    const ttsResult = ttsResultsByScene.get(scene.id);
    if (!ttsResult) {
      throw new Error(`Falta resultado TTS para la escena ${scene.id}`);
    }

    console.log(
      `   👄 [${i + 1}/${episodeDraft.scenes.length}] Calculando visemas para "${scene.id}" (${ttsResult.durationInSeconds.toFixed(2)}s)...`
    );
    const cues = await generateMouthCues(
      ttsResult.audioPath,
      scene.dialogue,
      ttsResult.durationInSeconds
    );
    mouthCuesByScene.set(scene.id, cues);
  }

  // ============================================================================
  // PASO 4: Consolidación de Assets y Guardado de current_episode.json
  // ============================================================================
  console.log('\n⏳ 4. Consolidando Assets...');
  verifyRequiredAssets(episodeDraft.scenes);

  const consolidatedScenes: Scene[] = episodeDraft.scenes.map((scene) => {
    const ttsResult = ttsResultsByScene.get(scene.id)!;
    const mouthCues = mouthCuesByScene.get(scene.id)!;
    const durationInFrames = Math.ceil(
      ttsResult.durationInSeconds * episodeDraft.fps
    );

    return {
      ...scene,
      durationInFrames,
      audioUrl: `generated/${scene.id}.wav`,
      mouthCues,
      wordTimestamps: ttsResult.wordTimestamps,
    };
  });

  const finalEpisode: Episode = EpisodeSchema.parse({
    ...episodeDraft,
    scenes: consolidatedScenes,
  });

  const serializedEpisode = JSON.stringify(finalEpisode, null, 2) + '\n';
  fs.writeFileSync(CURRENT_EPISODE_PATH, serializedEpisode, 'utf-8');
  fs.writeFileSync(PUBLIC_EPISODE_MIRROR, serializedEpisode, 'utf-8');

  if (producedIdeaId) {
    const backlog = readIdeasBacklog();
    const updatedBacklog = backlog.map((idea) =>
      idea.id === producedIdeaId
        ? { ...idea, status: 'produced' as const }
        : idea
    );
    writeIdeasBacklog(updatedBacklog);
  }

  const totalFrames = finalEpisode.scenes.reduce(
    (sum, s) => sum + s.durationInFrames,
    0
  );
  console.log(
    `   📦 Estado final guardado en: ${CURRENT_EPISODE_PATH} (${totalFrames} frames / ${(totalFrames / finalEpisode.fps).toFixed(2)}s @ ${finalEpisode.fps}fps)`
  );

  // ============================================================================
  // PASO 5: Renderizado MP4 H264 con Remotion (concurrency: 3 para M5)
  // ============================================================================
  if (options.skipRender) {
    console.log('\n⏭️  Renderizado omitido por bandera --skip-render.');
    return;
  }

  console.log('\n⏳ 5. Renderizando MP4 con Remotion...');
  const outputMp4 = await renderEpisodeToMp4({
    episode: finalEpisode,
    episodeJsonPath: CURRENT_EPISODE_PATH,
    outputPath: options.output,
    concurrency: options.concurrency ?? 3,
    codec: 'h264',
  });

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n🏆 Producción End-to-End completada en ${elapsedSec}s.\n   Archivo final: ${outputMp4}`
  );
}

const program = new Command();

program
  .name('produce')
  .description(
    'Orquestador End-to-End (Etapas 1 a 5): Genera guion, sintetiza voz TTS, calcula Lip-Sync, consolida assets y renderiza MP4 H264 a 1080p 30fps'
  )
  .option(
    '-f, --from-json <path>',
    'Salta la generación IA y produce a partir de un archivo JSON de episodio existente'
  )
  .option(
    '-n, --niche <string>',
    'Nicho a utilizar si el backlog de ideas está vacío',
    'Arquitectura de Software e IA'
  )
  .option(
    '-o, --output <path>',
    'Ruta personalizada para el archivo MP4 de salida en /out/'
  )
  .option(
    '-c, --concurrency <number>',
    'Concurrencia de renderizado para Apple Silicon M5 (por defecto 3)',
    (v) => parseInt(v, 10),
    3
  )
  .option(
    '--skip-render',
    'Ejecuta hasta la consolidación de assets y JSON sin invocar FFmpeg/Remotion render',
    false
  )
  .action(async (opts: ProduceOptions) => {
    await runMasterPipeline(opts);
  });

program.parseAsync(process.argv).catch((error) => {
  console.error('❌ Error crítico en el orquestador produce:', error);
  process.exit(1);
});
