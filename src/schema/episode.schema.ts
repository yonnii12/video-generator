import { z } from 'zod';

export const SpeakerSchema = z.enum(['narrator', 'character_b']);

export const CharacterPoseSchema = z.enum([
  'neutral',
  'explaining',
  'shocked',
  'sarcastic',
  'angry',
  'dizzy',
]);

export const CameraActionSchema = z.enum([
  'static',
  'zoom_in_slow',
  'zoom_in_fast',
  'shake',
  'pan_left',
]);

export const SfxSchema = z.enum([
  'whoosh',
  'pop',
  'ding',
  'record_scratch',
  'none',
]);

export const MouthVisemeSchema = z.enum([
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'X',
]);

export const MouthCueSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  value: MouthVisemeSchema,
});

export const WordTimestampSchema = z.object({
  word: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

// Plantillas visuales (Unión Discriminada por "type")
export const CharacterFocusTemplateSchema = z.object({
  type: z.literal('character_focus'),
  headline: z.string().min(1),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  accentColor: z.string().default('#38bdf8'),
});

export const SplitPanelSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  highlightColor: z.string().default('#38bdf8'),
});

export const InfographicSplitTemplateSchema = z.object({
  type: z.literal('infographic_split'),
  title: z.string().min(1),
  leftPanel: SplitPanelSchema,
  rightPanel: SplitPanelSchema,
  versusTag: z.string().default('VS'),
});

export const InfographicCounterTemplateSchema = z.object({
  type: z.literal('infographic_counter'),
  title: z.string().min(1),
  fromValue: z.number().default(0),
  toValue: z.number(),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
  decimals: z.number().int().min(0).max(4).default(0),
  label: z.string().min(1),
  comparisonText: z.string().min(1),
  icon: z.string().optional(),
  accentColor: z.string().default('#f59e0b'),
});

export const InfographicListItemSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
  tag: z.string().optional(),
  icon: z.string().optional(),
});

export const InfographicListTemplateSchema = z.object({
  type: z.literal('infographic_list'),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  items: z.array(InfographicListItemSchema).min(1),
  accentColor: z.string().default('#a855f7'),
});

export const VisualTemplateSchema = z.discriminatedUnion('type', [
  CharacterFocusTemplateSchema,
  InfographicSplitTemplateSchema,
  InfographicCounterTemplateSchema,
  InfographicListTemplateSchema,
]);

export const SceneSchema = z.object({
  id: z.string().min(1),
  dialogue: z.string().min(1),
  speaker: SpeakerSchema,
  durationInFrames: z.number().int().positive(),
  characterPose: CharacterPoseSchema,
  cameraAction: CameraActionSchema,
  sfx: SfxSchema,
  audioUrl: z.string().optional(),
  mouthCues: z.array(MouthCueSchema),
  wordTimestamps: z.array(WordTimestampSchema),
  visualTemplate: VisualTemplateSchema,
});

export const EpisodeSchema = z.object({
  title: z.string().min(1),
  fps: z.number().int().positive().default(30),
  width: z.literal(1920).default(1920),
  height: z.literal(1080).default(1080),
  scenes: z.array(SceneSchema).min(1),
});

export type Speaker = z.infer<typeof SpeakerSchema>;
export type CharacterPose = z.infer<typeof CharacterPoseSchema>;
export type CameraAction = z.infer<typeof CameraActionSchema>;
export type SfxType = z.infer<typeof SfxSchema>;
export type MouthViseme = z.infer<typeof MouthVisemeSchema>;
export type MouthCue = z.infer<typeof MouthCueSchema>;
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type CharacterFocusTemplate = z.infer<typeof CharacterFocusTemplateSchema>;
export type InfographicSplitTemplate = z.infer<typeof InfographicSplitTemplateSchema>;
export type InfographicCounterTemplate = z.infer<typeof InfographicCounterTemplateSchema>;
export type InfographicListTemplate = z.infer<typeof InfographicListTemplateSchema>;
export type VisualTemplate = z.infer<typeof VisualTemplateSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
