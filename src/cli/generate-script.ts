import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';
import {
  CURRENT_EPISODE_PATH,
  generateEpisodeScript,
} from '../pipeline/director';
import {
  IDEAS_BACKLOG_PATH,
  readIdeasBacklog,
  writeIdeasBacklog,
} from '../pipeline/ideator';

const program = new Command();

program
  .name('generate-script')
  .description(
    'Etapa 1: Selecciona la idea pendiente con mayor viralScore de ideas_backlog.json, genera el guion con el Director IA y guarda src/generated/current_episode.json'
  )
  .option(
    '-i, --id <string>',
    'ID específico de la idea en el backlog (opcional; por defecto elige la de mayor viralScore en estado pending)'
  )
  .action(async (options: { id?: string }) => {
    const backlog = readIdeasBacklog();
    if (backlog.length === 0) {
      throw new Error(
        `El backlog en ${IDEAS_BACKLOG_PATH} está vacío o no existe. Ejecuta primero: npm run ideate -- --niche "Tu nicho" --count 5`
      );
    }

    const pendingIdeas = backlog
      .filter((idea) =>
        options.id ? idea.id === options.id : idea.status === 'pending'
      )
      .sort((a, b) => b.viralScore - a.viralScore);

    if (pendingIdeas.length === 0) {
      throw new Error(
        'No se encontraron ideas con status "pending" en src/generated/ideas_backlog.json.'
      );
    }

    const selectedIdea = pendingIdeas[0];
    console.log(
      `🎬 [Etapa 1 · Director IA] Idea seleccionada: "${selectedIdea.title}" (ID: ${selectedIdea.id} | ViralScore: ${selectedIdea.viralScore}/100)`
    );

    const episode = await generateEpisodeScript(selectedIdea);

    fs.mkdirSync(path.dirname(CURRENT_EPISODE_PATH), { recursive: true });
    fs.writeFileSync(
      CURRENT_EPISODE_PATH,
      JSON.stringify(episode, null, 2) + '\n',
      'utf-8'
    );

    // Actualizar el estado de la idea seleccionada en el backlog a "approved"
    const updatedBacklog = backlog.map((idea) =>
      idea.id === selectedIdea.id
        ? { ...idea, status: 'approved' as const }
        : idea
    );
    writeIdeasBacklog(updatedBacklog);

    const totalFrames = episode.scenes.reduce(
      (sum, scene) => sum + scene.durationInFrames,
      0
    );

    console.log(
      `\n✅ Guion técnico generado y validado con EpisodeSchema en:\n   ${CURRENT_EPISODE_PATH}`
    );
    console.log(
      `📊 Escenas: ${episode.scenes.length} | Duración estimada: ${totalFrames} frames (${(totalFrames / episode.fps).toFixed(1)}s @ ${episode.fps}fps)`
    );
    for (const scene of episode.scenes) {
      const wordCount = scene.dialogue.trim().split(/\s+/).length;
      console.log(
        `   • [${scene.id}] (${(scene.durationInFrames / episode.fps).toFixed(1)}s | ${wordCount} palabras) pose=${scene.characterPose} | cam=${scene.cameraAction} | tpl=${scene.visualTemplate.type}`
      );
    }
    console.log(
      `\n🔄 Backlog actualizado: "${selectedIdea.id}" pasó de status "pending" -> "approved" en ${IDEAS_BACKLOG_PATH}`
    );
  });

program.parseAsync(process.argv).catch((error) => {
  console.error('❌ Error en el CLI de Director IA:', error);
  process.exit(1);
});
