import { db } from "./db";
import { games, type InsertGame, type UpdateGameRequest, type Game } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  getGameByCode(code: string): Promise<Game | undefined>;
  updateGame(code: string, updates: UpdateGameRequest): Promise<Game>;
}

export class DatabaseStorage implements IStorage {
  async createGame(insertGame: InsertGame): Promise<Game> {
    const [game] = await db.insert(games).values(insertGame).returning();
    return game;
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.code, code));
    return game;
  }

  async updateGame(code: string, updates: UpdateGameRequest): Promise<Game> {
    const [updated] = await db.update(games)
      .set({
        ...updates,
        lastUpdated: new Date(),
      })
      .where(eq(games.code, code))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
