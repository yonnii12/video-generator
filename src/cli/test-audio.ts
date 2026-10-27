import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateMouthCues } from '../pipeline/lipsync';
import { TTSFactory } from '../pipeline/tts';
import { EpisodeSchema, type Episode, type Scene } from '../schema/episode.schema';

const INPUT_MOCK_PATH = path.resolve(
  process.cwd(),
  'src/mocks/sample_episode.json'
);
const OUTPUT_MOCK_PATH = path.resolve(
  process.cwd(),
  'src/mocks/sample_episode_with_audio.json'
);
const GENERATED_AUDIO_DIR = path.resolve(process.cwd(), 'public/generated');

async function runAudioIntegrationTest(): Promise<void> {
  console.log('🚀 Iniciando prueba de integración de Tubería de Voz + Lip-Sync (Secuencial M5)...');

  if (!fs.existsSync(INPUT_MOCK_PATH)) {
    throw new Error(`No se encontró el archivo de entrada: ${INPUT_MOCK_PATH}`);
  }

  fs.mkdirSync(GENERATED_AUDIO_DIR, { recursive: true });

  const rawJson = JSON.parse(fs.readFileSync(INPUT_MOCK_PATH, 'utf-8'));
  const episode: Episode = EpisodeSchema.parse(rawJson);

  const ttsProvider = TTSFactory.create();
  const updatedScenes: Scene[] = [];

  // Ejecución estrictamente secuencial (for...of) para proteger los 16 GB de memoria unificada del M5
  for (let i = 0; i < episode.scenes.length; i++) {
    const scene = episode.scenes[i];
    const targetWavPath = path.join(GENERATED_AUDIO_DIR, `${scene.id}.wav`);

    console.log(
      `\n🎙️ [${i + 1}/${episode.scenes.length}] Procesando escena "${scene.id}"...`
    );

    // 1. Síntesis TTS + cálculo de duración y wordTimestamps
    const ttsResult = await ttsProvider.generateAudio(
      scene.dialogue,
      targetWavPath
    );

    // 2. Cálculo de frames reales según el FPS del episodio
    const durationInFrames = Math.ceil(
      ttsResult.durationInSeconds * episode.fps
    );

    // 3. Generación de visemas (Rhubarb Lip Sync con fallback silábico coherente)
    const mouthCues = await generateMouthCues(
      ttsResult.audioPath,
      scene.dialogue,
      ttsResult.durationInSeconds
    );

    console.log(
      `   ✅ Audio: ${path.relative(process.cwd(), ttsResult.audioPath)} | Duración: ${ttsResult.durationInSeconds.toFixed(2)}s (${durationInFrames} frames) | Visemas: ${mouthCues.length} | Palabras: ${ttsResult.wordTimestamps.length}`
    );

    updatedScenes.push({
      ...scene,
      durationInFrames,
      mouthCues,
      wordTimestamps: ttsResult.wordTimestamps,
    });
  }

  const updatedEpisode: Episode = EpisodeSchema.parse({
    ...episode,
    scenes: updatedScenes,
  });

  fs.writeFileSync(
    OUTPUT_MOCK_PATH,
    JSON.stringify(updatedEpisode, null, 2) + '\n',
    'utf-8'
  );

  const totalFrames = updatedEpisode.scenes.reduce(
    (sum, s) => sum + s.durationInFrames,
    0
  );
  console.log(
    `\n🎉 Pipeline completado con éxito. Episodio guardado en:\n   ${OUTPUT_MOCK_PATH}`
  );
  console.log(
    `📊 Duración total del episodio: ${totalFrames} frames (${(totalFrames / updatedEpisode.fps).toFixed(2)}s @ ${updatedEpisode.fps}fps)`
  );
}

runAudioIntegrationTest().catch((error) => {
  console.error('❌ Error en la prueba de integración de audio:', error);
  process.exit(1);
});
