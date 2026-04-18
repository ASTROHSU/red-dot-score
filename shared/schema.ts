import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  baseScore: integer("base_score").notNull().default(60),
  exchangeRate: integer("exchange_rate").notNull().default(5),
  state: jsonb("state").notNull().$type<{
    players: { id: number; name: string }[];
    gameHistory: {
      scores: Record<string, number>;
      isDouble: boolean;
      rawScores: Record<string, number>;
    }[];
  }>().default({
    players: [
      { id: 1, name: '玩家 1' },
      { id: 2, name: '玩家 2' },
      { id: 3, name: '玩家 3' },
      { id: 4, name: '玩家 4' }
    ],
    gameHistory: []
  }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).pick({
  code: true,
  baseScore: true,
  exchangeRate: true,
  state: true,
});

export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type UpdateGameRequest = Partial<InsertGame>;
