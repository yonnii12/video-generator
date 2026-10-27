import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { EdgeTTS } from 'node-edge-tts';
import { WaveFile } from 'wavefile';
import type { WordTimestamp } from '../schema/episode.schema';

export type SupportedEdgeVoice = 'es-MX-JorgeNeural' | 'es-CO-GonzaloNeural';

export interface TTSAudioResult {
  audioPath: string;
  durationInSeconds: number;
  wordTimestamps: WordTimestamp[];
}

export interface TTSProvider {
  generateAudio(text: string, outputPath: string): Promise<TTSAudioResult>;
}

interface EdgeSubtitleItem {
  part: string;
  start: number; // milisegundos
  end: number;   // milisegundos
}

/**
 * Estima la cantidad de sílabas de una palabra en español para ponderar su duración.
 */
function countSpanishSyllables(word: string): number {
  const clean = word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (!clean) return 1;
  const vowelGroups = clean.match(/[aeiouy]+/g);
  return Math.max(1, vowelGroups ? vowelGroups.length : Math.ceil(clean.length / 3));
}

/**
 * Calcula timestamps por palabra proporcionales a la carga silábica a lo largo de `durationInSeconds`.
 */
export function buildProportionalWordTimestamps(
  text: string,
  durationInSeconds: number
): WordTimestamp[] {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return [];
  }

  const weights = words.map((w) => {
    const syllables = countSpanishSyllables(w);
    const punctuationPause = /[,.;:?!]$/.test(w) ? 0.6 : 0;
    return syllables + punctuationPause;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  const usableDuration = Math.max(0.2, durationInSeconds * 0.94);

  const result: WordTimestamp[] = [];
  let cursor = 0.04;

  for (let i = 0; i < words.length; i++) {
    const slice = (weights[i] / totalWeight) * usableDuration;
    const start = Number(cursor.toFixed(3));
    const end = Number(Math.min(durationInSeconds, cursor + slice).toFixed(3));
    result.push({
      word: words[i],
      start,
      end,
    });
    cursor += slice;
  }

  return result;
}

/**
 * Obtiene la duración exacta en segundos de un archivo WAV PCM o vía `afinfo` en macOS.
 */
export function getAudioDurationInSeconds(filePath: string): number {
  try {
    const buffer = fs.readFileSync(filePath);
    // Verificar cabecera RIFF WAVE
    if (
      buffer.length > 44 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WAVE'
    ) {
      const wav = new WaveFile(buffer);
      const fmt = wav.fmt as {
        sampleRate: number;
        numChannels: number;
        bitsPerSample: number;
      };
      const dataChunk = wav.data as { chunkSize: number };
      const bytesPerSecond =
        fmt.sampleRate * fmt.numChannels * (fmt.bitsPerSample / 8);
      if (bytesPerSecond > 0 && dataChunk.chunkSize > 0) {
        return Number((dataChunk.chunkSize / bytesPerSecond).toFixed(3));
      }
    }
  } catch {
    // Continuar con fallback de afinfo si no es RIFF estándar
  }

  try {
    const out = execFileSync('/usr/bin/afinfo', [filePath], {
      encoding: 'utf-8',
    });
    const match = out.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
    if (match?.[1]) {
      return Number(parseFloat(match[1]).toFixed(3));
    }
  } catch {
    // Ignorar si afinfo no puede leerlo
  }

  return 3.5;
}

/**
 * Genera un archivo WAV PCM 16-bit sintético con envolvente silábica realista
 * cuando no hay red o el servicio remoto de Edge TTS no responde.
 */
function synthesizeFallbackSpeechWav(
  text: string,
  outputPath: string
): { durationInSeconds: number; wordTimestamps: WordTimestamp[] } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalSyllables = words.reduce(
    (sum, w) => sum + countSpanishSyllables(w),
    0
  );
  // Cadencia promedio en locución dinámica en español: ~4.8 sílabas/segundo + margen
  const durationInSeconds = Number(
    Math.max(2.2, totalSyllables / 4.8 + 0.45).toFixed(2)
  );
  const wordTimestamps = buildProportionalWordTimestamps(
    text,
    durationInSeconds
  );

  const sampleRate = 24000;
  const totalSamples = Math.floor(sampleRate * durationInSeconds);
  const int16Samples = new Int16Array(totalSamples);

  for (const wt of wordTimestamps) {
    const syllables = countSpanishSyllables(wt.word);
    const wordDuration = Math.max(0.08, wt.end - wt.start);
    const syllableDuration = wordDuration / syllables;

    for (let s = 0; s < syllables; s++) {
      const sylStartSec = wt.start + s * syllableDuration;
      const sylEndSec = sylStartSec + syllableDuration * 0.86;
      const startIdx = Math.max(0, Math.floor(sylStartSec * sampleRate));
      const endIdx = Math.min(totalSamples, Math.floor(sylEndSec * sampleRate));
      const f0 = 122 + ((s * 17 + wt.word.length * 9) % 38); // Frecuencia fundamental voz masculina

      for (let i = startIdx; i < endIdx; i++) {
        const localT = (i - startIdx) / Math.max(1, endIdx - startIdx);
        const env = Math.sin(Math.PI * localT);
        const timeSec = i / sampleRate;
        // Suma de armónicos vocales (f0 + formantes F1/F2 aproximados)
        const signal =
          0.55 * Math.sin(2 * Math.PI * f0 * timeSec) +
          0.28 * Math.sin(2 * Math.PI * (f0 * 4) * timeSec) +
          0.17 * Math.sin(2 * Math.PI * (f0 * 9) * timeSec);
        int16Samples[i] = Math.round(signal * env * 14000);
      }
    }
  }

  const wav = new WaveFile();
  wav.fromScratch(1, sampleRate, '16', int16Samples);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, wav.toBuffer());

  return { durationInSeconds, wordTimestamps };
}

/**
 * Proveedor TTS gratuito basado en `node-edge-tts` (voces neurales de Microsoft Edge).
 * Convierte la salida a WAV PCM 16-bit real mediante `/usr/bin/afconvert` en macOS ARM64
 * para compatibilidad nativa con Rhubarb Lip Sync y Remotion.
 */
export class EdgeTTSProvider implements TTSProvider {
  private readonly voice: SupportedEdgeVoice;
  private readonly lang: string;

  constructor(voice: SupportedEdgeVoice = 'es-MX-JorgeNeural') {
    this.voice = voice;
    this.lang = voice.startsWith('es-CO') ? 'es-CO' : 'es-MX';
  }

  async generateAudio(
    text: string,
    outputPath: string
  ): Promise<TTSAudioResult> {
    const resolvedOutput = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-tts-'));
    const tmpMp3Path = path.join(tmpDir, 'speech.mp3');
    const tmpSubtitlesPath = `${tmpMp3Path}.json`;

    try {
      const tts = new EdgeTTS({
        voice: this.voice,
        lang: this.lang,
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        saveSubtitles: true,
        timeout: 15000,
      });

      await tts.ttsPromise(text, tmpMp3Path);

      if (!fs.existsSync(tmpMp3Path) || fs.statSync(tmpMp3Path).size === 0) {
        throw new Error('El archivo de audio devuelto por EdgeTTS está vacío.');
      }

      // Si el destino es .wav, convertir de MP3 a WAV PCM 16-bit (LEI16@24000) con afconvert de macOS
      if (resolvedOutput.toLowerCase().endsWith('.wav')) {
        try {
          execFileSync('/usr/bin/afconvert', [
            '-f',
            'WAVE',
            '-d',
            'LEI16@24000',
            tmpMp3Path,
            resolvedOutput,
          ]);
        } catch {
          fs.copyFileSync(tmpMp3Path, resolvedOutput);
        }
      } else {
        fs.copyFileSync(tmpMp3Path, resolvedOutput);
      }

      const durationInSeconds = getAudioDurationInSeconds(resolvedOutput);

      // Parsear subtítulos generados por node-edge-tts si están disponibles
      let wordTimestamps: WordTimestamp[] = [];
      if (fs.existsSync(tmpSubtitlesPath)) {
        const rawSubs = JSON.parse(
          fs.readFileSync(tmpSubtitlesPath, 'utf-8')
        ) as EdgeSubtitleItem[];

        if (Array.isArray(rawSubs) && rawSubs.length > 0) {
          wordTimestamps = rawSubs
            .filter((item) => item.part && item.part.trim().length > 0)
            .map((item) => ({
              word: item.part.trim(),
              start: Number((item.start / 1000).toFixed(3)),
              end: Number((item.end / 1000).toFixed(3)),
            }));
        }
      }

      if (wordTimestamps.length === 0) {
        wordTimestamps = buildProportionalWordTimestamps(
          text,
          durationInSeconds
        );
      }

      return {
        audioPath: resolvedOutput,
        durationInSeconds,
        wordTimestamps,
      };
    } catch (error) {
      console.warn(
        `⚠️ EdgeTTSProvider aviso (${(error as Error).message}). Generando WAV PCM con sintetizador local de respaldo.`
      );
      const fallback = synthesizeFallbackSpeechWav(text, resolvedOutput);
      return {
        audioPath: resolvedOutput,
        durationInSeconds: fallback.durationInSeconds,
        wordTimestamps: fallback.wordTimestamps,
      };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

/**
 * Proveedor TTS local preparado para servidores compatibles con OpenAI Audio Speech API
 * en `http://localhost:8880/v1/audio/speech` (Kokoro-82M / Chatterbox en Apple Silicon).
 */
export class LocalTTSProvider implements TTSProvider {
  private readonly endpoint: string;
  private readonly voice: string;
  private readonly model: string;

  constructor(options?: { endpoint?: string; voice?: string; model?: string }) {
    this.endpoint =
      options?.endpoint ??
      process.env.LOCAL_TTS_URL ??
      'http://localhost:8880/v1/audio/speech';
    this.voice = options?.voice ?? process.env.LOCAL_TTS_VOICE ?? 'ef_dora';
    this.model = options?.model ?? process.env.LOCAL_TTS_MODEL ?? 'kokoro-82m';
  }

  async generateAudio(
    text: string,
    outputPath: string
  ): Promise<TTSAudioResult> {
    const resolvedOutput = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
        voice: this.voice,
        response_format: 'wav',
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `LocalTTSProvider error HTTP ${response.status} desde ${this.endpoint}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(resolvedOutput, Buffer.from(arrayBuffer));

    const durationInSeconds = getAudioDurationInSeconds(resolvedOutput);
    const wordTimestamps = buildProportionalWordTimestamps(
      text,
      durationInSeconds
    );

    return {
      audioPath: resolvedOutput,
      durationInSeconds,
      wordTimestamps,
    };
  }
}

/**
 * Fábrica de proveedores de voz guiada por la variable de entorno `TTS_PROVIDER`.
 * Valores soportados:
 * - `edge` (por defecto): `EdgeTTSProvider` (`es-MX-JorgeNeural` o `es-CO-GonzaloNeural`)
 * - `local`: `LocalTTSProvider` (`http://localhost:8880/v1/audio/speech`)
 */
export class TTSFactory {
  static create(providerOverride?: string): TTSProvider {
    const providerKey = (
      providerOverride ??
      process.env.TTS_PROVIDER ??
      'edge'
    )
      .toLowerCase()
      .trim();

    if (providerKey === 'local' || providerKey === 'kokoro' || providerKey === 'chatterbox') {
      return new LocalTTSProvider();
    }

    const rawVoice = process.env.TTS_VOICE;
    const edgeVoice: SupportedEdgeVoice =
      rawVoice === 'es-CO-GonzaloNeural'
        ? 'es-CO-GonzaloNeural'
        : 'es-MX-JorgeNeural';

    return new EdgeTTSProvider(edgeVoice);
  }
}
