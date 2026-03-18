import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { triggerDraftEvent } from "@/lib/pusher";

export async function GET() {
  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
    await store.setDraftState(state);
  }
  // Backfill version for old states
  if (state.version === undefined) state.version = 0;
  // Migrate old "waiting" status to "drafting"
  if ((state.status as string) === "waiting") state.status = "drafting";
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "reset") {
    const state = getDefaultDraftState();
    await store.setDraftState(state);
    await triggerDraftEvent("draft-reset", state);
    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
