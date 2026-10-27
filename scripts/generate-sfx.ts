import * as fs from 'node:fs';
import * as path from 'node:path';
import { WaveFile } from 'wavefile';

const SAMPLE_RATE = 44100;
const SFX_OUTPUT_DIR = path.resolve(process.cwd(), 'public/assets/sfx');

/**
 * Convierte un array de muestras normalizadas [-1.0, 1.0] a Int16Array (PCM 16-bit)
 * y genera el archivo WAV usando la librería `wavefile`.
 */
function writeMonoWav(filePath: string, samplesFloat: Float64Array): void {
  const int16Samples = new Int16Array(samplesFloat.length);
  for (let i = 0; i < samplesFloat.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samplesFloat[i]));
    int16Samples[i] = Math.round(clamped * 32767);
  }

  const wav = new WaveFile();
  wav.fromScratch(1, SAMPLE_RATE, '16', int16Samples);
  fs.writeFileSync(filePath, wav.toBuffer());
}

/**
 * 1. whoosh.wav: Ruido blanco filtrado con ataque corto y fade out aerodinámico (~0.45s)
 */
function generateWhoosh(): Float64Array {
  const durationSec = 0.45;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(totalSamples);

  let prev = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    // Envolvente: ataque rápido (primer 18%) y fade-out exponencial suave
    const attack = Math.min(1, t / 0.18);
    const fadeOut = Math.pow(1 - t, 2.2);
    const envelope = attack * fadeOut;

    // Ruido blanco suavizado con filtro paso-bajo simple cuyo cutoff barre con t
    const white = Math.random() * 2 - 1;
    const alpha = 0.12 + 0.45 * Math.sin(Math.PI * t);
    prev = prev + alpha * (white - prev);

    samples[i] = prev * envelope * 0.65;
  }
  return samples;
}

/**
 * 2. pop.wav: Onda senoidal corta con barrido descendente de frecuencia (~0.12s)
 */
function generatePop(): Float64Array {
  const durationSec = 0.12;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(totalSamples);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    // Frecuencia cae rápidamente de 420 Hz a 85 Hz para el efecto "pop" de burbuja
    const freq = 85 + (420 - 85) * Math.pow(1 - t, 2.6);
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;

    const envelope = Math.sin(Math.PI * Math.min(1, t / 0.08)) * Math.pow(1 - t, 2.4);
    samples[i] = Math.sin(phase) * envelope * 0.8;
  }
  return samples;
}

/**
 * 3. ding.wav: Onda triangular con sobretono metálico y decay exponencial (~0.65s)
 */
function generateDing(): Float64Array {
  const durationSec = 0.65;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(totalSamples);

  const fundamentalFreq = 1046.5; // C6
  const overtoneFreq = 2093.0; // C7

  for (let i = 0; i < totalSamples; i++) {
    const timeSec = i / SAMPLE_RATE;
    const t = i / totalSamples;

    // Onda triangular pura en la frecuencia fundamental
    const period = 1 / fundamentalFreq;
    const localPhase = (timeSec % period) / period;
    const triangle = 4 * Math.abs(localPhase - 0.5) - 1;

    // Armónico superior para brillo de campana
    const overtone = Math.sin(2 * Math.PI * overtoneFreq * timeSec) * 0.25;

    const envelope = Math.exp(-5.8 * t);
    samples[i] = (triangle * 0.75 + overtone) * envelope * 0.7;
  }
  return samples;
}

/**
 * 4. bg_loop.wav: Ruido rosa suave a volumen casi imperceptible (~3.0s)
 */
function generateBgLoop(): Float64Array {
  const durationSec = 3.0;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(totalSamples);

  // Filtro Paul Kellet para aproximar ruido rosa (-3dB/octava)
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let i = 0; i < totalSamples; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;

    // Volumen casi imperceptible para cama de fondo (~0.006 de amplitud pico)
    samples[i] = pink * 0.012;
  }
  return samples;
}

/**
 * 5. record_scratch.wav: Efecto sintético corto de frenado de vinilo (~0.32s)
 */
function generateRecordScratch(): Float64Array {
  const durationSec = 0.32;
  const totalSamples = Math.floor(SAMPLE_RATE * durationSec);
  const samples = new Float64Array(totalSamples);

  let phase = 0;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / totalSamples;
    const sweepFreq = 680 - 520 * t + 140 * Math.sin(t * 28);
    phase += (2 * Math.PI * sweepFreq) / SAMPLE_RATE;

    const grit = (Math.random() * 2 - 1) * 0.25;
    const envelope = Math.sin(Math.PI * t);
    samples[i] = (Math.sin(phase) * 0.75 + grit) * envelope * 0.6;
  }
  return samples;
}

function main(): void {
  fs.mkdirSync(SFX_OUTPUT_DIR, { recursive: true });

  const sfxMap: Record<string, Float64Array> = {
    'whoosh.wav': generateWhoosh(),
    'pop.wav': generatePop(),
    'ding.wav': generateDing(),
    'bg_loop.wav': generateBgLoop(),
    'record_scratch.wav': generateRecordScratch(),
  };

  for (const [filename, samples] of Object.entries(sfxMap)) {
    const targetPath = path.join(SFX_OUTPUT_DIR, filename);
    writeMonoWav(targetPath, samples);
    const sizeKb = (fs.statSync(targetPath).size / 1024).toFixed(1);
    console.log(`🔊 Generado SFX: ${targetPath} (${sizeKb} KB)`);
  }
}

main();
