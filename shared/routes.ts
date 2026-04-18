import { z } from 'zod';
import { insertGameSchema, games } from './schema';

export const errorSchemas = {
  notFound: z.object({ message: z.string() }),
};

export const api = {
  games: {
    create: {
      method: 'POST' as const,
      path: '/api/games' as const,
      input: z.object({}), // Creates a new game with random code
      responses: {
        201: z.custom<typeof games.$inferSelect>(),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/games/:code' as const,
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/games/:code' as const,
      input: insertGameSchema.partial(),
      responses: {
        200: z.custom<typeof games.$inferSelect>(),
        404: errorSchemas.notFound,
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

export type CreateGameResponse = z.infer<typeof api.games.create.responses[201]>;
