# Orquestador de Videos Animados 2D — Remotion + TypeScript (M5 Edition)

Pipeline determinista End-to-End para la creación automatizada de episodios animados 2D (1080p @ 30fps) impulsado por **TypeScript**, **Remotion 4**, **TailwindCSS**, **Zod** y **Structured Outputs (Antigravity CLI `agy` / Claude 3.5 Sonnet)**, optimizado específicamente para **MacBook Air M5 (`darwin-arm64`) con 16 GB de memoria unificada**.

---

## Inicio Rápido (Quick Start)

```bash
# 1. Clonar el repositorio e instalar dependencias
git clone https://github.com/yonnii12/video-generator.git
cd video-generator
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. (Opcional) Descargar el binario oficial de Rhubarb Lip Sync para macOS
npm run setup:rhubarb

# 4. Abrir Remotion Studio para previsualizar en tiempo real
npm run preview

# 5. Ejecutar el pipeline completo (Guion -> TTS -> Lip-Sync -> Render MP4)
npm run produce
```

---

## Documentación del Proyecto

- [**ARCHITECTURE.md**](./ARCHITECTURE.md): Diseño arquitectónico detallado del pipeline determinista de 6 etapas y estructura del árbol de directorios.
- [**PROJECT_GUIDE.md**](./PROJECT_GUIDE.md): Explicación profunda del funcionamiento técnico, herramientas utilizadas y **Roadmap para escalar a videos de ~6 minutos** (YouTube Mid-Form).

---

## Requisitos del Sistema

- **Hardware Objetivo:** Apple Silicon (`darwin-arm64`, M1–M5) con 16 GB de RAM.
- **Node.js:** v20+ (probado en v26.3.1).
- **Audio nativo macOS:** `/usr/bin/afconvert` (incluido en macOS) para transcodificación PCM WAV 16-bit.

---

## Configuración de Variables de Entorno (`.env`)

Copia el archivo `.env.example` a `.env` para configurar los proveedores de IA y síntesis de voz:

```bash
cp .env.example .env
```

| Variable | Valores soportados | Descripción |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `agy` (default) \| `anthropic` | Selecciona entre el **CLI nativo de Antigravity** (`agy -p`, sin API key) o **Claude 3.5 Sonnet** (`@anthropic-ai/sdk`). |
| `AGY_BIN` | `agy` | Ruta del ejecutable del CLI de Antigravity (autodetección en `~/.local/bin/agy`). |
| `AGY_MODEL` | `gemini-3.8-flash-low` | Modelo pasado como `--model` al CLI de Antigravity. |
| `AGY_TIMEOUT_MS` | `180000` | Tiempo límite de cada consulta al CLI. |
| `AGY_USE_JSON_SCHEMA` | `false` | Si es `true`, añade `--json-schema` para forzar salida estructurada desde el CLI. |
| `ANTHROPIC_API_KEY` | *(opcional)* | Clave de API de Anthropic Claude (solo si `LLM_PROVIDER=anthropic`). |
| `TTS_PROVIDER` | `edge` (default) \| `local` | Selecciona entre `EdgeTTSProvider` (`node-edge-tts`) o `LocalTTSProvider` (Kokoro-82M / Chatterbox). |
| `TTS_VOICE` | `es-MX-JorgeNeural` \| `es-CO-GonzaloNeural` | Voz neural en español para `EdgeTTSProvider`. |
| `LOCAL_TTS_URL` | `http://localhost:8880/v1/audio/speech` | Endpoint local compatible con OpenAI Audio Speech API. |

---

## Catálogo Completo de Scripts (`package.json`)

### 1. Visualización y Verificación
- **`npm run preview`** / **`npm start`**  
  Levanta **Remotion Studio** en el navegador leyendo dinámicamente `/src/generated/current_episode.json` (o `/src/mocks/sample_episode.json` como respaldo) mediante `calculateMetadata`.
- **`npm run typecheck`**  
  Ejecuta `tsc --noEmit` en modo estricto para validar todos los contratos de tipos y esquemas Zod sin emitir artefactos.

### 2. Inicialización de Assets Vectoriales, SFX y Lip-Sync
- **`npm run generate:placeholders`** (`tsx scripts/generate-placeholders.ts`)  
  Genera en `/public/assets/characters/narrator/` las 6 poses vectoriales Cel-Shaded (`neutral`, `explaining`, `shocked`, `sarcastic`, `angry`, `dizzy`) y los 9 visemas de boca (`A.svg` a `H.svg` y `X.svg`) con `viewBox="0 0 500 600"` y anclaje matemático en `(250, 245)`.
- **`npm run generate:sfx`** (`tsx scripts/generate-sfx.ts`)  
  Sintetiza con `wavefile` los efectos de sonido PCM 16-bit en `/public/assets/sfx/`: `whoosh.wav`, `pop.wav`, `ding.wav`, `record_scratch.wav` y `bg_loop.wav`.
- **`npm run setup:rhubarb`** (`tsx scripts/setup-rhubarb.ts`)  
  Consulta la API oficial de GitHub Releases de **Rhubarb Lip Sync**, descarga la versión para macOS, extrae el binario en `/bin/rhubarb` (junto con sus modelos acústicos `res/`) y aplica permisos `chmod +x`.

### 3. Cerebro IA: Etapa 0 (Ideación) y Etapa 1 (Director JSON)
- **`npm run ideate -- --niche "<Tu nicho>" --count 5`** (`tsx src/cli/ideate.ts`)  
  Genera un lote de ideas virales validadas con `IdeaBriefSchema` (con `hook` para los primeros 5 segundos, `hardStats` comparativos y `humorAngles` irónicos) y las almacena ordenadas por `viralScore` en `/src/generated/ideas_backlog.json`.
- **`npm run generate-script`** / **`npm run generate:script`** (`tsx src/cli/generate-script.ts`)  
  Toma la idea en estado `"pending"` con mayor `viralScore` de `/src/generated/ideas_backlog.json`, invoca al Director IA (`src/pipeline/director.ts`) aplicando las reglas de retención (escenas <= 8s, `zoom_in_fast` en datos, `shake` en humor, iconos de `lucide-react`) y guarda el guion en `/src/generated/current_episode.json`.

### 4. Tubería de Audio, Orquestación End-to-End y Renderizado M5
- **`npm run test:audio`** (`tsx src/cli/test-audio.ts`)  
  Prueba de integración secuencial que toma `/src/mocks/sample_episode.json`, genera los audios `.wav` en `/public/generated/`, recalcula `durationInFrames = Math.ceil(duration * fps)`, extrae `mouthCues` y guarda `/src/mocks/sample_episode_with_audio.json`.
- **`npm run produce`** (`tsx src/cli/produce.ts`)  
  **Orquestador Maestro End-to-End**. Ejecuta secuencialmente (para evitar picos de memoria en los 16 GB de RAM del M5):
  1. `1. Generando Guion JSON...` (o carga manual con `--from-json <path>`)
  2. `2. Procesando TTS...`
  3. `3. Extrayendo Lip-Sync con Rhubarb...`
  4. `4. Consolidando Assets...` (actualiza `/src/generated/current_episode.json`)
  5. `5. Renderizando MP4 con Remotion...`
  ```bash
  # Flujo completo desde el backlog de ideas hasta el MP4 final:
  npm run produce

  # Renderizar a partir de un guion JSON específico o editado a mano:
  npm run produce -- --from-json src/mocks/sample_episode.json
  ```
- **`npm run render`** (`tsx src/cli/render.ts`) / **`npm run build`**  
  Ejecuta únicamente el renderizado de video en Remotion hacia la carpeta `/out/` aplicando las banderas de optimización para Apple Silicon M5 (`--concurrency=3`, `--codec=h264`, `1920x1080` @ `30fps`).
  ```bash
  npm run render -- --from-json src/generated/current_episode.json --output out/episode.mp4
  ```

---

## Optimizaciones Clave para Apple Silicon M5 (16 GB RAM)

1. **Procesamiento Secuencial (`for...of`):** Las etapas de síntesis de voz (TTS), conversión PCM (`afconvert`) y extracción de visemas (Rhubarb) se ejecutan estrictamente una escena tras otra, evitando lanzar procesos hijos concurrentes que saturen la memoria unificada.
2. **Concurrencia de Render Limitada (`concurrency: 3`):** Limita a 3 las pestañas simultáneas de Chromium Headless durante `remotion render`, logrando un balance óptimo entre los núcleos de rendimiento del M5 y un consumo de RAM estable (< 8 GB).
3. **`calculateMetadata` Asíncrono:** `src/remotion/Root.tsx` calcula dinámicamente la suma exacta de `durationInFrames` de todas las escenas de `/src/generated/current_episode.json`, impidiendo cortes prematuros o frames en negro al final del MP4.
