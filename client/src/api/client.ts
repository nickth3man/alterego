/**
 * API Client — Alter Ego Frontend
 *
 * REST + WebSocket communication layer for the Bun game server.
 * Vite proxies /api → localhost:3001 and /ws → ws://localhost:3001.
 */

import type {
  GameState,
  CharacterStats,
  NewGameRequest,
  NewGameResponse,
  ChooseRequest,
  ChooseResponse,
  StatsResponse,
  RelationshipsResponse,
  SaveFile,
  WSMessage,
} from '../../../server/core/types';

// ─── Base URL Configuration ────────────────────────────────────

const BASE_URL: string = import.meta.env.VITE_API_URL ?? '';

// ─── Generic Request Helper ────────────────────────────────────

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    const message = body.error ?? body.message ?? `Server error ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ─── REST Endpoints ────────────────────────────────────────────

export async function newGame(data: NewGameRequest): Promise<GameState> {
  const response = await apiRequest<NewGameResponse>('/api/game/new', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.gameState;
}

export async function getGameState(): Promise<GameState> {
  const response = await apiRequest<{ gameState: GameState }>('/api/game/state');
  return response.gameState;
}

export async function choose(
  eventId: string,
  moodId: string,
  choiceId: string,
): Promise<ChooseResponse> {
  const body: ChooseRequest = { eventId, moodId, choiceId };
  return apiRequest<ChooseResponse>('/api/game/choose', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getStats(): Promise<StatsResponse> {
  return apiRequest<StatsResponse>('/api/game/stats');
}

export async function getRelationships(): Promise<RelationshipsResponse> {
  return apiRequest<RelationshipsResponse>('/api/game/relationships');
}

export async function saveGame(saveName?: string): Promise<{ saveId: string; timestamp: string }> {
  return apiRequest<{ saveId: string; timestamp: string }>('/api/game/save', {
    method: 'POST',
    body: JSON.stringify({ saveName }),
  });
}

export async function loadGame(saveId: string): Promise<GameState> {
  const response = await apiRequest<{ gameState: GameState }>('/api/game/load', {
    method: 'POST',
    body: JSON.stringify({ saveId }),
  });
  return response.gameState;
}

export async function endGame(): Promise<{ summary: unknown }> {
  return apiRequest<{ summary: unknown }>('/api/game/end', {
    method: 'POST',
  });
}

export async function loadSaveList(): Promise<SaveFile[]> {
  return apiRequest<SaveFile[]>('/api/game/saves');
}

// ─── WebSocket Connection ──────────────────────────────────────

type WSMessageHandler = (msg: WSMessage) => void;

interface WSConnection {
  ws: WebSocket;
  close: () => void;
}

const WS_PING_INTERVAL_MS = 30_000;
const WS_RECONNECT_DELAY_MS = 3_000;

export function connectWS(onMessage: WSMessageHandler): WSConnection {
  const protocol = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = BASE_URL
    ? BASE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : `${globalThis.location?.host ?? 'localhost:3001'}`;
  const wsUrl = `${protocol}//${host}/ws`;

  let ws: WebSocket | undefined;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let intentionallyClosed = false;

  function startPing(): void {
    stopPing();
    pingTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, WS_PING_INTERVAL_MS);
  }

  function stopPing(): void {
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  function scheduleReconnect(): void {
    if (intentionallyClosed) return;
    if (reconnectTimer !== null) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, WS_RECONNECT_DELAY_MS);
  }

  function connect(): void {
    ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => {
      startPing();
      if (ws) ws.send(JSON.stringify({ type: 'subscribe' }));
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMessage;
        if (msg.type === 'pong') return;
        onMessage(msg);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.addEventListener('close', () => {
      stopPing();
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      stopPing();
      // WebSocket will also fire 'close' after 'error', which triggers reconnect
    });
  }

  function close(): void {
    intentionallyClosed = true;
    stopPing();
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
    }
  }

  connect();

  return { ws: ws!, close };
}
