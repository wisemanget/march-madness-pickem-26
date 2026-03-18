import Pusher from "pusher";
import { CHANNEL } from "./pusher-shared";

// Server-side Pusher instance (lazy singleton)
let serverPusher: Pusher | null = null;

function getServerPusher(): Pusher | null {
  if (serverPusher) return serverPusher;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster) {
    return null;
  }

  serverPusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return serverPusher;
}

export type PusherEventName =
  | "draft-updated"
  | "settings-updated"
  | "draft-reset";

export async function triggerDraftEvent(
  eventName: PusherEventName,
  data: unknown
): Promise<void> {
  const pusher = getServerPusher();
  if (!pusher) return; // graceful degradation
  try {
    await pusher.trigger(CHANNEL, eventName, data);
  } catch {
    // Pusher send failed — clients will pick up state via fallback poll
  }
}

export { CHANNEL };
