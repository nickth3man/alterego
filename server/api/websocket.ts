import { ServerWebSocket } from 'bun';
import type { GameState, WSMessage, StatChangePayload, CharacterStats } from '../core/types.js';
import { getGameState } from './routes.js';

type WS = ServerWebSocket<unknown>;

interface WSClientData {
  sessionId: string;
  subscribed: boolean;
}

const clients = new Map<WS, WSClientData>();

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createMessage<T>(type: string, payload: T): string {
  const msg: WSMessage<T> = {
    type: type as WSMessage['type'],
    payload,
    timestamp: Date.now(),
  };
  return JSON.stringify(msg);
}

function broadcast(message: string, excludeWs?: WS): void {
  for (const [ws, client] of clients) {
    if (excludeWs && ws === excludeWs) continue;
    if (!client.subscribed) continue;
    try {
      ws.send(message);
    } catch {
      clients.delete(ws);
    }
  }
}

function broadcastToAll(message: string): void {
  broadcast(message, undefined);
}

export function notifyStatChange(
  statName: string,
  oldValue: number,
  newValue: number,
  source: string
): void {
  const payload: StatChangePayload = {
    statName: statName as keyof CharacterStats,
    oldValue,
    newValue,
    delta: newValue - oldValue,
    source,
  };
  const msg = createMessage('stat-change', payload);
  broadcastToAll(msg);
}

export function notifyStageTransition(
  from: string,
  to: string,
  narrative: string
): void {
  const payload = { from, to, narrative };
  const msg = createMessage('stage-transition', payload);
  broadcastToAll(msg);
}

export function notifySaveComplete(saveId: string, timestamp: string): void {
  const payload = { saveId, timestamp };
  const msg = createMessage('save-complete', payload);
  broadcastToAll(msg);
}

export function notifyDeath(): void {
  const msg = createMessage('death', {});
  broadcastToAll(msg);
}

export function notifyEventUpdate(eventId: string): void {
  const payload = { eventId };
  const msg = createMessage('event-update', payload);
  broadcastToAll(msg);
}

export function createWebSocketHandler() {
  return {
    websocket: {
      open(ws: WS) {
        const sessionId = generateSessionId();
        clients.set(ws, {
          sessionId,
          subscribed: false,
        });

        const welcome = createMessage('welcome', {
          sessionId,
          message: 'Connected to Alter Ego game server',
        });
        ws.send(welcome);
      },

      message(ws: WS, data: string | Buffer<ArrayBuffer>) {
        const client = clients.get(ws);
        if (!client) return;

        let message: { type: string; payload?: unknown };
        try {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as unknown as ArrayBuffer);
          message = JSON.parse(text);
        } catch {
          ws.send(createMessage('error', { message: 'Invalid JSON' }));
          return;
        }

        const { type } = message;

        if (type === 'ping') {
          ws.send(createMessage('pong', { timestamp: Date.now() }));
          return;
        }

        if (type === 'subscribe') {
          client.subscribed = true;
          ws.send(createMessage('subscribed', { sessionId: client.sessionId }));
          return;
        }

        if (type === 'unsubscribe') {
          client.subscribed = false;
          ws.send(createMessage('unsubscribed', {}));
          return;
        }

        if (type === 'get-state') {
          const gameState = getGameState();
          if (gameState) {
            ws.send(createMessage('state', { gameState }));
          } else {
            ws.send(createMessage('error', { message: 'No active game' }));
          }
          return;
        }

        ws.send(createMessage('error', { message: `Unknown message type: ${type}` }));
      },

      close(ws: WS) {
        clients.delete(ws);
      },
    },
  };
}

export function getConnectedClientCount(): number {
  return clients.size;
}

export function getSubscribedClientCount(): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.subscribed) count++;
  }
  return count;
}