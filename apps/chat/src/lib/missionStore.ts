import { create } from 'zustand';
import { MissionView, MissionEvent, AuditReport } from '@noevix/contracts';

const API_BASE = typeof window !== 'undefined' ? (window as any).API_BASE || '' : '';

export interface MissionState {
  missions: MissionView[];
  activeMissionId: string | null;
  activeMission: MissionView | null;
  events: MissionEvent[];
  afterSeq: number;
  isStreaming: boolean;
  eventSource: EventSource | null;
  audit: AuditReport | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setMissions: (missions: MissionView[]) => void;
  setActiveMission: (id: string | null) => void;
  fetchMissions: () => Promise<void>;
  fetchMission: (id: string) => Promise<void>;
  createMission: (spec: any) => Promise<string | null>;
  startSSE: (missionId: string) => void;
  stopSSE: () => void;
  fetchAudit: (missionId: string) => Promise<void>;
  cancelMission: (missionId: string) => Promise<void>;
  resumeMission: (missionId: string) => Promise<void>;
  approvePlan: (missionId: string, approvalId: string, note?: string) => Promise<void>;
  rejectPlan: (missionId: string, approvalId: string, note?: string) => Promise<void>;
  setError: (err: string | null) => void;
  setLoading: (loading: boolean) => void;
}

async function api(path: string, options: RequestInit = {}): Promise<any> {
  const base = API_BASE || 'http://localhost:3001';
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${errText}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const useMissionStore = create<MissionState>((set, get) => ({
  missions: [],
  activeMissionId: null,
  activeMission: null,
  events: [],
  afterSeq: 0,
  isStreaming: false,
  eventSource: null,
  audit: null,
  isLoading: false,
  error: null,

  setMissions: (missions) => set({ missions }),
  setActiveMission: (id) => set({ activeMissionId: id, activeMission: null, events: [], afterSeq: 0, audit: null }),
  setError: (err) => set({ error: err }),
  setLoading: (loading) => set({ isLoading: loading }),

  fetchMissions: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api('/v1/missions');
      set({ missions: data.missions || [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchMission: async (id) => {
    set({ isLoading: true, error: null, activeMissionId: id });
    try {
      const data = await api(`/v1/missions/${id}`);
      set({ activeMission: data.mission, isLoading: false });
      if (data.mission) {
        set({ afterSeq: 0, events: [] });
      }
    } catch (err: any) {
      set({ error: err.message, isLoading: false, activeMission: null });
    }
  },

  createMission: async (spec) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api('/v1/missions', {
        method: 'POST',
        body: JSON.stringify(spec),
      });
      set({ isLoading: false });
      return data.mission_id || null;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      return null;
    }
  },

  startSSE: (missionId) => {
    const { stopSSE } = get();
    stopSSE();
    const base = API_BASE || 'http://localhost:3001';
    const url = `${base}/v1/missions/${missionId}/stream?after_seq=${get().afterSeq}`;
    const es = new EventSource(url);

    es.onopen = () => {
      set({ isStreaming: true, error: null });
    };

    es.onmessage = (e) => {
      // heartbeat
    };

    es.addEventListener('snapshot', (e: any) => {
      try {
        const mission = JSON.parse(e.data);
        set({ activeMission: mission, events: [], afterSeq: 0 });
      } catch {}
    });

    es.addEventListener('error', (e: any) => {
      try {
        const ev = JSON.parse(e.data);
        set((state) => ({
          events: [...state.events, ev],
          afterSeq: ev.seq || state.afterSeq,
        }));
      } catch {}
    });

    // Handle all typed events dynamically
    es.onmessage = (e: any) => {
      try {
        const ev = JSON.parse(e.data);
        if (ev && ev.seq) {
          set((state) => ({
            events: [...state.events, ev],
            afterSeq: Math.max(state.afterSeq, ev.seq),
          }));
          // Re-fetch mission to get updated projection
          get().fetchMission(missionId);
        }
      } catch {}
    };

    set({ eventSource: es });
  },

  stopSSE: () => {
    const { eventSource } = get();
    if (eventSource) {
      eventSource.close();
      set({ eventSource: null, isStreaming: false });
    }
  },

  fetchAudit: async (missionId) => {
    try {
      const audit = await api(`/v1/missions/${missionId}/audit`);
      set({ audit });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  cancelMission: async (missionId) => {
    try {
      await api(`/v1/missions/${missionId}/cancel`, { method: 'POST' });
      await get().fetchMission(missionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  resumeMission: async (missionId) => {
    try {
      await api(`/v1/missions/${missionId}/resume`, { method: 'POST' });
      await get().fetchMission(missionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  approvePlan: async (missionId, approvalId, note) => {
    try {
      await api(`/v1/missions/${missionId}/approvals/${approvalId}`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved', note }),
      });
      await get().fetchMission(missionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  rejectPlan: async (missionId, approvalId, note) => {
    try {
      await api(`/v1/missions/${missionId}/approvals/${approvalId}`, {
        method: 'POST',
        body: JSON.stringify({ decision: 'rejected', note }),
      });
      await get().fetchMission(missionId);
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
