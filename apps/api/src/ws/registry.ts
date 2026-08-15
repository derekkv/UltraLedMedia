import type { WebSocket } from '@fastify/websocket';

/** Mensaje del protocolo WebSocket. */
export interface WsMessage {
  type: string;
  payload?: unknown;
}

/** Conexión registrada de un usuario autenticado. */
export interface WsClient {
  socket: WebSocket;
  userId: string;
  modules: Set<string>;
  roles: Set<string>;
  isAlive: boolean;
}

/**
 * Registro en memoria de conexiones WebSocket (instancia única).
 * Punto de extensión: para escalar horizontalmente, reemplazar la emisión
 * directa por Redis pub/sub y que cada instancia entregue a sus sockets locales.
 */
class ConnectionRegistry {
  private readonly clients = new Set<WsClient>();
  private readonly byUser = new Map<string, Set<WsClient>>();

  add(client: WsClient): void {
    this.clients.add(client);
    const set = this.byUser.get(client.userId) ?? new Set<WsClient>();
    set.add(client);
    this.byUser.set(client.userId, set);
  }

  remove(client: WsClient): void {
    this.clients.delete(client);
    const set = this.byUser.get(client.userId);
    if (set) {
      set.delete(client);
      if (set.size === 0) this.byUser.delete(client.userId);
    }
  }

  /** Todas las conexiones activas (para heartbeat). */
  list(): IterableIterator<WsClient> {
    return this.clients.values();
  }

  private send(client: WsClient, message: WsMessage): void {
    if (client.socket.readyState !== client.socket.OPEN) return;
    client.socket.send(JSON.stringify(message));
  }

  /** Envía un mensaje a todas las conexiones de un usuario. */
  sendToUser(userId: string, message: WsMessage): void {
    const set = this.byUser.get(userId);
    if (!set) return;
    for (const client of set) this.send(client, message);
  }

  /** Difunde a todos los usuarios conectados con permiso sobre un módulo. */
  broadcastToModule(module: string, message: WsMessage): void {
    for (const client of this.clients) {
      if (client.modules.has(module)) this.send(client, message);
    }
  }
}

export const registry = new ConnectionRegistry();
