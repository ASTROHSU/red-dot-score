import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Re-export types for convenience
import type { Game, UpdateGameRequest } from "@shared/schema";

export function useGame(code?: string) {
  return useQuery({
    queryKey: [api.games.get.path, code],
    queryFn: async () => {
      if (!code) return null;
      const url = buildUrl(api.games.get.path, { code });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch game");
      return await res.json() as Game;
    },
    enabled: !!code,
    refetchInterval: 3000, // Poll every 3 seconds for updates
  });
}

export function useCreateGame() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.games.create.path, {
        method: api.games.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to create game");
      return await res.json() as Game;
    },
    onSuccess: (data) => {
      toast({
        title: "Game Created!",
        description: `Game code: ${data.code}`,
      });
      setLocation(`/game?code=${data.code}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create a new game.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ code, ...updates }: { code: string } & UpdateGameRequest) => {
      const url = buildUrl(api.games.update.path, { code });
      const res = await fetch(url, {
        method: api.games.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      
      if (!res.ok) throw new Error("Failed to update game");
      return await res.json() as Game;
    },
    onSuccess: (data) => {
      // Invalidate query to refetch fresh data
      queryClient.setQueryData([api.games.get.path, data.code], data);
      queryClient.invalidateQueries({ queryKey: [api.games.get.path, data.code] });
    },
    onError: () => {
      toast({
        title: "Sync Error",
        description: "Failed to save changes to the server.",
        variant: "destructive",
      });
    },
  });
}
