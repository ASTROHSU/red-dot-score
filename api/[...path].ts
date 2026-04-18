import { z } from "zod";
import { storage } from "../server/storage";
import { api } from "../shared/routes";

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

export default async function handler(req: any, res: any): Promise<void> {
  const path = normalizePath(req.query?.path);

  if (
    req.method === api.games.create.method &&
    path.length === 1 &&
    path[0] === "games"
  ) {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const game = await storage.createGame({
        code,
        baseScore: 60,
        exchangeRate: 5,
        state: {
          players: [
            { id: 1, name: "玩家 1" },
            { id: 2, name: "玩家 2" },
            { id: 3, name: "玩家 3" },
            { id: 4, name: "玩家 4" },
          ],
          gameHistory: [],
        },
      });

      res.status(201).json(game);
      return;
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create game" });
      return;
    }
  }

  if (path.length === 2 && path[0] === "games") {
    const code = path[1];

    if (req.method === api.games.get.method) {
      const game = await storage.getGameByCode(code);
      if (!game) {
        res.status(404).json({ message: "Game not found" });
        return;
      }

      res.status(200).json(game);
      return;
    }

    if (req.method === api.games.update.method) {
      try {
        const input = api.games.update.input.parse(parseBody(req.body));
        const game = await storage.updateGame(code, input);
        res.status(200).json(game);
        return;
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            message: error.errors[0]?.message ?? "Invalid request body",
            field: error.errors[0]?.path.join("."),
          });
          return;
        }

        res.status(404).json({ message: "Game not found" });
        return;
      }
    }
  }

  res.status(404).json({ message: "Not found" });
}
