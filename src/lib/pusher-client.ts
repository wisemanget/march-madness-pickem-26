import PusherClient from "pusher-js";
import { CHANNEL } from "./pusher-shared";

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (pusherClient) return pusherClient;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  pusherClient = new PusherClient(key, { cluster });
  return pusherClient;
}

export function subscribeToDraft(
  onEvent: (eventName: string, data: unknown) => void
): (() => void) | null {
  const client = getPusherClient();
  if (!client) return null;

  const channel = client.subscribe(CHANNEL);
  const events = ["draft-updated", "settings-updated", "draft-reset"];

  events.forEach((evt) => {
    channel.bind(evt, (data: unknown) => onEvent(evt, data));
  });

  return () => {
    events.forEach((evt) => channel.unbind(evt));
    client.unsubscribe(CHANNEL);
  };
}

export { CHANNEL };
