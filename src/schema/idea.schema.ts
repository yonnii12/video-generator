import { z } from 'zod';

export const HardStatSchema = z.object({
  value: z.string().min(1, 'El valor estadístico es requerido'),
  label: z.string().min(1, 'La etiqueta de la estadística es requerida'),
  comparison: z.string().min(1, 'La comparación de contexto es requerida'),
});

export const IdeaStatusSchema = z.enum(['pending', 'approved', 'produced']);

export const IdeaBriefSchema = z.object({
  id: z.string().min(1, 'El ID de la idea es requerido'),
  title: z.string().min(1, 'El título es requerido'),
  viralScore: z
    .number()
    .int()
    .min(1, 'El viralScore mínimo es 1')
    .max(100, 'El viralScore máximo es 100'),
  status: IdeaStatusSchema,
  hook: z.string().min(1, 'El hook inicial es requerido'),
  hardStats: z.array(HardStatSchema),
  humorAngles: z.array(z.string().min(1)),
});

export type HardStat = z.infer<typeof HardStatSchema>;
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;
export type IdeaBrief = z.infer<typeof IdeaBriefSchema>;
