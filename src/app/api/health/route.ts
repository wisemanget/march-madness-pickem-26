import { NextResponse } from "next/server";
import { isKVHealthy } from "@/lib/store";

export async function GET() {
  const health = isKVHealthy();
  const status = health.production && !health.configured ? "unhealthy" : "healthy";

  return NextResponse.json(
    {
      status,
      kv: health.configured ? "connected" : "file-fallback",
      production: health.production,
      pusher: !!(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY),
      timestamp: new Date().toISOString(),
    },
    { status: status === "healthy" ? 200 : 503 }
  );
}
