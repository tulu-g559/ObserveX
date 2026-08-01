import axios from "axios";
import { ActivityDetail, ActivityEvent, AIResult, SessionItem, Stats } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

export const api = {
  listActivities: async (limit = 50, offset = 0): Promise<ActivityEvent[]> => {
    const { data } = await apiClient.get<ActivityEvent[]>("/activities", { params: { limit, offset } });
    return data;
  },
  getActivity: async (id: string): Promise<ActivityDetail> => {
    const { data } = await apiClient.get<ActivityDetail>(`/activity/${id}`);
    return data;
  },
  listSessions: async (): Promise<SessionItem[]> => {
    const { data } = await apiClient.get<SessionItem[]>("/sessions");
    return data;
  },
  getStats: async (): Promise<Stats> => {
    const { data } = await apiClient.get<Stats>("/stats");
    return data;
  },
  search: async (q: string): Promise<AIResult[]> => {
    const { data } = await apiClient.get<AIResult[]>("/search", { params: { q } });
    return data;
  },
};
