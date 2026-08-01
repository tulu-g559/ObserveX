import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export const useActivities = (limit = 50, offset = 0) =>
  useQuery({ queryKey: ["activities", limit, offset], queryFn: () => api.listActivities(limit, offset) });

export const useActivity = (id: string) =>
  useQuery({ queryKey: ["activity", id], queryFn: () => api.getActivity(id), enabled: !!id });

export const useSessions = () =>
  useQuery({ queryKey: ["sessions"], queryFn: api.listSessions });

export const useStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: api.getStats, refetchInterval: 30_000 });

export const useSearch = (q: string) =>
  useQuery({ queryKey: ["search", q], queryFn: () => api.search(q), enabled: q.length > 1 });
