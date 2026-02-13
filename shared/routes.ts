import { z } from 'zod';
import { insertUserSchema, insertRunSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    guest: {
      method: 'POST' as const,
      path: '/api/auth/guest' as const,
      responses: {
        200: z.object({
          user: z.object({
            id: z.number(),
            username: z.string(),
          }),
          token: z.string(),
        }),
      },
    },
  },
  daily: {
    get: {
      method: 'GET' as const,
      path: '/api/daily' as const,
      responses: {
        200: z.object({
          date: z.string(),
          seed: z.string(),
          message: z.string().optional(),
        }),
      },
    },
  },
  runs: {
    start: {
      method: 'POST' as const,
      path: '/api/runs/start' as const,
      input: z.object({
        mode: z.enum(['daily', 'practice']),
        seed: z.string(),
      }),
      responses: {
        200: z.object({
          runId: z.number().optional(), // Optional for practice, required for daily tracking
          serverNonce: z.string(),
        }),
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/runs/submit' as const,
      input: z.object({
        mode: z.enum(['daily', 'practice']),
        seed: z.string(),
        serverNonce: z.string(),
        result: z.object({
          score: z.number(),
          gems: z.number(),
          timeMs: z.number(),
          won: z.boolean(),
          history: z.array(z.object({
            tick: z.number(),
            input: z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT', 'WAIT']),
          })),
        }),
      }),
      responses: {
        200: z.object({
          valid: z.boolean(),
          newHighScore: z.boolean(),
          rank: z.number().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  leaderboard: {
    daily: {
      method: 'GET' as const,
      path: '/api/leaderboard/daily' as const,
      responses: {
        200: z.array(z.object({
          username: z.string(),
          score: z.number(),
          timeMs: z.number(),
          rank: z.number(),
        })),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
