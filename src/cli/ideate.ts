import { Command } from 'commander';
import {
  IDEAS_BACKLOG_PATH,
  generateIdeasBatch,
  readIdeasBacklog,
} from '../pipeline/ideator';

const program = new Command();

program
  .name('ideate')
  .description(
    'Etapa 0: Genera un lote de ideas virales con Structured Outputs y las guarda en src/generated/ideas_backlog.json'
  )
  .requiredOption(
    '-n, --niche <string>',
    'Nicho o temática central para las ideas virales'
  )
  .option(
    '-c, --count <number>',
    'Cantidad de ideas a generar en el lote',
    (val) => parseInt(val, 10),
    5
  )
  .action(async (options: { niche: string; count: number }) => {
    const { niche, count } = options;
    console.log(
      `🧠 [Etapa 0 · Ideador Viral] Generando ${count} ideas para el nicho: "${niche}"...`
    );

    const generated = await generateIdeasBatch(niche, count);
    const totalBacklog = readIdeasBacklog();

    console.log(`\n✅ Se generaron ${generated.length} ideas validadas con IdeaBriefSchema:`);
    for (const idea of generated) {
      console.log(
        `   • [${idea.viralScore}/100] (${idea.id}) ${idea.title}\n     🪝 Hook (5s): "${idea.hook}"`
      );
    }

    console.log(
      `\n📁 Backlog actualizado en: ${IDEAS_BACKLOG_PATH} (Total en backlog: ${totalBacklog.length} ideas)`
    );
  });

program.parseAsync(process.argv).catch((error) => {
  console.error('❌ Error en el CLI de Ideación:', error);
  process.exit(1);
});
