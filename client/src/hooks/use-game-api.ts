import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

// Fetch Daily Challenge Info
export function useDailyChallenge() {
  return useQuery({
    queryKey: [api.daily.get.path],
    queryFn: async () => {
      const res = await fetch(api.daily.get.path);
      if (!res.ok) throw new Error("Failed to fetch daily challenge");
      return api.daily.get.responses[200].parse(await res.json());
    },
  });
}

// Start Run
export function useStartRun() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.runs.start.input>) => {
      const res = await fetch(api.runs.start.path, {
        method: api.runs.start.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to start run");
      return api.runs.start.responses[200].parse(await res.json());
    },
  });
}

// Submit Run
export function useSubmitRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.runs.submit.input>) => {
      const res = await fetch(api.runs.submit.path, {
        method: api.runs.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
           const err = await res.json();
           throw new Error(err.message || "Validation failed");
        }
        throw new Error("Failed to submit run");
      }
      return api.runs.submit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.leaderboard.daily.path] });
    },
  });
}

// Get Leaderboard
export function useLeaderboard() {
  return useQuery({
    queryKey: [api.leaderboard.daily.path],
    queryFn: async () => {
      const res = await fetch(api.leaderboard.daily.path);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return api.leaderboard.daily.responses[200].parse(await res.json());
    },
  });
}
