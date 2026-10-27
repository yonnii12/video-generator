import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  MouthCueSchema,
  MouthVisemeSchema,
  type MouthCue,
  type MouthViseme,
} from '../schema/episode.schema';

interface RhubarbJsonOutput {
  metadata?: {
    soundFile?: string;
    duration?: number;
  };
  mouthCues?: Array<{
    start: number;
    end: number;
    value: string;
  }>;
}

/**
 * Resuelve la ruta del ejecutable de Rhubarb Lip Sync:
 * Prioriza `/bin/rhubarb` local al proyecto y luego `rhubarb` en el PATH del sistema.
 */
function resolveRhubarbBinary(): string {
  const localBin = path.resolve(process.cwd(), 'bin/rhubarb');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return 'rhubarb';
}

/**
 * Divide un texto en español en bloques silábicos aproximados y genera una secuencia
 * de visemas coherentes (consonantes -> A/B, vocales -> C/D) distribuida en `durationInSeconds`.
 */
export function generateFallbackMouthCues(
  text: string,
  durationInSeconds: number
): MouthCue[] {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  // Extraer grupos silábicos (consonante(s) + vocal(es))
  const syllableMatches = normalized.match(/[^aeiou\s]*[aeiou]+[^aeiou\s]*/g) ?? [
    'la',
  ];
  const approxSyllableCount = Math.max(1, syllableMatches.length);

  // Cada sílaba produce 2 fases articulatorias: ataque consonántico (A/B) y núcleo vocálico (C/D)
  const visemeSequence: MouthViseme[] = [];

  for (let i = 0; i < approxSyllableCount; i++) {
    const syl = syllableMatches[i] ?? '';
    const firstChar = syl[0] ?? 't';

    // Ataque consonántico coherente: bilabiales (p, b, m) -> A, resto -> B (con variación determinista/aleatoria)
    const isBilabial = /[pbm]/.test(firstChar);
    const consonantViseme: MouthViseme = isBilabial
      ? 'A'
      : Math.random() < 0.75
        ? 'B'
        : 'A';
    visemeSequence.push(consonantViseme);

    // Núcleo vocálico coherente: vocales abiertas (a, e, o) -> D/C, cerradas -> C/D
    const hasOpenVowel = /[ao]/.test(syl);
    const vowelViseme: MouthViseme = hasOpenVowel
      ? Math.random() < 0.7
        ? 'D'
        : 'C'
      : Math.random() < 0.7
        ? 'C'
        : 'D';
    visemeSequence.push(vowelViseme);
  }

  const activeSpeechDuration = Math.max(0.2, durationInSeconds * 0.92);
  const stepSec = activeSpeechDuration / visemeSequence.length;

  const cues: MouthCue[] = [];
  let cursor = 0;

  for (const value of visemeSequence) {
    const start = Number(cursor.toFixed(2));
    const end = Number(Math.min(durationInSeconds, cursor + stepSec).toFixed(2));
    if (end > start) {
      cues.push({ start, end, value });
    }
    cursor = end;
  }

  // Cierre en visema de reposo 'X' al final del audio
  const finalStart = Number(cursor.toFixed(2));
  const finalEnd = Number(durationInSeconds.toFixed(2));
  if (finalEnd > finalStart) {
    cues.push({
      start: finalStart,
      end: finalEnd,
      value: 'X',
    });
  } else if (cues.length > 0) {
    cues[cues.length - 1].end = finalEnd;
  }

  return cues;
}

/**
 * Genera los `mouthCues` ejecutando `rhubarb -f json <audioPath>`.
 * Si el binario no existe o falla, aplica el fallback fonético/silábico sobre `text` y `durationInSeconds`.
 */
export async function generateMouthCues(
  audioPath: string,
  text: string,
  durationInSeconds: number
): Promise<MouthCue[]> {
  const rhubarbBin = resolveRhubarbBinary();

  try {
    const stdout = execFileSync(rhubarbBin, ['-f', 'json', audioPath], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    });

    const parsed = JSON.parse(stdout) as RhubarbJsonOutput;
    if (!parsed.mouthCues || !Array.isArray(parsed.mouthCues)) {
      throw new Error('La salida JSON de Rhubarb no contiene `mouthCues`.');
    }

    const validatedCues: MouthCue[] = parsed.mouthCues.map((cue) => {
      const safeValue = MouthVisemeSchema.safeParse(cue.value);
      return MouthCueSchema.parse({
        start: Number(cue.start.toFixed(2)),
        end: Number(cue.end.toFixed(2)),
        value: safeValue.success ? safeValue.data : 'X',
      });
    });

    if (validatedCues.length > 0) {
      return validatedCues;
    }
  } catch {
    // Fallback automático basado en sílabas cuando Rhubarb no está instalado o falla
  }

  return generateFallbackMouthCues(text, durationInSeconds);
}
