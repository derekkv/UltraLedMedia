import type { FastifyPluginAsync } from 'fastify';
import { loadCurrentUser } from '../security/access';
import { registry, type WsClient } from './registry';

const HEARTBEAT_INTERVAL_MS = 30_000;
const WS_CLOSE_POLICY_VIOLATION = 1008;

/**
 * Gateway WebSocket. Autentica leyendo la sesión ya hidratada por
 * @fastify/session en el request del handshake (misma cookie httpOnly).
 * Si no hay sesión válida, cierra la conexión.
 */
export const wsGateway: FastifyPluginAsync = async (app) => {
  app.get('/ws', { websocket: true }, async (socket, request) => {
    const userId = request.session.userId;
    if (!userId) {
      socket.close(WS_CLOSE_POLICY_VIOLATION, 'No autenticado');
      return;
    }

    const user = await loadCurrentUser(userId);
    if (!user || !user.isActive) {
      socket.close(WS_CLOSE_POLICY_VIOLATION, 'Sesión inválida');
      return;
    }

    const client: WsClient = {
      socket,
      userId: user.id,
      modules: new Set(user.modules),
      roles: new Set(user.roles),
      isAlive: true,
    };
    registry.add(client);
    request.log.info({ userId: user.id }, 'WS conectado');
    socket.send(JSON.stringify({ type: 'connection.ready', payload: { userId: user.id } }));

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('message', (raw: Buffer) => {
      try {
        const message = JSON.parse(raw.toString()) as { type?: string };
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignorar mensajes malformados.
      }
    });

    socket.on('close', () => registry.remove(client));
    socket.on('error', () => registry.remove(client));
  });

  // Heartbeat: detecta y limpia conexiones muertas.
  const heartbeat = setInterval(() => {
    for (const client of registry.list()) {
      if (!client.isAlive) {
        client.socket.terminate();
        registry.remove(client);
        continue;
      }
      client.isAlive = false;
      try {
        client.socket.ping();
      } catch {
        registry.remove(client);
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
  });
};
