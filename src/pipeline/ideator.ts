import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';
import { IdeaBriefSchema, type IdeaBrief } from '../schema/idea.schema';
import { generateStructuredOutput } from './llm';

export const IDEAS_BACKLOG_PATH = path.resolve(
  process.cwd(),
  'src/generated/ideas_backlog.json'
);

export const IdeasBatchResponseSchema = z.object({
  ideas: z.array(IdeaBriefSchema).min(1),
});

const IDEATOR_SYSTEM_PROMPT = `Eres un Productor Ejecutivo Senior de YouTube Viral (combinando el rigor visual de Kurzgesagt, el ritmo vertiginoso de Fireship y la narrativa científica de Veritasium).

Tu objetivo es generar un lote de ideas de episodios animados 2D altamente virales en español para el nicho indicado.

REGLAS OBLIGATORIAS PARA CADA IDEA:
1. "id": Identificador único en formato slug (ej. "idea-nicho-001").
2. "title": Título magnético con brecha de curiosidad (Curiosity Gap) de máximo 75 caracteres.
3. "viralScore": Número entero entre 1 y 100 evaluando retención, controversia técnica e impacto emocional.
4. "status": Siempre debe ser exactamente "pending".
5. "hook": Gancho extremo para los PRIMEROS 5 SEGUNDOS del video (máximo 25 palabras). Debe romper una creencia común con una paradoja o contraste brutal.
6. "hardStats": Mínimo 2 estadísticas duras reales y verificables:
   - "value": Cifra corta e impactante (ej. "439,800x", "94.2%", "$14.8B", "0.3 ms").
   - "label": Qué mide exactamente esa cifra.
   - "comparison": Comparación tangible e inolvidable que dimensione el dato.
7. "humorAngles": Mínimo 2 ángulos de humor irónico, sarcástico o sátira aguda sobre el tema.`;

/**
 * Generador de respaldo determinista que sintetiza `count` ideas de alta retención adaptadas al `niche`
 * cuando no se han configurado claves de API externas en `.env`.
 */
function buildFallbackIdeasBatch(niche: string, count: number): {
  ideas: IdeaBrief[];
} {
  const templates = [
    {
      suffix: 'paradoja-eficiencia',
      titlePrefix: 'La Gran Mentira de la Eficiencia en',
      viralScore: 96,
      hook: `Nos prometieron que ${niche} automatizaría el trabajo en segundos, pero hoy gastamos el triple de energía resolviendo problemas que antes no existían.`,
      hardStats: [
        {
          value: '340%',
          label: `Incremento de complejidad operativa en ${niche}`,
          comparison:
            'Equivale a usar un reactor nuclear para calentar una taza de café instantáneo',
        },
        {
          value: '18.4 s',
          label: 'Tiempo medio de atención antes del abandono del usuario',
          comparison:
            'Más corto que el ciclo de arranque de una herramienta corporativa promedio',
        },
      ],
      humorAngles: [
        `Expertos en ${niche} creando 14 capas de abstracción para ahorrar 2 líneas de configuración.`,
        'El síndrome de comprar hardware de última generación para ejecutar hojas de cálculo glorificadas.',
      ],
    },
    {
      suffix: 'costo-oculto',
      titlePrefix: 'El Costo Oculto que Nadie Calcula en',
      viralScore: 91,
      hook: `El 90% de los proyectos de ${niche} parecen gratuitos el día uno y terminan costando más que alquilar un satélite propio.`,
      hardStats: [
        {
          value: '$42,000',
          label: `Costo anual oculto de mantenimiento en ${niche}`,
          comparison:
            'Suficiente para financiar un equipo dedicado durante medio año sin deuda técnica',
        },
        {
          value: '73%',
          label: 'Recursos desperdiciados en procesos ociosos',
          comparison:
            'Como dejar el motor de un avión encendido en el hangar toda la noche por si acaso',
        },
      ],
      humorAngles: [
        'Arquitecturas "serverless" que misteriosamente incluyen 8 facturas de servidores distintos.',
        `La promesa del "cero mantenimiento" en ${niche} que requiere tres guardias de madrugada.`,
      ],
    },
    {
      suffix: 'velocidad-extrema',
      titlePrefix: 'Cómo el 1% Domina',
      viralScore: 88,
      hook: `Mientras la mayoría pelea con tutoriales obsoletos de ${niche}, una arquitectura minimalista logra resultados diez veces más rápidos.`,
      hardStats: [
        {
          value: '12.5x',
          label: `Multiplicador de velocidad aplicando diseño determinista en ${niche}`,
          comparison:
            'La diferencia entre cruzar el Atlántico en Concorde o en un barco de vapor',
        },
        {
          value: '4.2 MB',
          label: 'Huella de memoria de un pipeline optimizado',
          comparison: '200 veces más ligero que una sola pestaña de navegador moderna',
        },
      ],
      humorAngles: [
        `Reemplazar 40 dependencias rotas en ${niche} con 30 líneas de código nativo y ver a todos entrar en pánico.`,
        'Reuniones de 2 horas para decidir cómo ahorrar 5 milisegundos de ejecución.',
      ],
    },
    {
      suffix: 'burbuja-hype',
      titlePrefix: 'Hype vs. Realidad Física en',
      viralScore: 85,
      hook: `Cada semana anuncian una revolución definitiva en ${niche}, pero las leyes de la termodinámica y la latencia tienen otros planes.`,
      hardStats: [
        {
          value: '68 ms',
          label: 'Límite físico de latencia perceptible por el cerebro humano',
          comparison:
            'Un parpadeo humano dura 150 ms; cualquier retraso mayor rompe la ilusión de inmediatez',
        },
        {
          value: '89%',
          label: `Demos virales de ${niche} editadas en cámara rápida`,
          comparison: 'Tan realistas como los comerciales de comida rápida frente al producto real',
        },
      ],
      humorAngles: [
        `Marketing de ${niche} prometiendo telepatía cuántica cuando el servidor se cae con 50 usuarios.`,
        'Llamar "Inteligencia Artificial Autónoma" a una cadena infinita de condicionales if-else.',
      ],
    },
    {
      suffix: 'futuro-minimalista',
      titlePrefix: 'Por Qué el Futuro de',
      viralScore: 93,
      hook: `El futuro de ${niche} no pertenece a las plataformas gigantes en la nube, sino a lo que cabe en los 16 GB de RAM de tu laptop.`,
      hardStats: [
        {
          value: '16 GB',
          label: `Presupuesto de memoria unificada para ejecutar ${niche} en local`,
          comparison:
            '440,000 veces la memoria que llevó al ser humano a la superficie lunar',
        },
        {
          value: '$0.00',
          label: 'Costo marginal por minuto producido en hardware propio',
          comparison: 'Independencia total frente a caídas de APIs y cambios de tarifas por token',
        },
      ],
      humorAngles: [
        `Pagar suscripciones mensuales en la nube cuando tu chip Apple Silicon está al 4% de uso viendo videos.`,
        'El placer silencioso de desconectar el Wi-Fi y que todo el sistema siga funcionando a 60 FPS.',
      ],
    },
  ];

  const slugNiche =
    niche
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'general';

  const ideas: IdeaBrief[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length];
    const indexNum = String(i + 1).padStart(3, '0');
    ideas.push({
      id: `idea-${slugNiche}-${indexNum}`,
      title: `${tpl.titlePrefix} ${niche}`,
      viralScore: Math.max(1, Math.min(100, tpl.viralScore - Math.floor(i / templates.length) * 3)),
      status: 'pending',
      hook: tpl.hook,
      hardStats: tpl.hardStats,
      humorAngles: tpl.humorAngles,
    });
  }

  return { ideas };
}

/**
 * Lee el backlog de ideas desde `/src/generated/ideas_backlog.json`.
 */
export function readIdeasBacklog(filePath: string = IDEAS_BACKLOG_PATH): IdeaBrief[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return z.array(IdeaBriefSchema).parse(raw);
}

/**
 * Escribe y valida el backlog completo en `/src/generated/ideas_backlog.json`.
 */
export function writeIdeasBacklog(
  ideas: IdeaBrief[],
  filePath: string = IDEAS_BACKLOG_PATH
): void {
  const validated = z.array(IdeaBriefSchema).parse(ideas);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
}

/**
 * Agrega o actualiza un lote de ideas en `/src/generated/ideas_backlog.json` y devuelve el backlog consolidado.
 */
export function appendIdeasToBacklog(
  newIdeas: IdeaBrief[],
  filePath: string = IDEAS_BACKLOG_PATH
): IdeaBrief[] {
  const existing = readIdeasBacklog(filePath);
  const byId = new Map<string, IdeaBrief>();

  for (const idea of existing) {
    byId.set(idea.id, idea);
  }
  for (const idea of newIdeas) {
    byId.set(idea.id, idea);
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => b.viralScore - a.viralScore
  );
  writeIdeasBacklog(merged, filePath);
  return merged;
}

/**
 * Etapa 0: Genera un lote de `count` ideas virales para el `niche` dado,
 * validando la respuesta con `IdeaBriefSchema` y persistiendo en `ideas_backlog.json`.
 */
export async function generateIdeasBatch(
  niche: string,
  count: number
): Promise<IdeaBrief[]> {
  const safeCount = Math.max(1, Math.min(20, Math.floor(count)));

  const userPrompt = `Genera exactamente ${safeCount} ideas virales para el nicho: "${niche}".
Asegúrate de que cada idea tenga status "pending", un hook demoledor para los primeros 5 segundos, estadísticas reales con comparaciones memorables y ángulos de humor irónico.`;

  const response = await generateStructuredOutput({
    systemPrompt: IDEATOR_SYSTEM_PROMPT,
    userPrompt,
    schema: IdeasBatchResponseSchema,
    schemaName: 'IdeasBatchResponse',
    temperature: 0.8,
    fallbackGenerator: () => buildFallbackIdeasBatch(niche, safeCount),
  });

  const normalizedIdeas = response.ideas.slice(0, safeCount).map((idea) =>
    IdeaBriefSchema.parse({
      ...idea,
      status: 'pending',
    })
  );

  appendIdeasToBacklog(normalizedIdeas);
  return normalizedIdeas;
}
