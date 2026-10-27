import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import type { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

dotenv.config();

export type LLMProviderName = 'agy' | 'anthropic';

export interface StructuredLLMRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  schemaName?: string;
  temperature?: number;
  provider?: LLMProviderName;
  /**
   * Generador determinista de respaldo para desarrollo local cuando el proveedor no está disponible.
   * Su salida también pasa obligatoriamente por `schema.parse()`.
   */
  fallbackGenerator?: () => T;
}

/**
 * Contrato común para todos los proveedores LLM con salida estructurada.
 */
export interface StructuredLLMProvider {
  readonly name: LLMProviderName;
  generate<T>(
    req: StructuredLLMRequest<T>,
    jsonSchemaObj: Record<string, unknown>
  ): Promise<T>;
}

/**
 * Extrae estrictamente el bloque JSON de una salida de texto que puede contener
 * Markdown (```json ... ```) o texto conversacional antes/después del JSON.
 *
 * Estrategia:
 * 1. Si existe un bloque de código cercado, se prioriza su contenido.
 * 2. Se aplica la expresión regular `/\{[\s\S]*\}|\[[\s\S]*\]/` para capturar
 *    desde la primera `{` o `[` hasta la última `}` o `]` correspondiente.
 */
export function extractJsonBlock(rawOutput: string): string {
  const trimmed = rawOutput.trim();

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

  const jsonMatch = candidate.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(
      `No se encontró ningún bloque JSON en la salida del LLM. Inicio de la salida: "${trimmed.slice(0, 200)}"`
    );
  }
  return jsonMatch[0];
}

/**
 * Limpia la salida, ejecuta `JSON.parse()` y valida contra el esquema Zod.
 */
function parseAndValidate<T>(
  rawOutput: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): T {
  const jsonText = extractJsonBlock(rawOutput);
  const parsed: unknown = JSON.parse(jsonText);
  return schema.parse(parsed);
}

/**
 * Resuelve el proveedor activo a partir de `LLM_PROVIDER` en `.env`.
 * Por defecto: `agy` (CLI nativo de Antigravity).
 */
export function resolveLLMProvider(override?: string): LLMProviderName {
  const raw = (override ?? process.env.LLM_PROVIDER ?? 'agy')
    .toLowerCase()
    .trim();
  if (raw === 'anthropic' || raw === 'claude') {
    return 'anthropic';
  }
  return 'agy';
}

// ============================================================================
// PROVEEDOR 1 (POR DEFECTO): CLI nativo de Antigravity (`agy -p`)
// ============================================================================

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

/**
 * Wrapper asíncrono de `child_process.spawn` (sin shell, por lo que no hay
 * problemas de escape de comillas en prompts largos).
 */
function spawnAsync(
  command: string,
  args: string[],
  timeoutMs: number
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
          }, timeoutMs)
        : null;

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      if (timer) clearTimeout(timer);
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            `No se encontró el binario "${command}". Instala el CLI de Antigravity o define AGY_BIN en .env con la ruta absoluta.`
          )
        );
        return;
      }
      reject(err);
    });

    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (timedOut) {
        reject(
          new Error(`El CLI "${command}" superó el tiempo límite de ${timeoutMs / 1000}s.`)
        );
        return;
      }
      resolve({ stdout, stderr, code });
    });
  });
}

function resolveAgyExecutable(customBin?: string): string {
  if (customBin && customBin.trim().length > 0) {
    return customBin.trim();
  }
  if (process.env.AGY_BIN && process.env.AGY_BIN.trim().length > 0) {
    return process.env.AGY_BIN.trim();
  }

  const candidates = [
    path.join(process.env.HOME || '', '.local/bin/agy'),
    '/usr/local/bin/agy',
    '/opt/homebrew/bin/agy',
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'agy';
}

/**
 * Proveedor LLM basado en el CLI nativo de Antigravity en modo headless:
 *   agy -p "<prompt>" --output-format text --disable-slash-commands
 *
 * Variables de entorno opcionales:
 * - `AGY_BIN`              Ruta del ejecutable (por defecto autodetectado en ~/.local/bin/agy).
 * - `AGY_MODEL`            Modelo a usar (por defecto `gemini-3.8-flash-low`).
 * - `AGY_TIMEOUT_MS`       Tiempo límite del proceso (por defecto 180000 ms).
 * - `AGY_USE_JSON_SCHEMA`  Si es `true`, envía además `--json-schema` para forzar salida estructurada.
 */
export class AgyCliProvider implements StructuredLLMProvider {
  readonly name: LLMProviderName = 'agy';
  private readonly bin: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly useJsonSchemaFlag: boolean;

  constructor(options?: {
    bin?: string;
    model?: string;
    timeoutMs?: number;
    useJsonSchemaFlag?: boolean;
  }) {
    this.bin = resolveAgyExecutable(options?.bin);
    this.model =
      options?.model ??
      process.env.AGY_MODEL?.trim() ??
      'gemini-3.8-flash-low';
    this.timeoutMs =
      options?.timeoutMs ?? Number(process.env.AGY_TIMEOUT_MS ?? 180000);
    this.useJsonSchemaFlag =
      options?.useJsonSchemaFlag ??
      process.env.AGY_USE_JSON_SCHEMA?.toLowerCase() === 'true';
  }

  /**
   * Construye un único prompt autocontenido con System Prompt + JSON Schema + tarea.
   */
  private buildPrompt(
    systemPrompt: string,
    userPrompt: string,
    jsonSchemaObj: Record<string, unknown>
  ): string {
    return [
      '### INSTRUCCIONES DE SISTEMA',
      systemPrompt.trim(),
      '',
      '### FORMATO DE RESPUESTA OBLIGATORIO',
      'Responde ÚNICAMENTE con un objeto JSON válido que cumpla estrictamente el siguiente JSON Schema.',
      'No incluyas explicaciones, saludos ni texto adicional. No uses herramientas ni modifiques archivos.',
      JSON.stringify(jsonSchemaObj, null, 2),
      '',
      '### TAREA',
      userPrompt.trim(),
    ].join('\n');
  }

  async generate<T>(
    req: StructuredLLMRequest<T>,
    jsonSchemaObj: Record<string, unknown>
  ): Promise<T> {
    const prompt = this.buildPrompt(
      req.systemPrompt,
      req.userPrompt,
      jsonSchemaObj
    );

    const args = [
      '-p',
      prompt,
      '--output-format',
      'text',
      '--disable-slash-commands',
    ];
    if (this.model) {
      args.push('--model', this.model);
    }
    if (this.useJsonSchemaFlag) {
      args.push('--json-schema', JSON.stringify(jsonSchemaObj));
    }

    console.log(
      `🤖 [LLM · Antigravity CLI] Ejecutando "${this.bin} -p ..."${this.model ? ` (modelo: ${this.model})` : ''}...`
    );

    const { stdout, stderr, code } = await spawnAsync(
      this.bin,
      args,
      this.timeoutMs
    );

    if (code !== 0) {
      throw new Error(
        `El CLI "${this.bin}" finalizó con código ${code}. stderr: ${stderr.trim().slice(0, 400)}`
      );
    }
    if (!stdout.trim()) {
      throw new Error(`El CLI "${this.bin}" devolvió una salida vacía.`);
    }

    return parseAndValidate(stdout, req.schema);
  }
}

// ============================================================================
// PROVEEDOR 2 (OPCIONAL): Claude 3.5 Sonnet vía @anthropic-ai/sdk (Tool Use)
// ============================================================================

export class AnthropicProvider implements StructuredLLMProvider {
  readonly name: LLMProviderName = 'anthropic';

  async generate<T>(
    req: StructuredLLMRequest<T>,
    jsonSchemaObj: Record<string, unknown>
  ): Promise<T> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está definida en el entorno (.env).');
    }

    const anthropic = new Anthropic({ apiKey });
    const toolName = req.schemaName ?? 'structured_json_output';

    const inputSchema: Anthropic.Tool.InputSchema = {
      type: 'object',
      ...(typeof jsonSchemaObj.properties === 'object' &&
      jsonSchemaObj.properties !== null
        ? { properties: jsonSchemaObj.properties }
        : {}),
      ...(Array.isArray(jsonSchemaObj.required)
        ? { required: jsonSchemaObj.required as string[] }
        : {}),
    };

    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 4096,
      temperature: req.temperature ?? 0.7,
      system: req.systemPrompt,
      tools: [
        {
          name: toolName,
          description:
            'Devuelve la respuesta estructurada cumpliendo exactamente el esquema JSON requerido.',
          input_schema: inputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: req.userPrompt }],
    });

    const toolBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );
    if (toolBlock && toolBlock.input) {
      return req.schema.parse(toolBlock.input);
    }

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text'
    );
    if (textBlock?.text) {
      return parseAndValidate(textBlock.text, req.schema);
    }

    throw new Error('Claude 3.5 Sonnet no devolvió un bloque estructurado válido.');
  }
}

/**
 * Fábrica de proveedores LLM. `AgyCliProvider` es el proveedor por defecto.
 */
export function createLLMProvider(name?: string): StructuredLLMProvider {
  const resolved = resolveLLMProvider(name);
  return resolved === 'anthropic' ? new AnthropicProvider() : new AgyCliProvider();
}

/**
 * Función agnóstica de generación estructurada.
 * Usa `AgyCliProvider` por defecto (o Anthropic si `LLM_PROVIDER=anthropic`) y
 * garantiza que el resultado cumpla el contrato Zod `req.schema`.
 */
export async function generateStructuredOutput<T>(
  req: StructuredLLMRequest<T>
): Promise<T> {
  const provider = createLLMProvider(req.provider);
  const rawJsonSchema = zodToJsonSchema(req.schema, {
    name: req.schemaName,
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  const jsonSchemaObj =
    rawJsonSchema.definitions &&
    req.schemaName &&
    typeof rawJsonSchema.definitions === 'object' &&
    req.schemaName in (rawJsonSchema.definitions as Record<string, unknown>)
      ? ((rawJsonSchema.definitions as Record<string, unknown>)[
          req.schemaName
        ] as Record<string, unknown>)
      : rawJsonSchema;

  try {
    return await provider.generate(req, jsonSchemaObj);
  } catch (error) {
    if (req.fallbackGenerator) {
      console.warn(
        `⚠️ Conector LLM [${provider.name}] aviso (${(error as Error).message}). Usando generador estructurado de respaldo validado con Zod.`
      );
      return req.schema.parse(req.fallbackGenerator());
    }
    throw error;
  }
}
