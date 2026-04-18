import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.games.create.path, async (req, res) => {
    try {
      // Generate a random 6-character code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const game = await storage.createGame({
        code,
        baseScore: 60,
        exchangeRate: 5,
        state: {
          players: [
            { id: 1, name: '玩家 1' },
            { id: 2, name: '玩家 2' },
            { id: 3, name: '玩家 3' },
            { id: 4, name: '玩家 4' }
          ],
          gameHistory: []
        }
      });
      res.status(201).json(game);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.get(api.games.get.path, async (req, res) => {
    const game = await storage.getGameByCode(req.params.code);
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    res.json(game);
  });

  app.patch(api.games.update.path, async (req, res) => {
    try {
      const input = api.games.update.input.parse(req.body);
      const game = await storage.updateGame(req.params.code, input);
      res.json(game);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      return res.status(404).json({ message: 'Game not found' });
    }
  });

  return httpServer;
}
