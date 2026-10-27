import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { CURRENT_EPISODE_PATH } from '../pipeline/director';
import { EpisodeSchema, type Episode } from '../schema/episode.schema';

export const OUTPUT_VIDEO_DIR = path.resolve(process.cwd(), 'out');

export interface RenderEpisodeOptions {
  episode?: Episode;
  episodeJsonPath?: string;
  outputPath?: string;
  concurrency?: number;
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9';
}

/**
 * Ejecuta el renderizado de Remotion optimizado para Apple Silicon M5 (16 GB RAM):
 * - `concurrency: 3` para controlar instancias de Chromium Headless y proteger la memoria unificada.
 * - `codec: h264` a 1920x1080 @ 30fps en `/out/`.
 */
export async function renderEpisodeToMp4(
  options: RenderEpisodeOptions = {}
): Promise<string> {
  const concurrency = options.concurrency ?? 3;
  const codec = options.codec ?? 'h264';

  const sourceJsonPath = options.episodeJsonPath
    ? path.resolve(options.episodeJsonPath)
    : CURRENT_EPISODE_PATH;

  let episode: Episode;
  if (options.episode) {
    episode = EpisodeSchema.parse(options.episode);
  } else {
    if (!fs.existsSync(sourceJsonPath)) {
      throw new Error(
        `No se encontró el archivo de episodio para renderizar: ${sourceJsonPath}`
      );
    }
    const raw = JSON.parse(fs.readFileSync(sourceJsonPath, 'utf-8'));
    episode = EpisodeSchema.parse(raw);
  }

  fs.mkdirSync(OUTPUT_VIDEO_DIR, { recursive: true });

  const slugTitle =
    episode.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'episode';

  const finalOutputPath = options.outputPath
    ? path.resolve(options.outputPath)
    : path.join(OUTPUT_VIDEO_DIR, `${slugTitle}.mp4`);

  fs.mkdirSync(path.dirname(finalOutputPath), { recursive: true });

  // Escribir archivo temporal de props `{ episode }` para inyectar a Remotion
  const tmpPropsFile = path.join(
    os.tmpdir(),
    `remotion-props-${Date.now()}.json`
  );
  fs.writeFileSync(tmpPropsFile, JSON.stringify({ episode }), 'utf-8');

  const remotionBin = path.resolve(
    process.cwd(),
    'node_modules/.bin/remotion'
  );

  const args = [
    'render',
    'src/index.ts',
    'Episode',
    finalOutputPath,
    `--concurrency=${concurrency}`,
    `--codec=${codec}`,
    `--props=${tmpPropsFile}`,
    '--overwrite',
  ];

  console.log(
    `🎞️  Iniciando Remotion Render (M5 Optimized: concurrency=${concurrency}, codec=${codec}, ${episode.width}x${episode.height} @ ${episode.fps}fps)...`
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(remotionBin, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: process.env,
      });

      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`El proceso de Remotion finalizó con código ${code}`)
          );
        }
      });
    });

    console.log(`✅ Video MP4 renderizado exitosamente en: ${finalOutputPath}`);
    return finalOutputPath;
  } finally {
    fs.rmSync(tmpPropsFile, { force: true });
  }
}

// Permitir ejecución directa desde la CLI: `tsx src/cli/render.ts`
const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  const program = new Command();
  program
    .name('render')
    .description(
      'Renderiza el episodio actual en MP4 H264 1080p 30fps con optimización para Apple Silicon M5 (concurrency: 3)'
    )
    .option(
      '-f, --from-json <path>',
      'Ruta al archivo JSON del episodio',
      CURRENT_EPISODE_PATH
    )
    .option('-o, --output <path>', 'Ruta de salida del archivo MP4 en /out/')
    .option(
      '-c, --concurrency <number>',
      'Concurrencia de hilos de renderizado (por defecto 3 para 16GB RAM M5)',
      (v) => parseInt(v, 10),
      3
    )
    .action(
      async (opts: {
        fromJson: string;
        output?: string;
        concurrency: number;
      }) => {
        await renderEpisodeToMp4({
          episodeJsonPath: opts.fromJson,
          outputPath: opts.output,
          concurrency: opts.concurrency,
          codec: 'h264',
        });
      }
    );

  program.parseAsync(process.argv).catch((error) => {
    console.error('❌ Error durante el renderizado:', error);
    process.exit(1);
  });
}
