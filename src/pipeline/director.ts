import * as fs from 'node:fs';
import * as path from 'node:path';
import { ALLOWED_LUCIDE_ICONS } from '../remotion/components/IconBadge';
import { EpisodeSchema, type Episode, type Scene } from '../schema/episode.schema';
import type { IdeaBrief } from '../schema/idea.schema';
import { generateFallbackMouthCues } from './lipsync';
import { generateStructuredOutput } from './llm';
import { buildProportionalWordTimestamps } from './tts';

export const CURRENT_EPISODE_PATH = path.resolve(
  process.cwd(),
  'src/generated/current_episode.json'
);

const DIRECTOR_SYSTEM_PROMPT = `Eres un Director de Animación 2D y Showrunner Técnico especializado en retención algorítmica.
Tu misión es transformar un IdeaBrief aprobado en un guion técnico ejecutable que cumpla estrictamente el contrato EpisodeSchema (fps: 30, width: 1920, height: 1080).

REGLAS ESTRICTAS E INQUEBRANTABLES DEL DIRECTOR:
1. LÍMITE DE 8 SEGUNDOS POR ESCENA:
   - Ninguna escena puede superar los 8 segundos de duración (durationInFrames <= 240 a 30 fps).
   - El "dialogue" de cada escena debe tener aproximadamente entre 14 y 20 palabras habladas (nunca más de 22 palabras).
2. GRAMÁTICA DE CÁMARA OBLIGATORIA ("cameraAction"):
   - Usa SIEMPRE "zoom_in_fast" cuando la escena revele datos duros o estadísticas impactantes.
   - Usa SIEMPRE "shake" cuando la escena entregue un remate de humor irónico o sarcástico.
   - Usa "pan_left", "zoom_in_slow" o "static" para comparativas o cierres estructurados.
3. ICONOS VÁLIDOS DE LUCIDE-REACT:
   - En cualquier campo "icon" de las plantillas visuales, SOLO puedes usar nombres exactos de lucide-react de esta lista:
     ${ALLOWED_LUCIDE_ICONS.join(', ')}.
4. COHERENCIA EMOCIONAL DE POSE ("characterPose"):
   - Asigna una pose coherente con la emoción del diálogo:
     * "shocked": Hook inicial impactante o cifra inverosímil.
     * "explaining": Revelación o explicación de una estadística dura.
     * "sarcastic" o "dizzy": Ironía, sátira o absurdo técnico.
     * "angry": Crítica a un desperdicio o problema absurdo.
     * "neutral": Síntesis final y conclusión clara.
5. VARIEDAD VISUAL ("visualTemplate"):
   - Estructura el episodio en 4 escenas dinámicas utilizando las 4 plantillas de la unión discriminada:
     "character_focus", "infographic_counter", "infographic_split" e "infographic_list".`;

/**
 * Normaliza un nombre de icono para asegurar que pertenezca al catálogo permitido de `lucide-react`.
 */
function sanitizeLucideIcon(iconName?: string, defaultIcon = 'Sparkles'): string {
  if (!iconName) return defaultIcon;
  const match = ALLOWED_LUCIDE_ICONS.find(
    (allowed) => allowed.toLowerCase() === iconName.toLowerCase().trim()
  );
  return match ?? defaultIcon;
}

/**
 * Construye un episodio determinista a partir del `IdeaBrief` cumpliendo todas las reglas del Director
 * cuando no hay conexión a APIs externas de LLM.
 */
function buildFallbackEpisodeFromBrief(ideaBrief: IdeaBrief): Episode {
  const fps = 30;
  const stat1 = ideaBrief.hardStats[0] ?? {
    value: '340%',
    label: 'Incremento de complejidad',
    comparison: 'Tres veces más recursos para la misma tarea',
  };
  const stat2 = ideaBrief.hardStats[1] ?? {
    value: '18.4 s',
    label: 'Latencia operativa real',
    comparison: 'Más lento que el hardware de hace una década',
  };
  const humor1 =
    ideaBrief.humorAngles[0] ??
    'Creamos catorce capas de abstracción moderna solo para ahorrar dos líneas de código.';
  const humor2 =
    ideaBrief.humorAngles[1] ??
    'Llamamos arquitectura sin servidor a pagar ocho facturas distintas cada fin de mes.';

  // Recortar diálogos a ~15-20 palabras (< 8 segundos)
  const trimToMaxWords = (text: string, maxWords = 20): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text.trim();
    return words.slice(0, maxWords).join(' ').replace(/[,;:]$/, '') + '.';
  };

  const numericMatch = stat1.value.replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/);
  const parsedToValue = numericMatch ? parseFloat(numericMatch[0]) : 340;
  const prefixMatch = stat1.value.match(/^[^0-9]+/);
  const suffixMatch = stat1.value.match(/[^0-9.]+$/);

  const scene1Dialogue = trimToMaxWords(ideaBrief.hook, 20);
  const scene2Dialogue = trimToMaxWords(
    `El dato real asusta: alcanzamos ${stat1.value} en ${stat1.label.toLowerCase()}, ${stat1.comparison.toLowerCase()}.`,
    19
  );
  const scene3Dialogue = trimToMaxWords(humor1, 19);
  const scene4Dialogue = trimToMaxWords(
    `La solución exige tres reglas: medir ${stat2.value}, eliminar capas inútiles y automatizar con contratos estrictos.`,
    18
  );

  const buildSceneTiming = (dialogue: string, durationSec: number) => ({
    durationInFrames: Math.min(240, Math.ceil(durationSec * fps)),
    mouthCues: generateFallbackMouthCues(dialogue, durationSec),
    wordTimestamps: buildProportionalWordTimestamps(dialogue, durationSec),
  });

  const s1Timing = buildSceneTiming(scene1Dialogue, 6.2);
  const s2Timing = buildSceneTiming(scene2Dialogue, 6.8);
  const s3Timing = buildSceneTiming(scene3Dialogue, 6.0);
  const s4Timing = buildSceneTiming(scene4Dialogue, 6.5);

  const scenes: Scene[] = [
    {
      id: 'scene_01_hook',
      dialogue: scene1Dialogue,
      speaker: 'narrator',
      ...s1Timing,
      characterPose: 'shocked',
      cameraAction: 'zoom_in_fast',
      sfx: 'whoosh',
      visualTemplate: {
        type: 'character_focus',
        headline: ideaBrief.title,
        subtitle: stat1.comparison,
        badge: `VIRAL SCORE ${ideaBrief.viralScore}/100`,
        accentColor: '#38bdf8',
      },
    },
    {
      id: 'scene_02_stat_reveal',
      dialogue: scene2Dialogue,
      speaker: 'narrator',
      ...s2Timing,
      characterPose: 'explaining',
      cameraAction: 'zoom_in_fast',
      sfx: 'ding',
      visualTemplate: {
        type: 'infographic_counter',
        title: stat1.label,
        fromValue: 0,
        toValue: parsedToValue,
        prefix: prefixMatch ? prefixMatch[0].trim() : '',
        suffix: suffixMatch ? suffixMatch[0].trim() : '',
        decimals: Number.isInteger(parsedToValue) ? 0 : 1,
        label: stat1.label.toUpperCase(),
        comparisonText: stat1.comparison,
        icon: 'TrendingUp',
        accentColor: '#f59e0b',
      },
    },
    {
      id: 'scene_03_irony_split',
      dialogue: scene3Dialogue,
      speaker: 'narrator',
      ...s3Timing,
      characterPose: 'sarcastic',
      cameraAction: 'shake',
      sfx: 'record_scratch',
      visualTemplate: {
        type: 'infographic_split',
        title: 'Promesa de Marketing vs. Realidad en Producción',
        versusTag: 'VS',
        leftPanel: {
          label: 'PROMESA OFICIAL',
          value: '100% Simple',
          description: stat2.comparison,
          icon: 'Sparkles',
          highlightColor: '#10b981',
        },
        rightPanel: {
          label: 'REALIDAD DIARIA',
          value: stat2.value,
          description: humor2,
          icon: 'Flame',
          highlightColor: '#f43f5e',
        },
      },
    },
    {
      id: 'scene_04_takeaways',
      dialogue: scene4Dialogue,
      speaker: 'narrator',
      ...s4Timing,
      characterPose: 'neutral',
      cameraAction: 'zoom_in_slow',
      sfx: 'pop',
      visualTemplate: {
        type: 'infographic_list',
        title: 'Arquitectura de Supervivencia',
        subtitle: `Claves prácticas para dominar ${ideaBrief.title}`,
        accentColor: '#a855f7',
        items: [
          {
            title: stat1.label,
            detail: stat1.comparison,
            tag: stat1.value,
            icon: 'Cpu',
          },
          {
            title: stat2.label,
            detail: stat2.comparison,
            tag: stat2.value,
            icon: 'Gauge',
          },
          {
            title: 'Automatización Determinista',
            detail: humor1,
            tag: 'ZERO BLOAT',
            icon: 'CheckCircle2',
          },
        ],
      },
    },
  ];

  return EpisodeSchema.parse({
    title: ideaBrief.title,
    fps,
    width: 1920,
    height: 1080,
    scenes,
  });
}

/**
 * Post-procesa el episodio devuelto por el LLM para garantizar:
 * - Ninguna escena supere los 8 segundos (240 frames @ 30fps).
 * - Los iconos pertenezcan a `lucide-react`.
 * - `mouthCues` y `wordTimestamps` tengan valores iniciales coherentes si el LLM los dejó vacíos.
 */
function enforceDirectorConstraints(episode: Episode): Episode {
  const maxFramesPerScene = episode.fps * 8; // 8 segundos máximo

  const sanitizedScenes: Scene[] = episode.scenes.map((scene) => {
    const clampedFrames = Math.min(
      maxFramesPerScene,
      Math.max(60, scene.durationInFrames)
    );
    const durationSec = clampedFrames / episode.fps;

    const wordTimestamps =
      scene.wordTimestamps.length > 0
        ? scene.wordTimestamps
        : buildProportionalWordTimestamps(scene.dialogue, durationSec);

    const mouthCues =
      scene.mouthCues.length > 0
        ? scene.mouthCues
        : generateFallbackMouthCues(scene.dialogue, durationSec);

    let visualTemplate = scene.visualTemplate;
    if (visualTemplate.type === 'infographic_counter') {
      visualTemplate = {
        ...visualTemplate,
        icon: sanitizeLucideIcon(visualTemplate.icon, 'TrendingUp'),
      };
    } else if (visualTemplate.type === 'infographic_split') {
      visualTemplate = {
        ...visualTemplate,
        leftPanel: {
          ...visualTemplate.leftPanel,
          icon: sanitizeLucideIcon(visualTemplate.leftPanel.icon, 'Sparkles'),
        },
        rightPanel: {
          ...visualTemplate.rightPanel,
          icon: sanitizeLucideIcon(visualTemplate.rightPanel.icon, 'Flame'),
        },
      };
    } else if (visualTemplate.type === 'infographic_list') {
      visualTemplate = {
        ...visualTemplate,
        items: visualTemplate.items.map((item) => ({
          ...item,
          icon: sanitizeLucideIcon(item.icon, 'CheckCircle2'),
        })),
      };
    }

    return {
      ...scene,
      durationInFrames: clampedFrames,
      wordTimestamps,
      mouthCues,
      visualTemplate,
    };
  });

  return EpisodeSchema.parse({
    ...episode,
    scenes: sanitizedScenes,
  });
}

/**
 * Etapa 1: Transforma un `IdeaBrief` en un guion técnico completo validado por `EpisodeSchema`.
 */
export async function generateEpisodeScript(
  ideaBrief: IdeaBrief
): Promise<Episode> {
  const userPrompt = `Transforma el siguiente IdeaBrief en un guion completo que cumpla EpisodeSchema:

${JSON.stringify(ideaBrief, null, 2)}

Recuerda:
- Ninguna escena puede superar los 8 segundos (durationInFrames <= 240 a 30fps, diálogo de 15-20 palabras).
- Usa cameraAction: "zoom_in_fast" al revelar datos duros y "shake" para ángulos de humor.
- Usa únicamente nombres de iconos de lucide-react (${ALLOWED_LUCIDE_ICONS.join(', ')}).
- Asigna characterPose coherente con la emoción de cada escena.`;

  const rawEpisode = await generateStructuredOutput({
    systemPrompt: DIRECTOR_SYSTEM_PROMPT,
    userPrompt,
    schema: EpisodeSchema,
    schemaName: 'Episode',
    temperature: 0.65,
    fallbackGenerator: () => buildFallbackEpisodeFromBrief(ideaBrief),
  });

  return enforceDirectorConstraints(rawEpisode);
}
