import { connect, NatsConnection, StringCodec, Subscription } from 'nats';
import { EventSubject } from './types';

const sc = StringCodec();

const globalForNats = globalThis as unknown as { nats: NatsConnection | undefined };

let connection: NatsConnection | undefined;

export async function getNatsConnection(): Promise<NatsConnection> {
  if (globalForNats.nats) return globalForNats.nats;
  if (connection) return connection;

  const servers = process.env.NATS_URL || 'nats://localhost:4222';
  connection = await connect({ servers });

  if (process.env.NODE_ENV !== 'production') {
    globalForNats.nats = connection;
  }

  console.log('[NATS] Connected to', servers);
  return connection;
}

export async function publish<T>(subject: EventSubject, data: T): Promise<void> {
  try {
    const nc = await getNatsConnection();
    nc.publish(subject, sc.encode(JSON.stringify(data)));
  } catch (error) {
    console.error(`[NATS] Publish error on ${subject}:`, error);
  }
}

export async function subscribe<T>(
  subject: EventSubject,
  handler: (data: T) => void | Promise<void>
): Promise<Subscription> {
  const nc = await getNatsConnection();
  const sub = nc.subscribe(subject);

  (async () => {
    for await (const msg of sub) {
      try {
        const data = JSON.parse(sc.decode(msg.data)) as T;
        await handler(data);
      } catch (error) {
        console.error(`[NATS] Handler error on ${subject}:`, error);
      }
    }
  })();

  return sub;
}

export async function disconnectNats(): Promise<void> {
  if (connection) {
    await connection.drain();
    connection = undefined;
    globalForNats.nats = undefined;
    console.log('[NATS] Disconnected');
  }
}
