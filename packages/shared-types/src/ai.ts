import { z } from 'zod';

/**
 * What the trip planner model returns: it only arranges candidates the API offered (by
 * `ref`) and writes notes. Times, temples and aarti come from the database, never the model.
 */
export const itineraryPlanSchema = z
  .object({
    title: z.string().min(1).max(120),
    days: z
      .array(
        z
          .object({
            dayIndex: z.number().int().min(0).max(13),
            note: z.string().max(500).nullable(),
            items: z
              .array(
                z
                  .object({ ref: z.string().min(1).max(20), note: z.string().max(300).nullable() })
                  .strict(),
              )
              .max(14),
          })
          .strict(),
      )
      .max(14),
  })
  .strict();
export type ItineraryPlan = z.infer<typeof itineraryPlanSchema>;

/** JSON Schema twin of itineraryPlanSchema for structured-output requests. */
export const itineraryPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'days'],
  properties: {
    title: { type: 'string' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dayIndex', 'note', 'items'],
        properties: {
          dayIndex: { type: 'integer' },
          note: { type: ['string', 'null'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['ref', 'note'],
              properties: { ref: { type: 'string' }, note: { type: ['string', 'null'] } },
            },
          },
        },
      },
    },
  },
} as const;

/** Server-sent events on POST /v1/ai/chat/sessions/:id/messages. */
export const AI_CHAT_EVENTS = ['token', 'citation', 'done', 'error'] as const;
export type AiChatEvent = (typeof AI_CHAT_EVENTS)[number];

export interface AiCitation {
  n: number;
  documentId: string;
  title: string;
  sourceRef: string | null;
}
