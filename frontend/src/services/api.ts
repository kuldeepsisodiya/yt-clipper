import { Highlight, Clip, StreamStatusResponse, AnalyticsData, AppSettings } from '../types';

const API_BASE = '/api';

export async function fetchStreamStatus(): Promise<StreamStatusResponse> {
  const res = await fetch(`${API_BASE}/stream/status`);
  if (!res.ok) throw new Error('Failed to fetch stream status');
  return res.json();
}

export async function startStream(youtubeUrl: string, simulate: boolean = false): Promise<any> {
  const res = await fetch(`${API_BASE}/stream/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ youtube_url: youtubeUrl, simulate }),
  });
  if (!res.ok) throw new Error('Failed to start stream');
  return res.json();
}

export async function stopStream(): Promise<any> {
  const res = await fetch(`${API_BASE}/stream/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop stream');
  return res.json();
}

export async function toggleSimulate(enable: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/stream/simulate?enable=${enable}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle simulation');
  return res.json();
}

export async function triggerTestHighlight(scenarioIndex?: number): Promise<any> {
  const url = scenarioIndex !== undefined
    ? `${API_BASE}/stream/trigger-highlight?scenario_index=${scenarioIndex}`
    : `${API_BASE}/stream/trigger-highlight`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger test highlight');
  return res.json();
}

export async function createManualMarker(category: string, notes?: string, duration: number = 30.0): Promise<any> {
  const res = await fetch(`${API_BASE}/highlights/manual-marker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, notes, duration_sec: duration }),
  });
  if (!res.ok) throw new Error('Failed to create manual marker');
  return res.json();
}

export async function fetchHighlights(category?: string, minScore?: number, reviewed?: boolean): Promise<Highlight[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (minScore !== undefined) params.append('min_score', minScore.toString());
  if (reviewed !== undefined) params.append('reviewed', reviewed.toString());

  const res = await fetch(`${API_BASE}/highlights?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch highlights');
  return res.json();
}

export async function fetchHighlight(id: string): Promise<Highlight> {
  const res = await fetch(`${API_BASE}/highlights/${id}`);
  if (!res.ok) throw new Error('Failed to fetch highlight');
  return res.json();
}

export async function toggleHighlightFavorite(id: string): Promise<{ is_favorite: boolean }> {
  const res = await fetch(`${API_BASE}/highlights/${id}/favorite`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle favorite');
  return res.json();
}

export async function updateHighlightStatus(id: string, status: string): Promise<any> {
  const res = await fetch(`${API_BASE}/highlights/${id}/status?status_val=${status}`, { method: 'PATCH' });
  if (!res.ok) throw new Error('Failed to update status');
  return res.json();
}

export async function deleteHighlight(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/highlights/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete highlight');
  return res.json();
}

export async function fetchClips(category?: string): Promise<Clip[]> {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  const res = await fetch(`${API_BASE}/clips?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch clips');
  return res.json();
}

export async function fetchClip(id: string): Promise<Clip> {
  const res = await fetch(`${API_BASE}/clips/${id}`);
  if (!res.ok) throw new Error('Failed to fetch clip');
  return res.json();
}

export async function editClip(clipId: string, options: any): Promise<any> {
  const res = await fetch(`${API_BASE}/clips/${clipId}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Failed to edit clip');
  return res.json();
}

export async function deleteClip(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/clips/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete clip');
  return res.json();
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchRecordings(): Promise<any> {
  const res = await fetch(`${API_BASE}/recordings`);
  if (!res.ok) throw new Error('Failed to fetch recordings');
  return res.json();
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(newSettings: AppSettings): Promise<any> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSettings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
