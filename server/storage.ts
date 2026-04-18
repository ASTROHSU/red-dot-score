import { db, hasDatabase } from "./db";
import {
  games,
  type InsertGame,
  type UpdateGameRequest,
  type Game,
} from "@shared/schema";
import { eq } from "drizzle-orm";

type GameState = Game["state"];

function createDefaultState(): GameState {
  return {
    players: [
      { id: 1, name: "玩家 1" },
      { id: 2, name: "玩家 2" },
      { id: 3, name: "玩家 3" },
      { id: 4, name: "玩家 4" },
    ],
    gameHistory: [],
  };
}

function isGameState(value: unknown): value is GameState {
  if (
    typeof value !== "object" ||
    value === null ||
    !("players" in value) ||
    !("gameHistory" in value)
  ) {
    return false;
  }

  const { players, gameHistory } = value as {
    players: unknown;
    gameHistory: unknown;
  };

  if (
    !Array.isArray(players) ||
    players.some(
      (player) =>
        typeof player !== "object" ||
        player === null ||
        typeof (player as { id?: unknown }).id !== "number" ||
        typeof (player as { name?: unknown }).name !== "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(gameHistory) ||
    gameHistory.some(
      (round) =>
        typeof round !== "object" ||
        round === null ||
        typeof (round as { scores?: unknown }).scores !== "object" ||
        (round as { scores?: unknown }).scores === null ||
        typeof (round as { rawScores?: unknown }).rawScores !== "object" ||
        (round as { rawScores?: unknown }).rawScores === null ||
        typeof (round as { isDouble?: unknown }).isDouble !== "boolean",
    )
  ) {
    return false;
  }

  return true;
}

function toGameState(value: unknown): GameState {
  return isGameState(value) ? value : createDefaultState();
}

export interface IStorage {
  createGame(game: InsertGame): Promise<Game>;
  getGameByCode(code: string): Promise<Game | undefined>;
  updateGame(code: string, updates: UpdateGameRequest): Promise<Game>;
}

export class DatabaseStorage implements IStorage {
  async createGame(insertGame: InsertGame): Promise<Game> {
    if (!db) {
      throw new Error("Database is not available");
    }

    const values: typeof games.$inferInsert = {
      code: insertGame.code,
      baseScore: insertGame.baseScore ?? 60,
      exchangeRate: insertGame.exchangeRate ?? 5,
      state: toGameState(insertGame.state),
    };

    const [game] = await db.insert(games).values(values).returning();
    return game;
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    if (!db) {
      throw new Error("Database is not available");
    }
    const [game] = await db.select().from(games).where(eq(games.code, code));
    return game;
  }

  async updateGame(code: string, updates: UpdateGameRequest): Promise<Game> {
    if (!db) {
      throw new Error("Database is not available");
    }

    const updatePayload: Partial<typeof games.$inferInsert> = {
      lastUpdated: new Date(),
    };

    if (updates.baseScore !== undefined) {
      updatePayload.baseScore = updates.baseScore;
    }

    if (updates.exchangeRate !== undefined) {
      updatePayload.exchangeRate = updates.exchangeRate;
    }

    if (updates.state !== undefined) {
      updatePayload.state = toGameState(updates.state);
    }

    const [updated] = await db.update(games)
      .set(updatePayload)
      .where(eq(games.code, code))
      .returning();

    if (!updated) {
      throw new Error("Game not found");
    }

    return updated;
  }
}

class MemoryStorage implements IStorage {
  private gamesByCode = new Map<string, Game>();
  private nextId = 1;

  async createGame(insertGame: InsertGame): Promise<Game> {
    const game: Game = {
      id: this.nextId++,
      code: insertGame.code,
      baseScore: insertGame.baseScore ?? 60,
      exchangeRate: insertGame.exchangeRate ?? 5,
      state: toGameState(insertGame.state),
      lastUpdated: new Date(),
    };

    this.gamesByCode.set(game.code, game);
    return game;
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    return this.gamesByCode.get(code);
  }

  async updateGame(code: string, updates: UpdateGameRequest): Promise<Game> {
    const existing = this.gamesByCode.get(code);
    if (!existing) {
      throw new Error("Game not found");
    }

    const updated: Game = {
      ...existing,
      code: existing.code,
      id: existing.id,
      baseScore: updates.baseScore ?? existing.baseScore,
      exchangeRate: updates.exchangeRate ?? existing.exchangeRate,
      state:
        updates.state !== undefined
          ? toGameState(updates.state)
          : existing.state,
      lastUpdated: new Date(),
    };

    this.gamesByCode.set(code, updated);
    return updated;
  }
}

if (!hasDatabase) {
  console.warn(
    "[storage] DATABASE_URL is not set. Falling back to in-memory storage.",
  );
}

export const storage: IStorage = hasDatabase
  ? new DatabaseStorage()
  : new MemoryStorage();
