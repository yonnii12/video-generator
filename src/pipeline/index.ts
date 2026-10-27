export {
  AgyCliProvider,
  AnthropicProvider,
  createLLMProvider,
  extractJsonBlock,
  generateStructuredOutput,
  resolveLLMProvider,
  type LLMProviderName,
  type StructuredLLMProvider,
  type StructuredLLMRequest,
} from './llm';

export {
  IDEAS_BACKLOG_PATH,
  IdeasBatchResponseSchema,
  appendIdeasToBacklog,
  generateIdeasBatch,
  readIdeasBacklog,
  writeIdeasBacklog,
} from './ideator';

export {
  CURRENT_EPISODE_PATH,
  generateEpisodeScript,
} from './director';

export {
  EdgeTTSProvider,
  LocalTTSProvider,
  TTSFactory,
  buildProportionalWordTimestamps,
  getAudioDurationInSeconds,
  type SupportedEdgeVoice,
  type TTSAudioResult,
  type TTSProvider,
} from './tts';

export {
  generateFallbackMouthCues,
  generateMouthCues,
} from './lipsync';

export const PIPELINE_STAGES = [
  'STAGE_0_IDEATION',
  'STAGE_1_DIRECTOR_JSON',
  'STAGE_2_TTS_AUDIO',
  'STAGE_3_LIP_SYNC',
  'STAGE_4_ASSETS_SFX',
  'STAGE_5_REMOTION_RENDER',
] as const;
