/**
 * Cliente WebSocket con reconexión y backoff.
 * La suscripción a eventos (notification.new, dashboard.update) e integración
 * con la caché de TanStack Query se cablea en la Fase 7.
 */
export interface WsMessage {
  type: string;
  payload?: unknown;
}

type Listener = (message: WsMessage) => void;

export class RealtimeClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectDelay = 1000;
  private readonly maxDelay = 15_000;
  private closedByUser = false;

  private url(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/api/v1/ws`;
  }

  connect(): void {
    this.closedByUser = false;
    const socket = new WebSocket(this.url());
    this.socket = socket;

    socket.addEventListener('open', () => {
      this.reconnectDelay = 1000;
    });

    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string) as WsMessage;
        for (const listener of this.listeners) listener(message);
      } catch {
        // Ignorar mensajes malformados.
      }
    });

    socket.addEventListener('close', () => {
      if (this.closedByUser) return;
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  disconnect(): void {
    this.closedByUser = true;
    this.socket?.close();
    this.socket = null;
  }
}

export const realtime = new RealtimeClient();
