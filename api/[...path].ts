import pg from "pg";

function normalizePath(pathParam: unknown): string[] {
  if (Array.isArray(pathParam)) {
    return pathParam.filter((part): part is string => typeof part === "string");
  }

  if (typeof pathParam === "string") {
    return [pathParam];
  }

  return [];
}

function parseBody(body: unknown): unknown {
  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

type GameState = {
  players: { id: number; name: string }[];
  gameHistory: {
    scores: Record<string, number>;
    isDouble: boolean;
    rawScores: Record<string, number>;
  }[];
};

type Game = {
  id: number;
  code: string;
  baseScore: number;
  exchangeRate: number;
  state: GameState;
  lastUpdated: string | Date | null;
};

const defaultState = (): GameState => ({
  players: [
    { id: 1, name: "玩家 1" },
    { id: 2, name: "玩家 2" },
    { id: 3, name: "玩家 3" },
    { id: 4, name: "玩家 4" },
  ],
  gameHistory: [],
});

const memoryGames = new Map<string, Game>();
let memoryNextId = 1;
let pool: pg.Pool | null = null;

function toGame(row: any): Game {
  return {
    id: row.id,
    code: row.code,
    baseScore: row.base_score ?? row.baseScore,
    exchangeRate: row.exchange_rate ?? row.exchangeRate,
    state:
      typeof row.state === "string" ? JSON.parse(row.state) : (row.state as GameState),
    lastUpdated: row.last_updated ?? row.lastUpdated ?? null,
  };
}

function getPool(): pg.Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!pool) {
    const { Pool } = pg;
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  return pool;
}

async function createGame(): Promise<Game> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const db = getPool();

  if (!db) {
    const game: Game = {
      id: memoryNextId++,
      code,
      baseScore: 60,
      exchangeRate: 5,
      state: defaultState(),
      lastUpdated: new Date(),
    };
    memoryGames.set(code, game);
    return game;
  }

  const result = await db.query(
    `
    INSERT INTO games (code, base_score, exchange_rate, state, last_updated)
    VALUES ($1, $2, $3, $4::jsonb, NOW())
    RETURNING id, code, base_score, exchange_rate, state, last_updated
    `,
    [code, 60, 5, JSON.stringify(defaultState())],
  );

  return toGame(result.rows[0]);
}

async function getGame(code: string): Promise<Game | undefined> {
  const db = getPool();
  if (!db) {
    return memoryGames.get(code);
  }

  const result = await db.query(
    `
    SELECT id, code, base_score, exchange_rate, state, last_updated
    FROM games
    WHERE code = $1
    `,
    [code],
  );

  if (!result.rows[0]) {
    return undefined;
  }

  return toGame(result.rows[0]);
}

async function updateGame(
  code: string,
  updates: Partial<{
    baseScore: number;
    exchangeRate: number;
    state: GameState;
  }>,
): Promise<Game | undefined> {
  const db = getPool();

  if (!db) {
    const existing = memoryGames.get(code);
    if (!existing) {
      return undefined;
    }
    const updated: Game = {
      ...existing,
      baseScore: updates.baseScore ?? existing.baseScore,
      exchangeRate: updates.exchangeRate ?? existing.exchangeRate,
      state: updates.state ?? existing.state,
      lastUpdated: new Date(),
    };
    memoryGames.set(code, updated);
    return updated;
  }

  const existing = await getGame(code);
  if (!existing) {
    return undefined;
  }

  const result = await db.query(
    `
    UPDATE games
    SET
      base_score = $2,
      exchange_rate = $3,
      state = $4::jsonb,
      last_updated = NOW()
    WHERE code = $1
    RETURNING id, code, base_score, exchange_rate, state, last_updated
    `,
    [
      code,
      updates.baseScore ?? existing.baseScore,
      updates.exchangeRate ?? existing.exchangeRate,
      JSON.stringify(updates.state ?? existing.state),
    ],
  );

  return toGame(result.rows[0]);
}

export default async function handler(req: any, res: any): Promise<void> {
  const path = normalizePath(req.query?.path);

  if (req.method === "POST" && path.length === 1 && path[0] === "games") {
    try {
      const game = await createGame();

      res.status(201).json(game);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Failed to create game",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }
  }

  if (path.length === 2 && path[0] === "games") {
    const code = path[1];

    if (req.method === "GET") {
      const game = await getGame(code);
      if (!game) {
        res.status(404).json({ message: "Game not found" });
        return;
      }

      res.status(200).json(game);
      return;
    }

    if (req.method === "PATCH") {
      try {
        const input = parseBody(req.body) as Partial<{
          baseScore: number;
          exchangeRate: number;
          state: GameState;
        }>;
        const game = await updateGame(code, input);
        if (!game) {
          res.status(404).json({ message: "Game not found" });
          return;
        }
        res.status(200).json(game);
        return;
      } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Failed to update game",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }
    }
  }

  res.status(404).json({ message: "Not found" });
}
